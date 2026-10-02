import type { Kinematics, Leg, Ownship, Sim, Target } from './types.ts';
import { MERGE_NM } from './constants.ts';
import { aspect, bearing, hdg3, rad, range, wrap360 } from './geometry.ts';
import { makeTarget } from './world.ts';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type Objective = 'LOCK' | 'ID_ALL' | 'ID_AND_LOCK';
export type Encounter = {
  objective: Objective;
  tasking: string;
  timeLimit: number;
  start: number;
  eventStart: number; // index into sim.events when the encounter began
  targetIds: string[];
};
export type Outcome = { status: 'running' } | { status: 'won'; score: number; text: string } | { status: 'lost'; text: string };

type Profile = {
  hostiles: number;
  friendlies: [number, number];
  range: [number, number];
  az: number;
  alt: [number, number] | null; // null = within ±5,000 ft of our altitude
  spread: number; // how far off "straight at us" the bandit's heading may be
  turns: boolean;
  beam: boolean;
  timeLimit: number;
};

/** Easy: one hot bandit near the nose at our altitude.
 *  Normal: a bandit and 1–2 friendlies, some turns.
 *  Hard: a bandit 2-ship that beams, plus friendlies, anywhere ±60°. */
export const PROFILES: Readonly<Record<Difficulty, Profile>> = {
  easy: { hostiles: 1, friendlies: [0, 0], range: [25, 40], az: 20, alt: null, spread: 5, turns: false, beam: false, timeLimit: 180 },
  normal: { hostiles: 1, friendlies: [1, 2], range: [30, 50], az: 40, alt: [10000, 35000], spread: 20, turns: true, beam: false, timeLimit: 240 },
  hard: { hostiles: 2, friendlies: [1, 2], range: [35, 55], az: 60, alt: [2000, 40000], spread: 30, turns: false, beam: true, timeLimit: 300 },
};

const HOSTILE_TYPES = [
  { type: 'MIG-29', rcs: 5 },
  { type: 'SU-27', rcs: 15 },
  { type: 'MIG-21', rcs: 3 },
];
const FRIENDLY_TYPES = [
  { type: 'F-16', rcs: 5 },
  { type: 'F/A-18', rcs: 5 },
  { type: 'F-15', rcs: 10 },
];

function between(rand: () => number, lo: number, hi: number) {
  return lo + rand() * (hi - lo);
}
function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)];
}

export const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** AWACS-style BRAA call from our position: bearing / range / altitude / aspect. */
export function braa(own: Ownship, t: Kinematics) {
  const a = aspect(own, t);
  const word = a < 30 ? 'HOT' : a < 70 ? 'FLANK' : a < 110 ? 'BEAM' : 'DRAG';
  return `BRAA ${hdg3(bearing(own, t))} / ${Math.round(range(own, t))} / ANGELS ${Math.round(t.alt / 1000)} / ${word}`;
}

export function generateEncounter(
  rand: () => number,
  difficulty: Difficulty,
  own: Ownship,
  n: number,
  now: number,
  eventStart: number,
): { encounter: Encounter; targets: Target[] } {
  const p = PROFILES[difficulty];
  const at = (brg: number, d: number) => ({ x: own.x + d * Math.sin(rad(brg)), y: own.y + d * Math.cos(rad(brg)) });
  const brg = wrap360(own.hdg + between(rand, -p.az, p.az));
  const lead = at(brg, between(rand, p.range[0], p.range[1]));
  const alt = p.alt ? between(rand, p.alt[0], p.alt[1]) : own.alt + between(rand, -5000, 5000);
  const hot = wrap360(brg + 180 + between(rand, -p.spread, p.spread));
  const spd = between(rand, 350, 500);
  const kind = pick(rand, HOSTILE_TYPES);
  const legs: Leg[] = p.beam
    ? [{ kind: 'straight', seconds: between(rand, 30, 60) }, { kind: 'beam', seconds: 40 }, { kind: 'turnTo', hdg: hot }]
    : p.turns
      ? [{ kind: 'straight', seconds: between(rand, 40, 80) }, { kind: 'turnTo', hdg: wrap360(hot + between(rand, -30, 30)) }]
      : [];
  const targets: Target[] = [];
  for (let i = 0; i < p.hostiles; i++) {
    // wingmen fly line abreast, 1.5 nm apart, flying the same legs
    targets.push(
      makeTarget({
        id: `e${n}-h${i + 1}`, type: kind.type, rcs: kind.rcs, side: 'hostile',
        x: lead.x + 1.5 * i * Math.cos(rad(hot)), y: lead.y - 1.5 * i * Math.sin(rad(hot)),
        alt, hdg: hot, spd, legs: [...legs],
      }),
    );
  }
  const friends = Math.round(between(rand, p.friendlies[0], p.friendlies[1]));
  for (let i = 0; i < friends; i++) {
    const f = pick(rand, FRIENDLY_TYPES);
    const pos = at(wrap360(own.hdg + between(rand, -p.az, p.az)), between(rand, p.range[0], p.range[1]));
    targets.push(
      makeTarget({
        id: `e${n}-f${i + 1}`, type: f.type, rcs: f.rcs, side: 'friendly', iffReplies: true, ...pos,
        alt: p.alt ? between(rand, p.alt[0], p.alt[1]) : alt, hdg: between(rand, 0, 360), spd: between(rand, 300, 450),
      }),
    );
  }
  const objective: Objective = difficulty === 'easy' ? 'LOCK' : difficulty === 'normal' && rand() < 0.5 ? 'ID_ALL' : 'ID_AND_LOCK';
  const order =
    objective === 'LOCK'
      ? 'Lock the bandit.'
      : objective === 'ID_ALL'
        ? `Identify all ${targets.length} contacts.`
        : `Identify all ${targets.length} contacts, then lock a hostile.`;
  return {
    targets,
    encounter: {
      objective,
      tasking: `${braa(own, targets[0])}. ${order}`,
      timeLimit: p.timeLimit,
      start: now,
      eventStart,
      targetIds: targets.map((t) => t.id),
    },
  };
}

/** Judge an encounter.
 *  Won when the objective holds.
 *  Lost when a hostile merges inside 5 nm first, or on timeout. */
export function evaluate(sim: Sim, enc: Encounter): Outcome {
  const mine = sim.targets.filter((t) => enc.targetIds.includes(t.id));
  const hostiles = mine.filter((t) => t.side === 'hostile');
  const friends = new Set(mine.filter((t) => t.side === 'friendly').map((t) => t.id));
  const elapsed = sim.t - enc.start;
  const idOk = mine.every((t) => t.ident === t.side);
  const sttId = sim.radar.mode === 'STT' ? sim.radar.stt?.targetId : undefined;
  const lockedHostile = hostiles.some((h) => h.id === sttId);
  const done = enc.objective === 'LOCK' ? lockedHostile : enc.objective === 'ID_ALL' ? idOk : idOk && lockedHostile;
  if (done) {
    const spikes = sim.events.slice(enc.eventStart).filter((e) => e.kind === 'lock' && friends.has(e.targetId)).length;
    const score = Math.max(0, Math.max(20, 100 - Math.floor(elapsed / 3)) - 50 * spikes);
    return { status: 'won', score, text: `Objective complete in ${fmtClock(elapsed)} · +${score} pts` };
  }
  if (hostiles.some((h) => range(sim.own, h) < MERGE_NM)) return { status: 'lost', text: `Merged: a bandit got inside 5 nm. ${lossHint(sim, enc, idOk)}` };
  if (elapsed > enc.timeLimit) return { status: 'lost', text: `Time’s up. ${lossHint(sim, enc, idOk)}` };
  return { status: 'running' };
}

/** What was still missing when an encounter was lost, as one line of coaching. */
// ponytail: judged from the picture at the moment of the loss, not its history; a bandit seen earlier and since faded reads as never found.
function lossHint(sim: Sim, enc: Encounter, idOk: boolean): string {
  if (enc.objective !== 'LOCK' && !idOk) return 'Not everyone was identified: put the cursor on each contact and press the castle switch (IFF).';
  const hostiles = new Set(enc.targetIds.filter((id) => sim.targets.find((t) => t.id === id)?.side === 'hostile'));
  const seen = [...sim.radar.bricks, ...sim.radar.tracks].some((c) => hostiles.has(c.targetId));
  if (!seen) return 'The bandit never showed on your scope: set the antenna elevation so its ANGELS sit inside the scan, and check the range scale.';
  return 'The bandit was on your scope but not locked: put the cursor on it and designate, or castle toward the radar.';
}
