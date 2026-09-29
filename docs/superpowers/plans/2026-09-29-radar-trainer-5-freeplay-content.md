# Hornet Radar Trainer — Plan 5: Free Play, Reference Content and Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reach the spec's final state:
- random free-play encounters with AWACS taskings, objectives, timer and score (Easy / Normal / Hard);
- the full below-the-fold content: Start here, How the APG-73 works, Controls reference, Glossary, Sources & disclaimer;
- the remaining UI polish: TDC drag pad, bezel knobs, accessibility, and no drawing while off-screen;
- a final whole-site verification.

**Architecture:**
- `lib/sim/encounters.ts`: pure encounter generator (BRAA call, per-difficulty profiles, objectives) and judge.
- `lib/sim/freeplay.ts`: sequences encounters over a running sim.
- The Cockpit gains a third activity, `freeplay`, and shows the tasking, time left and score in its status line.
- Reference sections are static server components, except `StartHere`, which needs `localStorage` and the start bus.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, Tailwind v4, TypeScript, Node 25 `node --test` with native type stripping, npm.

**Spec:** `docs/superpowers/specs/2026-09-29-hornet-radar-trainer-design.md`: §1 (below the fold, look), §4 (free play, difficulty) and §7 (verification). **Research:** `docs/research/apg-73.md`: teaching notes (§9) and sources (§10).

**Sequence:** Plan 5 of 5. Requires Plan 4 (activities, lessons, `lib/bus.ts`, `lib/progress.ts`, `StartHere`).

## Global Constraints

**Stack**
- Next.js 16 App Router + TypeScript + Tailwind v4.
- No extra runtime dependencies: no state library, no test framework, no shadcn.
- Static export (`output: 'export'` in `next.config.ts`).
- Tests: `npm test` = `node --test "lib/**/*.test.ts"` (Node 25 strips types). No Vitest or Jest.

**Imports**
- Code under `lib/`:
  - relative imports include the `.ts` extension;
  - type-only imports use `import type`;
  - no `enum`, `namespace`, or constructor parameter properties.
- Components import from `@/lib/...` without the extension.

**Units and conventions**
- Units: nm, ft, kt, degrees, seconds.
- Axes: x = east, y = north. Heading 0 = north, clockwise. Azimuth right = positive.
- Pushbuttons (PB) are numbered clockwise from the bottom of the left column:
  - PB1–5: left column, bottom → top.
  - PB6–10: top row, left → right.
  - PB11–15: right column, top → bottom.
  - PB16–20: bottom row, right → left. PB18 = MENU.

**Look and copy**
- Monochrome green `#6dff8a` on `#030a05`, font B612 Mono.
- English only.
- Sim-agnostic copy: never mention DCS keybinds.
- All copy and drawings are original, with sources cited.
- Disclaimer: unofficial; public sources; simplified numbers; not affiliated with the US Navy, Boeing, RTX or Eagle Dynamics.

**Keys**

| Key | Action |
|---|---|
| `W A S D` | TDC |
| `Space` | Designate |
| `R` / `F` | Antenna elevation |
| `I J K L` | Castle fwd / left / aft / right |
| `O` | Castle press |
| `U` | Undesignate |
| Arrows | Fly: ←/→ turn, ↑ nose down, ↓ nose up |
| `+` / `-` | Speed |
| `P` | Pause |
| `M` | Map |

**Free play (spec §4)**
- **Encounters:** one at a time, each announced with an AWACS BRAA tasking.
- **Objectives:** `LOCK`, `ID_ALL`, `ID_AND_LOCK`.
- **Losing:** timeout (3–5 min), or a hostile inside 5 nm before the objective is done.
- **Score:** 100 − ⌊elapsed s ÷ 3⌋ (floor 20); spiking a friendly with STT costs 50.
- **Difficulty:**
  - Easy: 1 hostile, hot, co-altitude, within ±20°.
  - Normal: 1 hostile + 1–2 friendlies, 30–50 nm, ±40°, some turns.
  - Hard: a hostile 2-ship + friendlies, ±60°, altitudes 2–40k ft, beaming.
- **Instructor map:** off by default in free play.

**Commits:** commit after every task. End each message with the Co-Authored-By trailer from your own session's attribution reminder (the model that wrote the commit).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `lib/sim/types.ts` | modify | `tasking` and `debrief` events |
| `lib/sim/constants.ts` | modify | `MERGE_NM`, `FIRST_ENCOUNTER_S`, `NEXT_ENCOUNTER_DELAY_S` |
| `lib/sim/encounters.ts` | create | Difficulty profiles, BRAA, encounter generator, `evaluate`, `fmtClock` |
| `lib/sim/freeplay.ts` | create | `createFreePlay`, `stepFreePlay`, `freePlayStatus` |
| `lib/bus.ts` | modify | `StartRequest` gains `freeplay` |
| `components/cockpit/Cockpit.tsx` | modify (full) | `freeplay` activity; status, score and restart; welcome "skip" starts free play; no drawing off-screen |
| `components/sections/StartHere.tsx` | modify (full) | Free-play buttons |
| `components/sections/HowItWorks.tsx` | create | Explainers with two inline SVG diagrams |
| `components/sections/ControlsReference.tsx` | create | Pushbutton map per page, HOTAS and keyboard tables |
| `components/sections/Glossary.tsx` | create | Terms |
| `components/sections/About.tsx` | create | Sources, credits, disclaimer |
| `app/page.tsx` | modify (full) | Page composition |
| `components/cockpit/TdcPad.tsx` | create | TDC drag pad |
| `components/cockpit/ThrottleGrip.tsx` | modify (full) | Uses `TdcPad` |
| `components/cockpit/HoldButton.tsx` | modify (full) | `aria-pressed`, `data-hold`, contrast |
| `components/cockpit/RadarKnob.tsx` | modify (full) | `aria-pressed` buttons (was a half-built radio group) |
| `components/cockpit/Ddi.tsx` | modify (full) | Decorative BRT/CONT knobs; 24 px minimum pushbutton size |
| `components/cockpit/useKeyboard.ts` | modify | Space activates a focused ordinary button; Meta keyup releases everything |
| `README.md` | modify (full) | Final project README |
| Tests | create | `lib/sim/encounters.test.ts`, `lib/sim/freeplay.test.ts` |

---

### Task 1: Encounter generator and judge

**Files:**
- Create: `lib/sim/encounters.ts`
- Modify: `lib/sim/types.ts`, `lib/sim/constants.ts`
- Test: `lib/sim/encounters.test.ts`

**Interfaces:**
- Produces:
  - `type Difficulty = 'easy' | 'normal' | 'hard'`
  - `type Objective = 'LOCK' | 'ID_ALL' | 'ID_AND_LOCK'`
  - `type Encounter = { objective; tasking: string; timeLimit: number; start: number; eventStart: number; targetIds: string[] }`
  - `type Outcome = { status: 'running' } | { status: 'won'; score: number; text: string } | { status: 'lost'; text: string }`
  - `PROFILES`
  - `braa(own: Ownship, t: Kinematics): string`
  - `generateEncounter(rand: () => number, difficulty: Difficulty, own: Ownship, n: number, now: number, eventStart: number): { encounter: Encounter; targets: Target[] }`
  - `evaluate(sim: Sim, enc: Encounter): Outcome`
  - `fmtClock(seconds: number): string`
  - new `SimEvent` members: `{ kind: 'tasking'; text }` and `{ kind: 'debrief'; text; won: boolean }`

- [ ] **Step 1: Extend `lib/sim/types.ts`**

In `SimEvent`, add after the `acm` member:

```ts
  | { kind: 'tasking'; text: string }
  | { kind: 'debrief'; text: string; won: boolean }
```

- [ ] **Step 2: Append to `lib/sim/constants.ts`**

```ts
// Free play
export const MERGE_NM = 5; // a hostile inside this range before the objective is done loses the encounter
export const FIRST_ENCOUNTER_S = 3;
export const NEXT_ENCOUNTER_DELAY_S = 6;
```

- [ ] **Step 3: Write the failing test `lib/sim/encounters.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { braa, evaluate, generateEncounter, type Encounter, type Objective } from './encounters.ts';
import { createSim, mulberry32 } from './sim.ts';
import { makeTarget } from './world.ts';
import { breakLock, lock } from './radar.ts';
import { aspect, range, relAz } from './geometry.ts';

const own = { x: 0, y: 0, alt: 20000, hdg: 0, spd: 400 };
const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('BRAA call: bearing / range / angels / aspect word', () => {
  assert.equal(braa(own, { x: 0, y: 30, alt: 25000, hdg: 180, spd: 400 }), 'BRAA 360 / 30 / ANGELS 25 / HOT');
  assert.equal(braa(own, { x: 30, y: 0, alt: 10000, hdg: 90, spd: 400 }), 'BRAA 090 / 30 / ANGELS 10 / DRAG');
});

test('generation is deterministic for a seed', () => {
  assert.deepEqual(
    generateEncounter(mulberry32(1), 'hard', own, 1, 0, 0),
    generateEncounter(mulberry32(1), 'hard', own, 1, 0, 0),
  );
});

test('easy: one hot bandit near the nose at about our altitude, LOCK objective', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { targets, encounter } = generateEncounter(mulberry32(seed), 'easy', own, seed, 0, 0);
    assert.equal(targets.length, 1);
    const [t] = targets;
    assert.equal(t.side, 'hostile');
    assert.ok(Math.abs(relAz(own, t)) <= 20.001);
    assert.ok(range(own, t) >= 25 && range(own, t) <= 40);
    assert.ok(Math.abs(t.alt - own.alt) <= 5000.001);
    assert.ok(aspect(own, t) <= 5.001);
    assert.equal(encounter.objective, 'LOCK');
    assert.match(encounter.tasking, /^BRAA \d{3} \/ \d+ \/ ANGELS \d+ \/ HOT\. Lock the bandit\.$/);
  }
});

test('normal: one bandit plus 1–2 friendlies that answer IFF', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { targets, encounter } = generateEncounter(mulberry32(seed), 'normal', own, seed, 0, 0);
    const friends = targets.filter((t) => t.side === 'friendly');
    assert.equal(targets.filter((t) => t.side === 'hostile').length, 1);
    assert.ok(friends.length >= 1 && friends.length <= 2);
    assert.ok(friends.every((f) => f.iffReplies));
    assert.ok(['ID_ALL', 'ID_AND_LOCK'].includes(encounter.objective));
  }
});

test('hard: a 2-ship flying 1.5 nm abreast that will beam', () => {
  const { targets, encounter } = generateEncounter(mulberry32(7), 'hard', own, 1, 0, 0);
  const [a, b] = targets.filter((t) => t.side === 'hostile');
  near(range(a, b), 1.5);
  assert.equal(a.legs[1].kind, 'beam');
  assert.equal(encounter.objective, 'ID_AND_LOCK');
});

function scenario(objective: Objective) {
  const s = createSim({ own });
  const h = makeTarget({ id: 'h', x: 0, y: 20 });
  const f = makeTarget({ id: 'f', type: 'F-16', side: 'friendly', iffReplies: true, x: 5, y: 25, hdg: 90 });
  s.targets = [h, f];
  const enc: Encounter = { objective, tasking: '', timeLimit: 180, start: 0, eventStart: 0, targetIds: ['h', 'f'] };
  return { s, enc, h, f };
}

test('LOCK is won by locking the hostile; the score loses a point every 3 s', () => {
  const { s, enc } = scenario('LOCK');
  assert.equal(evaluate(s, enc).status, 'running');
  s.t = 30;
  lock(s, 'h');
  const o = evaluate(s, enc);
  assert.equal(o.status, 'won');
  assert.equal(o.status === 'won' ? o.score : -1, 90);
});

test('ID_ALL needs every contact correctly identified', () => {
  const { s, enc, h, f } = scenario('ID_ALL');
  h.ident = 'hostile';
  assert.equal(evaluate(s, enc).status, 'running');
  f.ident = 'friendly';
  assert.equal(evaluate(s, enc).status, 'won');
});

test('spiking a friendly with STT costs 50 points', () => {
  const { s, enc } = scenario('LOCK');
  lock(s, 'f');
  breakLock(s, 'rts');
  lock(s, 'h');
  const o = evaluate(s, enc);
  assert.equal(o.status === 'won' ? o.score : -1, 50);
});

test('lost on timeout, or when a bandit merges inside 5 nm', () => {
  const a = scenario('LOCK');
  a.s.t = 181;
  assert.deepEqual(evaluate(a.s, a.enc), { status: 'lost', text: "Time's up" });
  const b = scenario('LOCK');
  b.h.y = 4;
  assert.equal(evaluate(b.s, b.enc).status, 'lost');
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `node --test lib/sim/encounters.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `encounters.ts`.

- [ ] **Step 5: Write `lib/sim/encounters.ts`**

```ts
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
  if (hostiles.some((h) => range(sim.own, h) < MERGE_NM)) return { status: 'lost', text: 'Merged: a bandit got inside 5 nm' };
  if (elapsed > enc.timeLimit) return { status: 'lost', text: "Time's up" };
  return { status: 'running' };
}
```

- [ ] **Step 6: Run the tests and type-check**

Run: `npm test`
Expected: PASS for all suites.

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add lib/sim/types.ts lib/sim/constants.ts lib/sim/encounters.ts lib/sim/encounters.test.ts
git commit -m "feat(sim): random encounters with BRAA taskings, objectives and scoring" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 2: Free-play controller

**Files:**
- Create: `lib/sim/freeplay.ts`
- Test: `lib/sim/freeplay.test.ts`

**Interfaces:**
- Consumes (Task 1): `evaluate`, `generateEncounter`, `fmtClock`, `Difficulty`, `Encounter`.
- Produces:
  - `type FreePlay = { difficulty: Difficulty; enc: Encounter | null; count: number; score: number; last: string; nextAt: number }`
  - `createFreePlay(difficulty: Difficulty, seed: number): { sim: Sim; fp: FreePlay }`: radar in OPR, no targets.
  - `stepFreePlay(sim: Sim, fp: FreePlay): void`: call after each sim step.
  - `freePlayStatus(sim: Sim, fp: FreePlay): string`

- [ ] **Step 1: Write the failing test `lib/sim/freeplay.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFreePlay, freePlayStatus, stepFreePlay, type FreePlay } from './freeplay.ts';
import { step } from './sim.ts';
import { lock } from './radar.ts';
import { FIRST_ENCOUNTER_S, NEXT_ENCOUNTER_DELAY_S } from './constants.ts';
import type { Sim } from './types.ts';

function tick(s: Sim, fp: FreePlay, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    step(s);
    stepFreePlay(s, fp);
  }
}

test('free play starts with the radar on and spawns the first tasking after a few seconds', () => {
  const { sim, fp } = createFreePlay('easy', 1);
  assert.equal(sim.radar.power, 'OPR');
  assert.equal(sim.targets.length, 0);
  assert.equal(freePlayStatus(sim, fp), 'Stand by for tasking…');
  tick(sim, fp, FIRST_ENCOUNTER_S + 0.1);
  assert.ok(fp.enc);
  assert.equal(sim.targets.length, 1);
  assert.equal(sim.events.at(-1)?.kind, 'tasking');
  assert.match(freePlayStatus(sim, fp), /Lock the bandit\. · \d:\d\d$/);
});

test('winning scores, clears the picture and queues the next encounter', () => {
  const { sim, fp } = createFreePlay('easy', 2);
  tick(sim, fp, FIRST_ENCOUNTER_S + 0.1);
  lock(sim, sim.targets[0].id);
  tick(sim, fp, 0.1);
  assert.equal(fp.enc, null);
  assert.ok(fp.score > 0);
  assert.equal(sim.targets.length, 0);
  assert.equal(sim.radar.mode, 'RWS');
  assert.equal(sim.events.at(-1)?.kind, 'debrief');
  assert.match(freePlayStatus(sim, fp), /^Objective complete .* next tasking in \d+ s$/);
  tick(sim, fp, NEXT_ENCOUNTER_DELAY_S + 0.1);
  assert.ok(fp.enc);
  assert.equal(fp.count, 2);
});

test('running out of time is reported and free play moves on', () => {
  const { sim, fp } = createFreePlay('easy', 3);
  tick(sim, fp, FIRST_ENCOUNTER_S + 0.1);
  sim.t = fp.enc!.start + fp.enc!.timeLimit + 1;
  tick(sim, fp, 0.05);
  assert.equal(fp.enc, null);
  assert.match(fp.last, /Time's up/);
  assert.equal(fp.score, 0);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test lib/sim/freeplay.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `freeplay.ts`.

- [ ] **Step 3: Write `lib/sim/freeplay.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS for all suites.

- [ ] **Step 5: Commit**

```bash
git add lib/sim/freeplay.ts lib/sim/freeplay.test.ts
git commit -m "feat(sim): free-play controller chaining encounters with debriefs" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 3: Free play in the Cockpit

**Files:**
- Modify:
  - `lib/bus.ts`
  - `components/cockpit/Cockpit.tsx` (full replacement)
  - `components/sections/StartHere.tsx` (full replacement)

**Interfaces:**
- Consumes (Tasks 1–2): `createFreePlay`, `stepFreePlay`, `freePlayStatus`, `FreePlay`, `Difficulty`.
- Produces:
  - `StartRequest` gains `{ kind: 'freeplay'; difficulty: Difficulty }`.
  - Status line: activity label, tasking and time left, score chip, RESTART.
  - The welcome dialog's "Skip" starts free play on Easy.
  - Canvases are not redrawn while the cockpit is off-screen.

- [ ] **Step 1: Extend `lib/bus.ts`**

Replace the first line (`export type StartRequest = ...`) with:

```ts
import type { Difficulty } from './sim/encounters.ts';

export type StartRequest = { kind: 'sandbox' } | { kind: 'lesson'; id: string } | { kind: 'freeplay'; difficulty: Difficulty };
```

- [ ] **Step 2: Replace `components/cockpit/Cockpit.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Mode, Power, Sim } from '@/lib/sim/types';
import { SIM_DT } from '@/lib/sim/constants';
import { createSim, step } from '@/lib/sim/sim';
import { makeTarget } from '@/lib/sim/world';
import { castle, castlePress, setPower, tdcDepress, undesignate } from '@/lib/sim/radar';
import { pushbuttons, type Pushbutton } from '@/lib/sim/pushbuttons';
import type { Difficulty } from '@/lib/sim/encounters';
import { createFreePlay, freePlayStatus, stepFreePlay, type FreePlay } from '@/lib/sim/freeplay';
import { drawDdi } from '@/lib/ddi/draw';
import { drawHud } from '@/lib/ddi/hud';
import { drawInstructor } from '@/lib/ddi/instructor';
import { KEYS } from '@/lib/keys';
import { LESSONS } from '@/lib/lessons/lessons';
import { advance, isComplete, type Lesson } from '@/lib/lessons/lesson';
import { markLessonDone, markTutorialSeen, tutorialSeen } from '@/lib/progress';
import { START_EVENT, type StartRequest } from '@/lib/bus';
import { fitCanvas } from './canvas';
import { useKeyboard } from './useKeyboard';
import { Ddi } from './Ddi';
import { ThrottleGrip } from './ThrottleGrip';
import { StickGrip } from './StickGrip';
import { RadarKnob } from './RadarKnob';
import { FlightStrip } from './FlightStrip';
import { HudWindow } from './HudWindow';
import { InstructorMap } from './InstructorMap';
import { LessonStrip } from './LessonStrip';
import { WelcomeDialog } from './WelcomeDialog';

/** A fixed practice scenario: two bandits and a friendly, no objectives. */
function sandbox(): Sim {
  return createSim({
    seed: 1,
    targets: [
      makeTarget({ id: 'T1', x: -8, y: 34, alt: 25000, hdg: 170, spd: 450 }),
      makeTarget({
        id: 'T2', type: 'F-16', side: 'friendly', iffReplies: true, x: 20, y: 40, alt: 15000, hdg: 250, spd: 420,
        legs: [{ kind: 'straight', seconds: 60 }, { kind: 'turnTo', hdg: 160 }],
      }),
      makeTarget({ id: 'T3', type: 'SU-27', rcs: 15, x: 3, y: 28, alt: 38000, hdg: 200, spd: 500 }),
    ],
  });
}

type Activity =
  | { kind: 'sandbox' }
  | { kind: 'lesson'; lesson: Lesson; index: number }
  | { kind: 'freeplay'; difficulty: Difficulty };

type View = {
  pbs: Record<number, Pushbutton>;
  hdg: number;
  alt: number;
  spd: number;
  power: Power;
  mode: Mode;
  mark: { u: number; v: number } | null;
  status: string;
  score: number | null;
};

const viewOf = (sim: Sim, act: Activity, fp: FreePlay | null): View => ({
  pbs: pushbuttons(sim),
  hdg: sim.own.hdg,
  alt: sim.own.alt,
  spd: sim.own.spd,
  power: sim.radar.power,
  mode: sim.radar.mode,
  mark: act.kind === 'lesson' ? (act.lesson.steps[act.index]?.mark?.(sim) ?? null) : null,
  status: fp ? freePlayStatus(sim, fp) : '',
  score: fp ? fp.score : null,
});

/** Edge-triggered HOTAS actions; continuous controls go through applyHeld. */
const ACTIONS: Record<string, (sim: Sim) => void> = {
  [KEYS.designate]: tdcDepress,
  [KEYS.undesignate]: undesignate,
  [KEYS.castlePress]: castlePress,
  [KEYS.castleFwd]: (s) => castle(s, 'fwd'),
  [KEYS.castleAft]: (s) => castle(s, 'aft'),
  [KEYS.castleLeft]: (s) => castle(s, 'left'),
  [KEYS.castleRight]: (s) => castle(s, 'right'),
};

function applyHeld(sim: Sim, pressed: ReadonlySet<string>) {
  const k = (code: string) => (pressed.has(code) ? 1 : 0);
  sim.held.tdcX = k(KEYS.tdcRight) - k(KEYS.tdcLeft);
  sim.held.tdcY = k(KEYS.tdcUp) - k(KEYS.tdcDown);
  sim.held.elev = k(KEYS.elevUp) - k(KEYS.elevDown);
  sim.held.turn = k(KEYS.turnRight) - k(KEYS.turnLeft);
  sim.held.fine = pressed.has('ShiftLeft') || pressed.has('ShiftRight');
  sim.held.climb = k(KEYS.noseUp) - k(KEYS.noseDown);
  sim.held.accel = k(KEYS.faster) - k(KEYS.slower);
}

const noSubscribe = () => () => {};

export function Cockpit() {
  const [initial] = useState(() => {
    const sim = sandbox();
    const act: Activity = { kind: 'sandbox' };
    return { sim, act, view: viewOf(sim, act, null) };
  });
  const simRef = useRef(initial.sim);
  const fpRef = useRef<FreePlay | null>(null);
  const activityRef = useRef<Activity>(initial.act);
  const lastRequestRef = useRef<StartRequest>({ kind: 'sandbox' });
  const [activity, setActivity] = useState<Activity>(initial.act);
  const [view, setView] = useState(initial.view);
  const [lit, setLit] = useState<ReadonlySet<string>>(() => new Set());
  const [paused, setPaused] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [announcement, setAnnouncement] = useState({ text: '', n: 0 });
  const [welcomeClosed, setWelcomeClosed] = useState(false);
  // server snapshot: false (no dialog in the static HTML); client: open on a first visit
  const firstVisit = useSyncExternalStore(noSubscribe, () => !tutorialSeen(), () => false);
  const seenRef = useRef(0); // how far into sim.events the announcer has read
  const pressedRef = useRef(new Set<string>());
  const pausedRef = useRef(false);
  const activeRef = useRef(true);
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);

  const refresh = useCallback(() => setView(viewOf(simRef.current, activityRef.current, fpRef.current)), []);
  const goTo = useCallback((next: Activity) => {
    activityRef.current = next;
    setActivity(next);
    if (next.kind === 'lesson' && isComplete(next.lesson, next.index)) markLessonDone(next.lesson.id);
  }, []);
  const releaseAll = useCallback(() => {
    pressedRef.current.clear();
    setLit(new Set());
  }, []);
  const start = useCallback(
    (req: StartRequest) => {
      lastRequestRef.current = req;
      const lesson = req.kind === 'lesson' ? LESSONS.find((l) => l.id === req.id) : undefined;
      const free = req.kind === 'freeplay' ? createFreePlay(req.difficulty, Math.floor(Math.random() * 2 ** 31)) : null;
      const sim = free ? free.sim : lesson ? lesson.setup() : sandbox();
      simRef.current = sim;
      fpRef.current = free ? free.fp : null;
      seenRef.current = 0;
      releaseAll();
      pausedRef.current = false;
      setPaused(false);
      setShowMap(req.kind !== 'freeplay'); // the truth map stays off in free play
      if (lesson?.id === 'tutorial') markTutorialSeen();
      goTo(
        req.kind === 'freeplay'
          ? { kind: 'freeplay', difficulty: req.difficulty }
          : lesson
            ? { kind: 'lesson', lesson, index: 0 }
            : { kind: 'sandbox' },
      );
      setView(viewOf(sim, activityRef.current, fpRef.current));
      const text = req.kind === 'freeplay' ? `Free play: ${req.difficulty}` : lesson ? `Lesson: ${lesson.title}` : 'Sandbox';
      setAnnouncement((a) => ({ text, n: a.n + 1 }));
    },
    [goTo, releaseAll],
  );
  const nextStep = useCallback(() => {
    const act = activityRef.current;
    if (act.kind === 'lesson') goTo({ ...act, index: act.index + 1 });
    refresh();
  }, [goTo, refresh]);
  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);
  const toggleMap = useCallback(() => setShowMap((m) => !m), []);
  const press = useCallback(
    (code: string) => {
      const pressed = pressedRef.current;
      if (!code || pressed.has(code)) return;
      pressed.add(code);
      if (code === KEYS.pause) togglePause();
      else if (code === KEYS.map) toggleMap();
      else if (!pausedRef.current) ACTIONS[code]?.(simRef.current);
      setLit(new Set(pressed));
    },
    [togglePause, toggleMap],
  );
  const release = useCallback((code: string) => {
    if (pressedRef.current.delete(code)) setLit(new Set(pressedRef.current));
  }, []);
  const pressPb = useCallback(
    (n: number) => {
      if (pausedRef.current) return;
      pushbuttons(simRef.current)[n]?.press?.();
      refresh();
    },
    [refresh],
  );
  const changePower = useCallback(
    (p: Power) => {
      if (pausedRef.current) return;
      setPower(simRef.current, p);
      refresh();
    },
    [refresh],
  );

  // Page sections (lesson cards, free-play buttons) ask the cockpit to start things
  useEffect(() => {
    const onStart = (e: Event) => {
      start((e as CustomEvent<StartRequest>).detail);
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, [start]);

  // Keys, the sim and drawing run only while at least half of the cockpit (or half the viewport) is on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const io = new IntersectionObserver(
      ([e]) => {
        const need = 0.5 * Math.min(e.boundingClientRect.height, window.innerHeight);
        activeRef.current = e.intersectionRect.height >= need;
        if (!activeRef.current) releaseAll();
      },
      { threshold: Array.from({ length: 11 }, (_, i) => i / 10) },
    );
    io.observe(section);
    return () => io.disconnect();
  }, [releaseAll]);

  useKeyboard(activeRef, press, release, releaseAll);

  // Fixed-step simulation + drawing; React chrome, lesson checks and free-play status run at 10 Hz.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const font = getComputedStyle(canvas).fontFamily;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastUi = 0;
    const frame = (now: number) => {
      const sim = simRef.current;
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (activeRef.current) {
        if (!pausedRef.current) {
          applyHeld(sim, pressedRef.current);
          acc += dt;
          while (acc >= SIM_DT) {
            step(sim);
            if (fpRef.current) stepFreePlay(sim, fpRef.current);
            acc -= SIM_DT;
          }
        }
        drawDdi(ctx, sim, fitCanvas(canvas), font);
        const hud = hudRef.current;
        const hudCtx = hud?.getContext('2d');
        if (hud && hudCtx) drawHud(hudCtx, sim, fitCanvas(hud), font);
        const map = mapRef.current;
        const mapCtx = map?.getContext('2d');
        if (map && mapCtx) drawInstructor(mapCtx, sim, fitCanvas(map, 1.5), font);
      }
      if (now - lastUi > 100) {
        lastUi = now;
        const act = activityRef.current;
        if (act.kind === 'lesson') {
          const i = advance(act.lesson, act.index, sim);
          if (i !== act.index) goTo({ ...act, index: i });
        }
        setView(viewOf(sim, activityRef.current, fpRef.current));
        const fresh = sim.events.slice(seenRef.current);
        seenRef.current = sim.events.length;
        if (fresh.length) setAnnouncement((a) => ({ text: fresh.map((e) => e.text).join('. '), n: a.n + 1 }));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [goTo]);

  const showHud = view.mode === 'ACM' || view.mode === 'STT';

  // Spotlight the elements the current lesson step talks about
  const spotKey = activity.kind === 'lesson' ? (activity.lesson.steps[activity.index]?.highlight ?? []).join(' ') : '';
  useEffect(() => {
    if (!spotKey) return;
    const els = spotKey.split(' ').flatMap((id) => [...document.querySelectorAll<HTMLElement>(`[data-tut="${id}"]`)]);
    els.forEach((el) => el.setAttribute('data-spot', ''));
    return () => els.forEach((el) => el.removeAttribute('data-spot'));
  }, [spotKey, showMap, showHud]);

  const chip = 'rounded border border-white/10 px-2 py-1 text-ink/80 hover:text-phosphor aria-pressed:text-phosphor';
  const label =
    activity.kind === 'lesson'
      ? `LESSON · ${activity.lesson.title.toUpperCase()}`
      : activity.kind === 'freeplay'
        ? `FREE PLAY · ${activity.difficulty.toUpperCase()}`
        : 'SANDBOX';

  return (
    <section ref={sectionRef} aria-label="Cockpit" className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-white/5 px-4 py-2 text-xs tracking-widest">
        <span className="truncate text-phosphor">APG-73 TRAINER · {label}</span>
        <span className="min-w-0 flex-1 truncate text-center text-ink/85">{view.status || announcement.text}</span>
        <span className="sr-only" aria-live="polite">
          {announcement.text}
          {announcement.n % 2 ? '\u200b' : ''}
        </span>
        <div className="flex shrink-0 gap-2">
          {view.score !== null && <span className="rounded border border-phosphor/30 px-2 py-1 text-phosphor">SCORE {view.score}</span>}
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => start(lastRequestRef.current)} className={chip}>
            RESTART
          </button>
          <button type="button" aria-pressed={showMap} onMouseDown={(e) => e.preventDefault()} onClick={toggleMap} className={chip}>
            MAP · M
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={togglePause} className={chip}>
            {paused ? 'PAUSED · P' : 'PAUSE · P'}
          </button>
        </div>
      </header>
      {activity.kind === 'lesson' && (
        <LessonStrip
          lesson={activity.lesson}
          index={activity.index}
          onNext={nextStep}
          onExit={() => start({ kind: 'sandbox' })}
          onStartLesson={(id) => start({ kind: 'lesson', id })}
        />
      )}
      <div className="grid flex-1 items-center gap-6 p-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="order-2 flex flex-col items-center gap-4 lg:order-1 lg:items-end">
          <ThrottleGrip lit={lit} press={press} release={release} />
          <RadarKnob power={view.power} onChange={changePower} />
        </div>
        <div className="order-1 flex flex-col items-center gap-3 lg:order-2">
          <div className="w-[min(92vw,calc(100dvh-12rem))] lg:w-[min(52vw,calc(100dvh-12rem))]">
            <Ddi pbs={view.pbs} canvasRef={canvasRef} onPress={pressPb} mark={view.mark} />
          </div>
          <FlightStrip hdg={view.hdg} alt={view.alt} spd={view.spd} lit={lit} press={press} release={release} />
        </div>
        <div className="order-3 flex flex-col items-center gap-4 lg:items-start">
          <StickGrip lit={lit} press={press} release={release} />
          {showHud && <HudWindow canvasRef={hudRef} />}
          {showMap && <InstructorMap canvasRef={mapRef} />}
        </div>
      </div>
      <WelcomeDialog
        open={firstVisit && !welcomeClosed}
        onTutorial={() => {
          setWelcomeClosed(true);
          start({ kind: 'lesson', id: 'tutorial' });
        }}
        onSkip={() => {
          setWelcomeClosed(true);
          markTutorialSeen();
          start({ kind: 'freeplay', difficulty: 'easy' });
        }}
      />
    </section>
  );
}
```

- [ ] **Step 3: Replace `components/sections/StartHere.tsx`**

```tsx
'use client';

import { useSyncExternalStore } from 'react';
import { LESSONS } from '@/lib/lessons/lessons';
import { requestStart } from '@/lib/bus';
import { lessonsDone, subscribeProgress } from '@/lib/progress';
import type { Difficulty } from '@/lib/sim/encounters';

const btn = 'rounded-md border border-phosphor/40 px-4 py-2 text-sm text-phosphor hover:bg-phosphor/10';

const LEVELS: { difficulty: Difficulty; blurb: string }[] = [
  { difficulty: 'easy', blurb: 'One bandit, nose-on, at your altitude. Lock it.' },
  { difficulty: 'normal', blurb: 'A bandit among friendlies. Identify everyone, then lock the hostile.' },
  { difficulty: 'hard', blurb: 'A 2-ship that beams, friendlies in the mix, anywhere ±60° and any altitude.' },
];

export function StartHere() {
  const done = useSyncExternalStore(subscribeProgress, () => lessonsDone().join(','), () => '');
  const doneSet = new Set(done ? done.split(',') : []);
  return (
    <section id="start" aria-labelledby="start-h" className="mx-auto max-w-5xl px-4 py-16">
      <h2 id="start-h" className="text-xs tracking-[0.35em] text-phosphor">
        START HERE
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/80">
        New to the Hornet&apos;s radar? Take the tutorial first; each lesson then drills one skill in its own short
        scenario. When you&apos;re ready, free play sends you random encounters with an AWACS tasking, a clock and a score.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => requestStart({ kind: 'lesson', id: 'tutorial' })} className={btn}>
          {doneSet.has('tutorial') ? 'Replay the tutorial ✓' : 'Start the tutorial'}
        </button>
        <button type="button" onClick={() => requestStart({ kind: 'sandbox' })} className={btn}>
          Open the sandbox
        </button>
      </div>

      <h3 className="mt-10 text-[11px] tracking-[0.3em] text-ink/75">LESSONS</h3>
      <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.filter((l) => l.id !== 'tutorial').map((l, i) => (
          <li key={l.id}>
            <button
              type="button"
              onClick={() => requestStart({ kind: 'lesson', id: l.id })}
              className="h-full w-full rounded-xl border border-white/10 bg-panel-2 p-4 text-left hover:border-phosphor/50"
            >
              <span className="text-[11px] tracking-[0.25em] text-phosphor">
                LESSON {i + 1}
                {doneSet.has(l.id) ? ' · ✓ DONE' : ''}
              </span>
              <span className="mt-1 block font-bold">{l.title}</span>
              <span className="mt-2 block text-sm leading-relaxed text-ink/75">{l.summary}</span>
            </button>
          </li>
        ))}
      </ol>

      <h3 className="mt-10 text-[11px] tracking-[0.3em] text-ink/75">FREE PLAY</h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {LEVELS.map(({ difficulty, blurb }) => (
          <li key={difficulty}>
            <button
              type="button"
              onClick={() => requestStart({ kind: 'freeplay', difficulty })}
              className="h-full w-full rounded-xl border border-white/10 bg-panel-2 p-4 text-left hover:border-phosphor/50"
            >
              <span className="text-[11px] tracking-[0.25em] text-phosphor">{difficulty.toUpperCase()}</span>
              <span className="mt-2 block text-sm leading-relaxed text-ink/75">{blurb}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Build, lint, test**

Run: `npm test`
Expected: all PASS.

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: `/` static.

- [ ] **Step 5: Browser check**

Run `npm run dev` and take a screenshot for each:

1. **Easy start.** "Free play → Easy" scrolls to the cockpit. Header reads `FREE PLAY · EASY` and `SCORE 0`, the map is hidden, and the radar is already in OPR.
2. **Tasking.** About 3 s in, the status line shows `BRAA 0xx / nn / ANGELS nn / HOT. Lock the bandit. · 2:59`, counting down.
3. **Winning an encounter.** Find the bandit and lock it (`Space` on its brick):
   - the status line shows `Objective complete in m:ss · +nn pts · next tasking in n s`;
   - the score increases;
   - the scope clears;
   - a new tasking arrives about 6 s later.
4. **Normal.** 2–3 contacts. The objective asks you to identify everyone, which needs `O` on each trackfile, and to lock the hostile for NCTR.
5. **Hard.** A 2-ship that turns to beam after 30–60 s.
6. **RESTART.** It restarts the current activity. In a lesson it restarts the lesson; in the sandbox, the sandbox.
7. **Welcome dialog.** With a cleared `localStorage`, the welcome dialog's `Skip for now` starts free play on Easy.
8. **Drawing pauses off-screen.** Scroll down to the reference content: the DDI stops redrawing (no CPU burn). Scroll back and it resumes.
9. **Console.** No errors.

- [ ] **Step 6: Commit**

```bash
git add lib/bus.ts components/cockpit/Cockpit.tsx components/sections/StartHere.tsx
git commit -m "feat(freeplay): random encounters in the cockpit with tasking, timer, score and restart" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 4: Reference content below the fold

**Files:**
- Create:
  - `components/sections/HowItWorks.tsx`
  - `components/sections/ControlsReference.tsx`
  - `components/sections/Glossary.tsx`
  - `components/sections/About.tsx`
- Modify: `app/page.tsx` (full replacement)

**Interfaces:**
- Consumes: `frameTime` (`lib/sim/antenna.ts`) for the frame-time table. The value is computed, not hard-coded, so the table always matches the sim.
- Produces: static, server-rendered sections, each with a unique heading id.

No unit test in this task: it is static content. Verify with build, lint, a browser check and an HTML heading audit.

- [ ] **Step 1: Write `components/sections/HowItWorks.tsx`**

```tsx
import type { ReactNode } from 'react';
import { frameTime } from '@/lib/sim/antenna';
import { SCAN_RATE_DPS } from '@/lib/sim/constants';

const h3 = 'mt-10 text-sm font-bold tracking-wide text-phosphor';
const p = 'mt-3 text-sm leading-relaxed text-ink/85';
const SCANS: [number, number][] = [[140, 4], [140, 6], [80, 2], [60, 4], [20, 2]];

/** The same three aircraft drawn as a real top-down picture and as a B-scope. */
function BscopeDiagram() {
  const wedge = 'M150 190 L40 60 A150 150 0 0 1 260 60 Z';
  return (
    <svg viewBox="0 0 520 210" role="img" aria-labelledby="bscope-title" className="mt-4 w-full max-w-xl">
      <title id="bscope-title">
        The same three aircraft in a top-down view (left) and on the B-scope (right): the close ones spread out along the bottom edge.
      </title>
      <path d={wedge} fill="rgba(109,255,138,0.08)" stroke="#2f7a42" />
      <polygon points="150,182 144,196 156,196" fill="#c7cfc8" />
      <circle cx="120" cy="70" r="5" fill="#ff7a6b" />
      <circle cx="200" cy="95" r="5" fill="#ff7a6b" />
      <circle cx="170" cy="160" r="5" fill="#ff7a6b" />
      <text x="150" y="207" fill="#c7cfc8" fontSize="11" textAnchor="middle">
        top-down (real)
      </text>
      <rect x="320" y="20" width="180" height="170" fill="#030a05" stroke="#6dff8a" />
      <rect x="378" y="44" width="12" height="5" fill="#6dff8a" />
      <rect x="447" y="80" width="12" height="5" fill="#6dff8a" />
      <rect x="478" y="163" width="12" height="5" fill="#6dff8a" />
      <text x="410" y="207" fill="#c7cfc8" fontSize="11" textAnchor="middle">
        B-scope (azimuth →, range ↑)
      </text>
    </svg>
  );
}

/** The four HAFU identity shapes (top half of the symbol). */
function HafuDiagram() {
  const items: [string, ReactNode][] = [
    ['Unknown', <path key="u" d="M10 30 V14 H40 V30" fill="none" stroke="#6dff8a" strokeWidth="2" />],
    ['Ambiguous', <g key="a"><path d="M10 30 V14 H40 V30" fill="none" stroke="#6dff8a" strokeWidth="2" /><rect x="10" y="11" width="30" height="5" fill="#6dff8a" /></g>],
    ['Friendly', <path key="f" d="M10 30 A15 15 0 0 1 40 30" fill="none" stroke="#6dff8a" strokeWidth="2" />],
    ['Hostile', <path key="h" d="M10 30 L25 10 L40 30" fill="none" stroke="#6dff8a" strokeWidth="2" />],
  ];
  return (
    <ul className="mt-4 flex flex-wrap gap-6">
      {items.map(([name, shape]) => (
        <li key={name} className="flex flex-col items-center gap-1 text-xs text-ink/80">
          <svg viewBox="0 0 50 36" aria-hidden="true" className="h-9 w-12">
            {shape}
          </svg>
          {name}
        </li>
      ))}
    </ul>
  );
}

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-h" className="mx-auto max-w-3xl px-4 py-16">
      <h2 id="how-h" className="text-xs tracking-[0.35em] text-phosphor">
        HOW THE APG-73 WORKS
      </h2>
      <p className={p}>
        The AN/APG-73 is the F/A-18C/D Hornet&apos;s X-band pulse-Doppler radar, an upgrade of the earlier APG-65 with much
        faster processing. Its antenna is a flat plate that the radar physically swings around to scan the sky. Everything
        below is how this trainer models it, from public sources and with simplified numbers.
      </p>

      <h3 className={h3}>The B-scope is not a map</h3>
      <p className={p}>
        The display plots azimuth (left–right of your nose, ±70°) across and range (0 at the bottom) up. Because every
        range gets the full width, contacts close to you are stretched along the bottom edge and the picture no longer
        matches the real geometry. A target on a collision course keeps the same azimuth and slides straight down. The
        instructor map shows the true picture beside the scope.
      </p>
      <BscopeDiagram />

      <h3 className={h3}>Scan volume and frame time</h3>
      <p className={p}>
        The antenna sweeps one horizontal line, a <em>bar</em>, then steps down and sweeps back. Azimuth width × bars is
        the volume searched, and the time to cover it all is the frame time. At about {SCAN_RATE_DPS}°/s (an estimate):
      </p>
      <table className="mt-4 w-full max-w-sm text-left text-sm">
        <thead className="text-xs text-ink/70">
          <tr>
            <th className="py-1 font-normal">Scan</th>
            <th className="py-1 font-normal">Frame time</th>
          </tr>
        </thead>
        <tbody>
          {SCANS.map(([az, bars]) => (
            <tr key={`${az}-${bars}`} className="border-t border-white/5">
              <td className="py-1">
                {az}° × {bars} bars
              </td>
              <td className="py-1">{frameTime(az, bars).toFixed(1)} s</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={p}>
        A bigger scan means an older picture: between looks the radar only knows where a target <em>was</em>. Search wide
        to find, then narrow the scan (or move its centre with the TDC) to follow.
      </p>

      <h3 className={h3}>Elevation and altitude coverage</h3>
      <p className={p}>
        The bars are stacked 1.2° apart around the antenna elevation you set with the wheel. That thin wedge gets taller
        with distance: the two numbers beside the cursor are the highest and lowest altitudes (thousands of feet) it covers
        at the cursor&apos;s range. A target at long range can easily fly above or below it. Check the numbers where you
        expect the bandit and roll the antenna until it paints.
      </p>

      <h3 className={h3}>PRF and the Doppler notch</h3>
      <p className={p}>
        A pulse-Doppler radar separates aircraft from the ground by their speed toward you. HI pulse-repetition frequency
        sees nose-on targets far away but struggles with anything moving away; MED sees every aspect at shorter range;
        INTL alternates the two bar by bar. Anything whose speed along your line of sight matches the ground&apos;s is
        thrown away with the clutter. A bandit flying 90° across your line of sight (&quot;beaming&quot;) drops into that
        notch and disappears.
      </p>

      <h3 className={h3}>RWS, TWS and STT</h3>
      <p className={p}>
        <strong>RWS</strong> (Range While Search) paints raw hits, or <em>bricks</em>, that fade with age: good for finding
        things. <strong>TWS</strong> (Track While Scan) limits the scan so every contact is revisited within about 3 s and
        keeps a <em>trackfile</em> on each. You designate a primary target (L&amp;S, ★) and a secondary (DT2, ◇).{' '}
        <strong>STT</strong> (Single Target Track) points the antenna at one target continuously: the best data, but that
        target&apos;s warning receiver knows it is locked, and the lock breaks if the target leaves the ±70° gimbal limit
        or stays in the notch for more than 3 s.
      </p>

      <h3 className={h3}>ACM: close-in auto-acquisition</h3>
      <p className={p}>
        Inside 10 nm there is no time to hunt for bricks. Push the castle switch forward for <strong>Boresight</strong> (a
        3.3° beam down the nose). Inside ACM, castle left gives <strong>Wide</strong> acquisition (a 60°-wide box) and aft
        gives <strong>Vertical</strong> acquisition (a tall column above the nose, for turning fights). Each mode locks the
        first aircraft it finds in its box.
      </p>

      <h3 className={h3}>IFF, NCTR and HAFU symbols</h3>
      <p className={p}>
        Pressing the castle switch interrogates the aircraft under the cursor. A friendly&apos;s transponder replies; silence
        makes a contact <em>ambiguous</em>, not hostile. In STT, NCTR (non-cooperative target recognition) can identify the
        engine type of a nose-on target inside about 25 nm; an ambiguous contact with a hostile type becomes{' '}
        <em>hostile</em>. The symbols show identity by shape:
      </p>
      <HafuDiagram />
      <p className="mt-6 text-xs leading-relaxed text-ink/60">
        Scan rate, detection ranges, the NCTR limits and some timings are estimates: the real figures are not public. See
        Sources below.
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Write `components/sections/ControlsReference.tsx`**

```tsx
const th = 'px-2 py-1.5 text-left text-xs font-normal text-ink/70';
const td = 'border-t border-white/5 px-2 py-1.5 align-top';

const PB_ROWS: [string, string, string, string, string, string][] = [
  ['PB1', 'PRF (MED / HI / INTL)', 'PRF', 'PRF', '—', '—'],
  ['PB5', 'RWS → TWS', 'TWS → RWS', 'RTS (back to search)', 'ACM sub-mode', '—'],
  ['PB6', 'Bars 1/2/4/6', 'Bars 2/4/6', 'shown only', '—', '—'],
  ['PB7', 'SIL (silent)', 'SIL', 'SIL', 'SIL', '—'],
  ['PB8', 'ERASE bricks', '—', '—', '—', '—'],
  ['PB10', '—', '—', 'TWS (keep target as ★, AUTO)', '—', 'AGE 2–32 s'],
  ['PB11 / 12', 'Range ↑ / ↓', 'Range ↑ / ↓', 'automatic', '—', '—'],
  ['PB13', '—', 'AUTO / MAN centring', '—', '—', '—'],
  ['PB14', 'RSET (clear ★ ◇)', 'RSET', 'RSET', '—', '—'],
  ['PB15', 'NCTR on/off', 'NCTR', 'NCTR', '—', '—'],
  ['PB16', 'DATA page', 'DATA', 'DATA', '—', 'back'],
  ['PB18', 'MENU', 'MENU', 'MENU', 'MENU', 'MENU'],
  ['PB19', 'Azimuth 20–140°', 'Azimuth (TWS limits)', '—', '—', '—'],
];

const HOTAS: [string, string, string][] = [
  ['TDC (throttle)', 'W A S D or drag pad', 'Move the cursor; push it into an edge to change range (top/bottom) or azimuth (left/right)'],
  ['TDC depress', 'Space', 'Designate: brick → lock (RWS); trackfile → ★, then ◇; ★ → lock (TWS); empty space → move the scan centre'],
  ['Antenna elevation', 'R / F', 'Raise / lower all bars together'],
  ['Castle forward', 'I', 'ACM Boresight'],
  ['Castle aft', 'K', 'In ACM: Vertical acquisition'],
  ['Castle left', 'J', 'In ACM: Wide acquisition'],
  ['Castle press', 'O', 'IFF interrogation of the contact under the cursor'],
  ['Undesignate', 'U', 'Break lock / leave ACM; in TWS: make #1 the ★, swap ★ ◇, or step ★ through the ranks'],
];

const FLIGHT: [string, string][] = [
  ['← / →', 'Turn (hold Shift for fine turns)'],
  ['↑ / ↓', 'Nose down / nose up (descend / climb)'],
  ['+ / −', 'Speed up / slow down'],
  ['P', 'Pause'],
  ['M', 'Instructor map on/off'],
];

export function ControlsReference() {
  return (
    <section id="controls" aria-labelledby="controls-h" className="mx-auto max-w-5xl px-4 py-16">
      <h2 id="controls-h" className="text-xs tracking-[0.35em] text-phosphor">
        CONTROLS REFERENCE
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/80">
        Pushbuttons are numbered clockwise from the bottom of the left column: PB1–5 up the left side, PB6–10 across the top,
        PB11–15 down the right side, PB16–20 back along the bottom (PB18 is the middle one).
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <caption className="mb-2 text-left text-[11px] tracking-[0.3em] text-ink/75">PUSHBUTTONS BY PAGE</caption>
          <thead>
            <tr>
              {['PB', 'RWS', 'TWS', 'STT', 'ACM', 'DATA'].map((c) => (
                <th key={c} scope="col" className={th}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PB_ROWS.map(([pb, ...cells]) => (
              <tr key={pb}>
                <th scope="row" className={`${td} text-left font-normal text-phosphor`}>
                  {pb}
                </th>
                {cells.map((c, i) => (
                  <td key={i} className={td}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <table className="w-full text-sm">
          <caption className="mb-2 text-left text-[11px] tracking-[0.3em] text-ink/75">HOTAS</caption>
          <thead>
            <tr>
              <th scope="col" className={th}>Control</th>
              <th scope="col" className={th}>Key</th>
              <th scope="col" className={th}>What it does</th>
            </tr>
          </thead>
          <tbody>
            {HOTAS.map(([control, key, what]) => (
              <tr key={control}>
                <th scope="row" className={`${td} text-left font-normal`}>
                  {control}
                </th>
                <td className={`${td} text-phosphor`}>
                  <kbd>{key}</kbd>
                </td>
                <td className={td}>{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full text-sm">
          <caption className="mb-2 text-left text-[11px] tracking-[0.3em] text-ink/75">FLYING AND THE PAGE</caption>
          <tbody>
            {FLIGHT.map(([key, what]) => (
              <tr key={key}>
                <th scope="row" className={`${td} text-left font-normal text-phosphor`}>
                  <kbd>{key}</kbd>
                </th>
                <td className={td}>{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-ink/60">
        Keys work while the cockpit fills at least half the screen, so Space still scrolls the page down here. Every
        on-screen control can also be clicked or tapped.
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Write `components/sections/Glossary.tsx`**

```tsx
const TERMS: [string, string][] = [
  ['ACM', 'Air Combat Maneuvering modes: automatic lock-on inside 10 nm (Boresight, Vertical, Wide acquisition).'],
  ['Bar', 'One horizontal sweep of the antenna. Several bars stacked 1.2° apart make up the scan.'],
  ['B-scope', 'The display format: azimuth across, range up. Not a map: close contacts are stretched sideways.'],
  ['BRAA', 'Bearing, Range, Altitude, Aspect: how a controller (AWACS) calls where a contact is.'],
  ['Brick', 'A raw radar hit in RWS: where a target was when the beam passed it. Fades with age.'],
  ['DDI', 'Digital Display Indicator: the Hornet cockpit screen with 20 pushbuttons around it.'],
  ['DT2', 'Secondary designated target (◇) in TWS.'],
  ['Frame', 'One complete pass over the whole scan volume. Frame time = how old the picture can get.'],
  ['HAFU', 'Hostile / Ambiguous / Friendly / Unknown: the trackfile symbol whose shape shows identity.'],
  ['HOTAS', 'Hands On Throttle And Stick: flying the radar without letting go of the controls.'],
  ['IFF', 'Identification Friend or Foe: an interrogation that a friendly transponder answers.'],
  ['L&S', 'Launch & Steering target (★): the primary designated target.'],
  ['MEM', 'Memory: the radar coasting on its last estimate after losing the target for a moment in STT.'],
  ['NCTR', 'Non-Cooperative Target Recognition: identifying an aircraft type from its engines, nose-on and in STT.'],
  ['Notch', 'The Doppler blind spot: targets moving across your line of sight look like ground clutter and are filtered out.'],
  ['PRF', 'Pulse Repetition Frequency: HI for long range nose-on, MED for all aspects, INTL for both.'],
  ['RWS', 'Range While Search: the basic search mode, showing bricks.'],
  ['STT', 'Single Target Track: a lock on one target. Best data; the target knows.'],
  ['TDC', 'Throttle Designator Controller: the thumb control that moves the cursor and designates.'],
  ['TWS', 'Track While Scan: search that keeps trackfiles on several targets at once.'],
];

export function Glossary() {
  return (
    <section id="glossary" aria-labelledby="glossary-h" className="mx-auto max-w-5xl px-4 py-16">
      <h2 id="glossary-h" className="text-xs tracking-[0.35em] text-phosphor">
        GLOSSARY
      </h2>
      <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {TERMS.map(([term, def]) => (
          <div key={term}>
            <dt className="text-sm font-bold text-phosphor">{term}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-ink/80">{def}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

- [ ] **Step 4: Write `components/sections/About.tsx`**

```tsx
const SOURCES: [string, string][] = [
  ['US Navy NATOPS pocket checklist, F/A-18A/B/C/D (public copy)', 'https://www.docdroid.net/file/download/uQCJuVs/f-18abcd-hornet-pocket-checklist-pdf.pdf'],
  ['DOT&E FY97 report: F/A-18C/D and the APG-73', 'https://www.globalsecurity.org/military/library/budget/fy1997/dot-e/navy/97fa18cd.html'],
  ['IDA 1983 case study of the APG-65 (DTIC)', 'https://archive.org/stream/DTIC_ADA142103/DTIC_ADA142103_djvu.txt'],
  ['Forecast International: AN/APG-73', 'https://www.forecastinternational.com/archive/disp_pdf.cfm?DACH_RECNO=730'],
  ['Raytheon news release on the last APG-73 (2006)', 'https://raytheon.mediaroom.com/index.php?s=43&item=471'],
  ['Eagle Dynamics radar white paper (detection-range estimates)', 'https://www.digitalcombatsimulator.com/upload/medialibrary/751/420tvzzkl8vyxzukcdzamjf7gcrhwzmo/Eagle_Dynamics_Radar_White_Paper_v1.pdf'],
  ['Hoggit wiki: F/A-18C display and HOTAS reference', 'https://wiki.hoggitworld.com/view/F/A-18C'],
  ['BAE Systems AN/APX-111 datasheet (IFF)', 'https://www.baesystems.com/en-us/dam/jcr:44b079f8-55e6-4f0f-8bac-49e3f8943088/20-A90-05-AN-APX-111V-CIT-FA-18-datasheet-2025-web.pdf'],
];

export function About() {
  return (
    <footer aria-labelledby="about-h" className="mx-auto max-w-5xl border-t border-white/5 px-4 py-16 text-sm leading-relaxed">
      <h2 id="about-h" className="text-xs tracking-[0.35em] text-phosphor">
        SOURCES AND DISCLAIMER
      </h2>
      <p className="mt-4 max-w-3xl text-ink/80">
        This is an unofficial training aid built from public sources, with simplified and partly estimated numbers. It is
        not affiliated with or endorsed by the US Navy, Boeing, RTX (Raytheon) or Eagle Dynamics, and it is not for
        real-world training. Much public detail about how the display and controls behave comes from flight-simulator
        documentation, because the real tactical manual is not public.
      </p>
      <ul className="mt-6 space-y-2">
        {SOURCES.map(([name, url]) => (
          <li key={url}>
            <a href={url} target="_blank" rel="noreferrer" className="text-phosphor underline decoration-phosphor/40 underline-offset-4 hover:decoration-phosphor">
              {name}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-ink/60">
        Display font: B612 Mono, designed for cockpit screens by Airbus with Intactile Design (SIL Open Font License).
      </p>
    </footer>
  );
}
```

- [ ] **Step 5: Replace `app/page.tsx`**

```tsx
import { Cockpit } from '@/components/cockpit/Cockpit';
import { StartHere } from '@/components/sections/StartHere';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { ControlsReference } from '@/components/sections/ControlsReference';
import { Glossary } from '@/components/sections/Glossary';
import { About } from '@/components/sections/About';

export default function Home() {
  return (
    <main>
      <h1 className="sr-only">Hornet Radar Trainer — learn the AN/APG-73 radar</h1>
      <Cockpit />
      <StartHere />
      <HowItWorks />
      <ControlsReference />
      <Glossary />
      <About />
    </main>
  );
}
```

- [ ] **Step 6: Build, lint, audit, browser check**

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: `/` static.

Run: `grep -o '<h[1-3][^>]*>' out/index.html | head -30`
Expected: one `<h1>`, then `<h2>`s in page order (start, how, controls, glossary, about) with `<h3>`s under them. No level is skipped.

In the browser at 1440 px and at 375 px, check:
- every section renders;
- tables scroll horizontally at 375 px instead of overflowing the page;
- the two diagrams are legible;
- the source links open in a new tab.

- [ ] **Step 7: Commit**

```bash
git add components/sections app/page.tsx
git commit -m "feat(content): how-it-works explainers, controls reference, glossary, sources and disclaimer" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 5: Controls and accessibility polish

**Files:**
- Create: `components/cockpit/TdcPad.tsx`
- Modify (full replacement):
  - `components/cockpit/ThrottleGrip.tsx`
  - `components/cockpit/HoldButton.tsx`
  - `components/cockpit/RadarKnob.tsx`
  - `components/cockpit/Ddi.tsx`
- Modify (small edits):
  - `components/cockpit/useKeyboard.ts`
  - contrast class tokens across `components/cockpit/*.tsx`

**Interfaces:**
- Produces: `TdcPad({ lit, press, release })`, which drives the same TDC key codes as `W A S D`.
- Spec items closed here:
  - §1 "TDC: a drag pad plus keys";
  - §1 "BRT / CONT knobs are decorative";
  - the deferred accessibility findings from Plans 1–3.

- [ ] **Step 1: Write `components/cockpit/TdcPad.tsx`**

```tsx
'use client';

import { useRef, type PointerEvent } from 'react';
import { KEYS } from '@/lib/keys';

const DEAD = 0.25; // fraction of the pad radius that does nothing

/** Drag pad for the TDC: drag the knob to slew the cursor. It presses the same keys as W A S D. */
export function TdcPad({
  lit,
  press,
  release,
}: {
  lit: ReadonlySet<string>;
  press: (code: string) => void;
  release: (code: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const axis = (neg: string, pos: string, v: number) => {
    if (v > DEAD) {
      release(neg);
      press(pos);
    } else if (v < -DEAD) {
      release(pos);
      press(neg);
    } else {
      release(neg);
      release(pos);
    }
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    axis(KEYS.tdcLeft, KEYS.tdcRight, ((e.clientX - box.left) / box.width) * 2 - 1);
    axis(KEYS.tdcUp, KEYS.tdcDown, ((e.clientY - box.top) / box.height) * 2 - 1);
  };
  const end = () => [KEYS.tdcLeft, KEYS.tdcRight, KEYS.tdcUp, KEYS.tdcDown].forEach(release);
  const dx = (lit.has(KEYS.tdcRight) ? 1 : 0) - (lit.has(KEYS.tdcLeft) ? 1 : 0);
  const dy = (lit.has(KEYS.tdcDown) ? 1 : 0) - (lit.has(KEYS.tdcUp) ? 1 : 0);
  return (
    <div
      ref={ref}
      role="group"
      aria-label="TDC drag pad (or keys W A S D)"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      className="relative mx-auto aspect-square w-28 touch-none select-none rounded-full border border-black/60 bg-black/30"
    >
      <span
        aria-hidden="true"
        className={`absolute left-1/2 top-1/2 size-10 rounded-full border transition-transform ${
          dx || dy ? 'border-phosphor/70 bg-phosphor/25' : 'border-black/60 bg-button'
        }`}
        style={{ transform: `translate(calc(-50% + ${dx * 28}px), calc(-50% + ${dy * 28}px))` }}
      />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-1.5 text-center text-[10px] text-ink/70">
        W A S D
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Replace `components/cockpit/ThrottleGrip.tsx`**

```tsx
'use client';

import { KEYS } from '@/lib/keys';
import { HoldButton, type GripProps } from './HoldButton';
import { TdcPad } from './TdcPad';

export function ThrottleGrip({ lit, press, release }: GripProps) {
  const b = (code: string, label: string, disabled = false) => (
    <HoldButton code={code} label={label} lit={lit.has(code)} press={press} release={release} disabled={disabled} />
  );
  return (
    <div data-tut="throttle" className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-4">
      <h2 className="mb-3 text-[11px] tracking-[0.3em] text-ink/75">THROTTLE · LEFT HAND</h2>
      <div data-tut="tdc">
        <p className="mb-1.5 text-[10px] tracking-widest text-ink/70">TDC · DRAG TO SLEW</p>
        <TdcPad lit={lit} press={press} release={release} />
        <div className="mt-2 grid grid-cols-1">{b(KEYS.designate, 'TDC DEPRESS · DESIGNATE')}</div>
      </div>
      <div data-tut="elevation" className="mt-3 grid grid-cols-2 gap-1.5">
        {b(KEYS.elevUp, 'ANT EL ▲')}
        {b(KEYS.elevDown, 'ANT EL ▼')}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {b('', 'CAGE', true)}
        {b('', 'RAID', true)}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Replace `components/cockpit/HoldButton.tsx`**

```tsx
'use client';

import { keyLabel } from '@/lib/keys';

export type HoldButtonProps = {
  code: string;
  label: string;
  lit: boolean;
  press: (code: string) => void;
  release: (code: string) => void;
  disabled?: boolean;
};

export type GripProps = Pick<HoldButtonProps, 'press' | 'release'> & { lit: ReadonlySet<string> };

/** A control that behaves exactly like its key: pressed while held, lit (and aria-pressed) while pressed. */
export function HoldButton({ code, label, lit, press, release, disabled }: HoldButtonProps) {
  return (
    <button
      type="button"
      data-hold=""
      disabled={disabled}
      aria-pressed={disabled ? undefined : lit}
      title={disabled ? 'Not simulated yet' : undefined}
      aria-label={disabled ? `${label} (not simulated yet)` : `${label} (key ${keyLabel(code)})`}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        press(code);
      }}
      onPointerUp={() => release(code)}
      onPointerCancel={() => release(code)}
      onLostPointerCapture={() => release(code)}
      onClick={(e) => {
        if (e.detail === 0) {
          press(code); // keyboard activation: hold ~150 ms so continuous controls reach applyHeld
          setTimeout(() => release(code), 150);
        }
      }}
      className={`flex min-h-11 touch-none select-none flex-col items-center justify-center rounded-md border px-2 py-1 text-[11px] leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        lit ? 'border-phosphor/70 bg-phosphor/20 text-phosphor' : 'border-black/60 bg-button text-ink hover:brightness-110'
      }`}
    >
      <span>{label}</span>
      {code && <kbd className="text-[10px] text-ink/70">{keyLabel(code)}</kbd>}
    </button>
  );
}
```

- [ ] **Step 4: Replace `components/cockpit/RadarKnob.tsx`**

```tsx
'use client';

import type { Power } from '@/lib/sim/types';

const POSITIONS: Power[] = ['OFF', 'STBY', 'OPR'];

export function RadarKnob({ power, onChange }: { power: Power; onChange: (p: Power) => void }) {
  return (
    <div data-tut="radar-knob" role="group" aria-label="RADAR knob" className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-4">
      <h2 className="mb-3 text-[11px] tracking-[0.3em] text-ink/75">RADAR</h2>
      <div className="grid grid-cols-3 gap-1.5">
        {POSITIONS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={power === p}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(p)}
            className={`min-h-11 rounded-md border text-xs ${
              power === p ? 'border-phosphor/70 bg-phosphor/20 text-phosphor' : 'border-black/60 bg-button text-ink'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Replace `components/cockpit/Ddi.tsx`**

The changes are the decorative knobs and a 24 px minimum pushbutton size.

```tsx
'use client';

import type { RefObject } from 'react';
import type { Pushbutton } from '@/lib/sim/pushbuttons';
import { REGION, pbPlace } from '@/lib/ddi/layout';

const EDGE = 9; // bezel margin, % of the DDI width

/** Screen fraction (0..1 of the canvas) → % of the whole DDI (bezel included). */
const pct = (f: number) => `${EDGE + (100 - 2 * EDGE) * f}%`;

export function Ddi({
  pbs,
  canvasRef,
  onPress,
  mark = null,
}: {
  pbs: Record<number, Pushbutton>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onPress: (n: number) => void;
  mark?: { u: number; v: number } | null;
}) {
  return (
    <div
      data-tut="ddi"
      className="relative aspect-square w-full rounded-[7%] border border-black/70 bg-bezel shadow-[inset_0_2px_0_rgba(255,255,255,0.06),0_16px_48px_rgba(0,0,0,0.6)]"
      style={{ padding: `${EDGE}%` }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="block size-full rounded-[2%] bg-black" />
      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
        const { side, t } = pbPlace(n);
        const along = pct(t);
        const near = `${EDGE / 2}%`;
        const far = `${100 - EDGE / 2}%`;
        const pos =
          side === 'left' ? { left: near, top: along }
          : side === 'right' ? { left: far, top: along }
          : side === 'top' ? { left: along, top: near }
          : { left: along, top: far };
        const pb = pbs[n];
        return (
          <button
            key={n}
            type="button"
            data-tut={`pb-${n}`}
            aria-label={`PB ${n}${pb ? ` – ${pb.label.replace('\n', ' ')}` : ' (blank)'}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPress(n)}
            className="absolute size-[6%] min-h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 rounded-[18%] border border-black/70 bg-button shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] active:bg-black/60 focus-visible:outline-2 focus-visible:outline-phosphor"
            style={pos}
          />
        );
      })}
      {/* Decorative brightness and contrast knobs in the lower corners (not functional) */}
      {(['BRT', 'CONT'] as const).map((name, i) => (
        <span
          key={name}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[1.2%] flex w-[8%] flex-col items-center gap-0.5"
          style={i === 0 ? { left: '0.8%' } : { right: '0.8%' }}
        >
          <span className="text-[8px] leading-none tracking-wider text-ink/60">{name}</span>
          <span className="aspect-square w-3/4 rounded-full border border-black/70 bg-[radial-gradient(circle_at_35%_30%,#5a605b,#1d201e)]" />
        </span>
      ))}
      {mark && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-[8%] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-phosphor"
          style={{
            left: pct(REGION.x0 + mark.u * (REGION.x1 - REGION.x0)),
            top: pct(REGION.y0 + mark.v * (REGION.y1 - REGION.y0)),
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Keyboard fixes in `components/cockpit/useKeyboard.ts`**

1. In `down`, directly after the line that returns for form fields (the one containing `closest('input, textarea, select, [contenteditable="true"]')`), add:

```ts
      // Space on a focused ordinary button (lesson Next, header chips, page buttons) should press that button, not designate
      if (code === KEYS.designate && e.target instanceof Element && e.target.closest('button:not([data-hold]), a, summary')) return;
```

2. Replace the whole `up` handler with:

```ts
    const up = (e: KeyboardEvent) => {
      // macOS sends no keyup for other keys while Meta is held: releasing Meta releases everything
      if (e.key === 'Meta') return releaseAll();
      const code = logical.get(e.code) ?? e.code;
      logical.delete(e.code);
      release(code); // always, so a key pressed before a modifier never sticks
      const onButton = code === KEYS.designate && e.target instanceof Element && e.target.closest('button:not([data-hold]), a, summary');
      if (HANDLED.has(code) && activeRef.current && !onButton && !(e.ctrlKey || e.metaKey || e.altKey)) e.preventDefault();
    };
```

- [ ] **Step 7: Raise low-contrast text**

Run from the repo root:

```bash
sed -i 's#text-ink/50#text-ink/70#g; s#text-ink/60#text-ink/75#g' components/cockpit/*.tsx
```

Expected: `grep -rn "text-ink/50\|text-ink/60" components/cockpit` prints nothing.

- [ ] **Step 8: Build, lint, test, browser check**

Run: `npm test`
Expected: all PASS.

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: `/` static.

Browser check:
1. Dragging the TDC pad slews the cursor, and its knob and the key labels light up. Releasing anywhere (even outside the pad) stops the slew.
2. The BRT and CONT knobs show in the lower bezel corners and don't block PB16/PB20.
3. At 375 px every pushbutton is at least 24 × 24 px (inspect one).
4. Keyboard only (Tab / Enter / Space): focus a lesson `NEXT` button and press Space, and it advances. Space elsewhere in the cockpit still designates.
5. Screen reader or accessibility-tree check (`read_page`):
   - HOTAS buttons expose `pressed` while held;
   - the RADAR knob buttons expose `pressed` on the active position.
6. The console shows no errors.

- [ ] **Step 9: Commit**

```bash
git add components/cockpit
git commit -m "feat(cockpit): TDC drag pad, bezel knobs, aria-pressed controls, contrast and keyboard fixes" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 6: README and final verification

**Files:**
- Modify: `README.md` (full replacement)

- [ ] **Step 1: Replace `README.md`**

````markdown
# Hornet Radar Trainer

An unofficial, interactive trainer for the F/A-18C Hornet's **AN/APG-73** radar, for newcomers. It does not depend on any particular flight sim.

What the site includes:
- **Radar display (DDI):** a faithful B-scope display with its 20 pushbuttons.
- **Cockpit controls:** throttle and stick controls (TDC, antenna elevation, castle switch, undesignate), plus simple flight.
- **Radar modes:**
  - RWS / TWS / STT;
  - close-range auto-lock (ACM: BST, VACQ, WACQ);
  - IFF and NCTR identification, shown with HAFU symbols;
  - the Doppler notch.
- **Instructor map:** a toggleable "truth" map (top-down and side view).
- **Learning:** a first-visit tutorial, seven lessons, and free play with random encounters, an AWACS tasking, a clock and a score.
- **Reference:** explainers, a controls reference, a glossary and sources, below the cockpit.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # simulation, renderer and lesson tests (node:test, no framework)
npm run build    # static export in out/
```

## Controls

| Key | Control |
|---|---|
| W A S D (or drag pad) | TDC: move the cursor |
| Space | Designate / lock |
| R / F | Antenna elevation |
| I / K / J | Castle fwd (ACM) / aft (VACQ) / left (WACQ) |
| O | Castle press: IFF |
| U | Undesignate / break lock |
| Arrows | Fly: ←/→ turn, ↑/↓ nose down/up (Shift = fine) |
| + / − | Speed |
| M / P | Instructor map / pause |

## Project layout

| Folder | Contents |
|---|---|
| `lib/sim/` | Framework-free simulation: geometry, antenna, detection, trackfiles, identification, ACM, the radar mode machine, pushbuttons, encounters, free play |
| `lib/ddi/` | Canvas renderers: DDI, HUD window, instructor map |
| `lib/lessons/` | Tutorial and lessons as data, plus walkthrough tests that prove each one can be completed |
| `components/` | The cockpit UI and the page sections |

Design docs:
- Research: [`docs/research/apg-73.md`](docs/research/apg-73.md)
- Spec: [`docs/superpowers/specs/`](docs/superpowers/specs/)
- Plans: [`docs/superpowers/plans/`](docs/superpowers/plans/)

Every tunable number is in `lib/sim/constants.ts`; values marked ESTIMATE are not public.

## Disclaimer

- Unofficial.
- Built from public sources, with simplified and partly estimated numbers.
- Not affiliated with the US Navy, Boeing, RTX or Eagle Dynamics.
- Not for real-world training.
````

- [ ] **Step 2: Full verification**

Run each command and expect the result shown:

| Command | Expected |
|---|---|
| `npm test` | All suites pass. Output is clean (no warnings). |
| `npx tsc --noEmit` | No output. |
| `npm run lint` | No errors. |
| `npm run build` | `/` is static. `out/index.html` exists. |

Then serve the static export: `npx --yes serve out -l 4173`. If the environment has no network access for `npx`, use `npm run dev` instead. Walk the whole site in the browser pane, with screenshots.

1. **First visit.** Clear `localStorage` first.
   - The welcome dialog opens.
   - Complete the tutorial.
   - A reload doesn't show the dialog again.
2. **Lessons.** Complete each of the seven lessons from its card. Each card then shows `✓ DONE`.
3. **Free play.**
   - Play one Easy, one Normal and one Hard encounter.
   - Taskings, the countdown, the score, the debrief and the next tasking all work.
   - The map is off by default; `M` turns it on.
4. **Sandbox.** Every control works by key and by click:
   - PB1 / 5 / 6 / 7 / 8 / 10 / 11 / 12 / 13 / 14 / 15 / 16 / 19;
   - TDC pad, designate, antenna elevation, castle directions and press, undesignate;
   - flight keys, RADAR knob, SIL and the DATA page.
5. **Responsive layout.**
   - 1440 px: three columns, and the DDI fits the viewport height.
   - 768 px and 375 px: the panels stack and nothing overflows horizontally.
6. **Performance.** With the cockpit scrolled off-screen, the sim pauses and the canvases stop redrawing.
7. **Console.** No errors or hydration warnings across all of the above.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: final README" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Spec coverage for this plan (and the project's final state)

| Spec item | Where |
|---|---|
| **Free play** | |
| One encounter at a time with an AWACS BRAA tasking | Plan 5 Tasks 1–3 |
| Objectives LOCK / ID_ALL / ID_AND_LOCK | Plan 5 Tasks 1–3 |
| Timeout (3–5 min) and merge-within-5 nm loss | Plan 5 Tasks 1–3 |
| Score formula and friendly-spike penalty | Plan 5 Tasks 1–3 |
| Debrief, then the next encounter | Plan 5 Tasks 1–3 |
| Difficulty profiles: Easy, Normal (with turns), Hard (2-ship, beaming, 2–40k ft) | Plan 5 Task 1 |
| Instructor map off by default in free play | Plan 5 Task 3 |
| Welcome "Skip → free play Easy" | Plan 5 Task 3 |
| **Status line** | |
| Activity label, tasking with timer, score | Plan 5 Task 3 |
| Map / key-legend / pause toggles, plus restart | Plan 5 Task 3. The key legend is the Controls reference section and the key shown on every switch; there is no separate overlay. |
| **Below the fold** | |
| Start here: tutorial, free play, lesson cards with ✓ | Plan 4 Task 4, Plan 5 Task 3 |
| How the APG-73 works: all seven topics | Plan 5 Task 4 |
| Controls reference | Plan 5 Task 4 |
| Glossary, sources, disclaimer | Plan 5 Task 4 |
| **Cockpit controls and accessibility** | |
| TDC drag pad | Plan 5 Task 5 |
| Decorative BRT/CONT knobs | Plan 5 Task 5 |
| Tappable controls on narrow screens | Plan 5 Task 5 |
| `aria-live` announcements | Plan 2 Task 1, Plan 5 Task 3 |
| **Verification** | |
| Spec §7: tests, build and lint, the full browser walk at 375 / 768 / 1440 px | Plan 5 Task 6 |
