import type { Sim } from './types.ts';
import { FIRST_ENCOUNTER_S, NEXT_ENCOUNTER_DELAY_S } from './constants.ts';
import { createSim } from './sim.ts';
import { setPower } from './radar.ts';
import { evaluate, fmtClock, generateEncounter, type Difficulty, type Encounter } from './encounters.ts';

export type FreePlay = {
  difficulty: Difficulty;
  enc: Encounter | null;
  count: number;
  score: number;
  last: string; // last debrief line
  nextAt: number; // sim time of the next tasking
};

export function createFreePlay(difficulty: Difficulty, seed: number) {
  const sim = createSim({ seed, own: { alt: 20000, hdg: 0, spd: 400 } });
  setPower(sim, 'OPR');
  const fp: FreePlay = { difficulty, enc: null, count: 0, score: 0, last: '', nextAt: FIRST_ENCOUNTER_S };
  return { sim, fp };
}

/** Wipe the radar picture between encounters: trackfiles, bricks, designations, any lock or ACM. */
function clearPicture(sim: Sim) {
  const r = sim.radar;
  r.mode = r.searchMode;
  r.acm = null;
  r.stt = null;
  r.tracks = [];
  r.bricks = [];
  r.looks = {};
  r.ls = null;
  r.dt2 = null;
}

/** One encounter at a time: spawn when due, judge while running, debrief and queue the next. Call after each sim step. */
export function stepFreePlay(sim: Sim, fp: FreePlay) {
  if (!fp.enc) {
    if (sim.t < fp.nextAt) return;
    fp.count += 1;
    const { encounter, targets } = generateEncounter(sim.rand, fp.difficulty, sim.own, fp.count, sim.t, sim.events.length);
    sim.targets = targets;
    fp.enc = encounter;
    sim.events.push({ kind: 'tasking', text: encounter.tasking });
    return;
  }
  const o = evaluate(sim, fp.enc);
  if (o.status === 'running') return;
  if (o.status === 'won') fp.score += o.score;
  fp.last = o.text;
  sim.events.push({ kind: 'debrief', text: o.text, won: o.status === 'won' });
  fp.enc = null;
  fp.nextAt = sim.t + NEXT_ENCOUNTER_DELAY_S;
  sim.targets = [];
  clearPicture(sim);
}

/** Status-line text: the tasking with time left, or the last debrief while waiting. */
export function freePlayStatus(sim: Sim, fp: FreePlay) {
  if (fp.enc) return `${fp.enc.tasking} · ${fmtClock(Math.max(0, fp.enc.timeLimit - (sim.t - fp.enc.start)))}`;
  if (fp.last) return `${fp.last} · next tasking in ${Math.max(0, Math.ceil(fp.nextAt - sim.t))} s`;
  return 'Stand by for tasking…';
}
