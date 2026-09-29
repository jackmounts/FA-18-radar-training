# Hornet Radar Trainer — Plan 3: ACM, HUD Window and Instructor Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the close-in auto-acquisition modes (ACM: Boresight, Vertical and Wide acquisition) driven by the castle switch, a HUD window that shows the ACM pattern, and the toggleable instructor "truth" map (top-down plus side profile).

**Architecture:**
- `lib/sim/acm.ts`: pure ACM scan patterns.
- `lib/sim/radar.ts`: gains the ACM mode, which auto-locks into STT.
- Two new pure canvas renderers:
  - `lib/ddi/hud.ts`: forward view;
  - `lib/ddi/instructor.ts`: truth map.
  Both are tested in Node with a recording fake context.
- The Cockpit's keyboard handling moves into a `useKeyboard` hook, and canvas sizing into `fitCanvas`, so `Cockpit.tsx` stays readable as Plans 4–5 grow it.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, Tailwind v4, TypeScript, Node 25 `node --test` with native type stripping, npm.

**Spec:** `docs/superpowers/specs/2026-09-29-hornet-radar-trainer-design.md` §1 (right column: instructor map, HUD window) and §2 (castle, ACM). **Research:** `docs/research/apg-73.md` §3 (ACM table).

**Sequence:** Plan 3 of 5. Requires Plan 2: `SimEvent`, trackfiles, `ident.ts`, TWS, `castlePress`.

## Global Constraints

**Stack & tooling**
- Next.js 16 App Router + TypeScript + Tailwind v4.
- No extra runtime dependencies: no state library, no test framework, no shadcn.
- Static export: `output: 'export'` in `next.config.ts`.
- Tests: `npm test` runs `node --test "lib/**/*.test.ts"` (Node 25 strips types). No Vitest or Jest.

**Imports (type-stripping rules)**
- Code under `lib/`:
  - relative imports include the `.ts` extension;
  - type-only imports use `import type`;
  - no `enum`, `namespace`, or constructor parameter properties.
- Components import from `@/lib/...` without the extension.

**Units & conventions**
- Units: nm, ft, kt, degrees, seconds.
- Axes: x = east, y = north. Heading 0 = north, clockwise. Azimuth right = positive.

**Pushbuttons (PB):** numbered clockwise from the bottom of the left column.
- PB1–5: left column, bottom → top.
- PB6–10: top row, left → right.
- PB11–15: right column, top → bottom.
- PB16–20: bottom row, right → left. PB18 = MENU.

**Display & copy**
- DDI: monochrome green `#6dff8a` on `#030a05`, font B612 Mono.
- English only; sim-agnostic copy (never mention DCS keybinds).
- The instructor map is a teaching aid, not a cockpit display. It may colour aircraft by side.

**Keys**

| Key | Function |
|---|---|
| `W A S D` | TDC slew |
| `Space` | Designate |
| `R` / `F` | Antenna elevation |
| `I J K L` | Castle fwd / left / aft / right |
| `O` | Castle press |
| `U` | Undesignate |
| Arrows | Fly: ←/→ turn, ↑ nose down, ↓ nose up |
| `+` / `-` | Speed |
| `P` | Pause |
| `M` | Instructor map (new in this plan) |

**Commits:** commit after every task. End each message with the Co-Authored-By trailer from your own session's attribution reminder (the model that wrote the commit).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `lib/sim/types.ts` | modify | `Mode` gains `'ACM'`; `AcmMode`, `AcmPattern`, `Radar.acm`, and an `acm` event |
| `lib/sim/constants.ts` | modify | `ACM_PATTERNS`, `VISUAL_RANGE_NM` |
| `lib/sim/acm.ts` | create | ACM beam lanes and the ACM antenna sweep |
| `lib/sim/radar.ts` | modify (full) | Castle switch: ACM entry/sub-modes/exit; ACM search that auto-locks |
| `lib/sim/pushbuttons.ts` | modify | ACM page: sub-mode legend at PB5, SIL |
| `lib/ddi/draw.ts` | modify | Elevation caret follows the antenna in ACM |
| `lib/ddi/hud.ts` | create | HUD window renderer |
| `lib/ddi/instructor.ts` | create | Instructor map renderer (plan view + side profile) |
| `lib/keys.ts` | modify | `map: 'KeyM'` |
| `components/cockpit/canvas.ts` | create | `fitCanvas`: DPR-aware canvas sizing |
| `components/cockpit/useKeyboard.ts` | create | Global keyboard → press/release (moved out of `Cockpit.tsx`) |
| `components/cockpit/HudWindow.tsx` | create | HUD panel |
| `components/cockpit/InstructorMap.tsx` | create | Instructor map panel |
| `components/cockpit/StickGrip.tsx` | modify (full) | Castle directions enabled; `data-tut` hooks `castle` and `undesignate` |
| `components/cockpit/Cockpit.tsx` | modify (full) | Action table, HUD/map canvases, map toggle |
| Tests | create | `lib/sim/acm.test.ts`, `lib/sim/acm-mode.test.ts`, `lib/ddi/hud.test.ts`, `lib/ddi/instructor.test.ts`; plus additions to `pushbuttons.test.ts` and `draw.test.ts` |

---

### Task 1: ACM scan patterns

**Files:**
- Create: `lib/sim/acm.ts`
- Modify: `lib/sim/types.ts`, `lib/sim/constants.ts`
- Test: `lib/sim/acm.test.ts`

**Interfaces**

Produces:
- `type AcmMode = 'BST' | 'VACQ' | 'WACQ'`
- `type AcmPattern = { az: [number, number]; el: [number, number]; gate: number }`
- `ACM_PATTERNS: Readonly<Record<AcmMode, AcmPattern>>`
- `VISUAL_RANGE_NM = 10`
- `acmLanes(p: AcmPattern): { long: 'az' | 'el'; lanes: number[] }`
- `stepAcmAntenna(ant: Antenna, p: AcmPattern, dt: number): void`

- [ ] **Step 1: Add the types to `lib/sim/types.ts`**

Directly below `export type Centering = 'AUTO' | 'MAN';`, add:

```ts
export type AcmMode = 'BST' | 'VACQ' | 'WACQ';
/** An ACM scan volume, degrees off the nose, with its auto-acquisition range gate (nm). */
export type AcmPattern = { az: [number, number]; el: [number, number]; gate: number };
```

- [ ] **Step 2: Add the constants to `lib/sim/constants.ts`**

1. Change the first import line to:

```ts
import type { AcmMode, AcmPattern, Prf } from './types.ts';
```

2. Append:

```ts
// ACM (close-in auto-acquisition): scan volumes and range gates, DCS figures
export const ACM_PATTERNS: Readonly<Record<AcmMode, AcmPattern>> = {
  BST: { az: [0, 0], el: [-1.7, 1.7], gate: 10 }, // boresight: 3.3° beam nodding ±1.7° on the nose
  VACQ: { az: [-3, 3], el: [-13, 46], gate: 5 }, // vertical: a 6°-wide column up the canopy
  WACQ: { az: [-30, 30], el: [-9, 6], gate: 10 }, // wide: a 60°-wide box around the nose
};
export const VISUAL_RANGE_NM = 10; // aircraft drawn in the HUD window (you'd see them out of the canopy)
```

- [ ] **Step 3: Write the failing test `lib/sim/acm.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acmLanes, stepAcmAntenna } from './acm.ts';
import { ACM_PATTERNS, SIM_DT } from './constants.ts';
import type { Antenna } from './types.ts';

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('lanes: BST is one column on the nose, VACQ two columns, WACQ five rows', () => {
  assert.deepEqual(acmLanes(ACM_PATTERNS.BST), { long: 'el', lanes: [0] });
  const v = acmLanes(ACM_PATTERNS.VACQ);
  assert.equal(v.long, 'el');
  near(v.lanes[0], -1.35);
  near(v.lanes[1], 1.35);
  const w = acmLanes(ACM_PATTERNS.WACQ);
  assert.equal(w.long, 'az');
  assert.equal(w.lanes.length, 5);
  near(w.lanes[0], -7.35);
  near(w.lanes[4], 4.35);
});

test('BST nods its beam through ±1.7° on the nose, completing many frames per second', () => {
  const ant: Antenna = { az: 5, el: 0, bar: 0, dir: 1, frame: 0 };
  let lo = 0;
  let hi = 0;
  for (let i = 0; i < 60; i++) {
    stepAcmAntenna(ant, ACM_PATTERNS.BST, SIM_DT);
    lo = Math.min(lo, ant.el);
    hi = Math.max(hi, ant.el);
    assert.equal(ant.az, 0);
  }
  assert.ok(hi <= 1.7 && lo >= -1.7);
  assert.ok(ant.frame >= 10);
});

test('a VACQ frame is two vertical passes (about 1.5 s)', () => {
  const ant: Antenna = { az: 0, el: -13, bar: 0, dir: 1, frame: 0 };
  let t = 0;
  while (ant.frame === 0) {
    stepAcmAntenna(ant, ACM_PATTERNS.VACQ, SIM_DT);
    t += SIM_DT;
  }
  assert.ok(Math.abs(t - (2 * 59) / 80) < 0.1, `frame took ${t}s`);
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `node --test lib/sim/acm.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `acm.ts`.

- [ ] **Step 5: Write `lib/sim/acm.ts`**

```ts
import type { AcmPattern, Antenna } from './types.ts';
import { BEAMWIDTH_DEG, SCAN_RATE_DPS } from './constants.ts';
import { clamp } from './geometry.ts';

/** Beam positions across the pattern's short axis, one beamwidth apart; the beam sweeps along the long axis. */
export function acmLanes(p: AcmPattern): { long: 'az' | 'el'; lanes: number[] } {
  const long = p.el[1] - p.el[0] > p.az[1] - p.az[0] ? 'el' : 'az';
  const [s0, s1] = long === 'el' ? p.az : p.el;
  const n = Math.max(1, Math.ceil((s1 - s0) / BEAMWIDTH_DEG));
  const lanes =
    n === 1
      ? [(s0 + s1) / 2]
      : Array.from({ length: n }, (_, i) => s0 + BEAMWIDTH_DEG / 2 + (i * (s1 - s0 - BEAMWIDTH_DEG)) / (n - 1));
  return { long, lanes };
}

/** ACM scan: sweep the long axis at the scan rate, stepping one lane per pass; a frame is one pass per lane. */
export function stepAcmAntenna(ant: Antenna, p: AcmPattern, dt: number) {
  const { long, lanes } = acmLanes(p);
  const [l0, l1] = long === 'el' ? p.el : p.az;
  if (ant.bar >= lanes.length) ant.bar = 0;
  let pos = clamp(long === 'el' ? ant.el : ant.az, l0, l1) + ant.dir * SCAN_RATE_DPS * dt;
  if (pos > l1 || pos < l0) {
    pos = clamp(pos, l0, l1);
    ant.dir = ant.dir === 1 ? -1 : 1;
    ant.bar = (ant.bar + 1) % lanes.length;
    if (ant.bar === 0) ant.frame += 1;
  }
  if (long === 'el') {
    ant.el = pos;
    ant.az = lanes[ant.bar];
  } else {
    ant.az = pos;
    ant.el = lanes[ant.bar];
  }
}
```

- [ ] **Step 6: Run the tests and type-check**

Run: `npm test`
Expected: PASS for all suites.

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add lib/sim/types.ts lib/sim/constants.ts lib/sim/acm.ts lib/sim/acm.test.ts
git commit -m "feat(sim): ACM scan patterns (BST, VACQ, WACQ)" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 2: ACM mode and the castle switch

**Files:**
- Modify: `lib/sim/types.ts`, `lib/sim/radar.ts` (full replacement)
- Test: `lib/sim/acm-mode.test.ts`

**Interfaces**

Consumes:
- `ACM_PATTERNS`, `stepAcmAntenna` (Task 1)
- `iff`, `interrogate`, `stepNctr` (Plan 2)

Produces:
- `castle(sim: Sim, dir: 'fwd' | 'aft' | 'left' | 'right'): void`
- `Mode` now includes `'ACM'`, and `Radar.acm: AcmMode | null`.
- An `{ kind: 'acm'; acm; text }` event.

Behaviour:
- `undesignate` in ACM returns to `searchMode`.
- An ACM lock goes to STT; undesignating from that STT also returns to `searchMode`.

Every other `radar.ts` export keeps its Plan 2 signature.

- [ ] **Step 1: Extend `lib/sim/types.ts`**

1. Replace `export type Mode = SearchMode | 'STT';` with:

```ts
export type Mode = SearchMode | 'STT' | 'ACM';
```

2. Inside `Radar`, directly after `searchMode: SearchMode; // what STT returns to`, add:

```ts
  acm: AcmMode | null; // ACM sub-mode while mode === 'ACM'
```

3. In `SimEvent`, add a member after the `nctr` line:

```ts
  | { kind: 'acm'; acm: AcmMode; text: string }
```

- [ ] **Step 2: Write the failing test `lib/sim/acm-mode.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim, run } from './sim.ts';
import { makeTarget } from './world.ts';
import { castle, lock, setPower, setSearchMode, undesignate } from './radar.ts';
import type { Target } from './types.ts';

const withTarget = (t: Target) => {
  const s = createSim({ seed: 4, own: { spd: 250 }, targets: [t] });
  setPower(s, 'OPR');
  return s;
};

test('castle forward enters ACM Boresight and breaks an existing lock', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 20, spd: 250 }));
  lock(s, 'T1');
  castle(s, 'fwd');
  assert.equal(s.radar.mode, 'ACM');
  assert.equal(s.radar.acm, 'BST');
  assert.equal(s.radar.stt, null);
  assert.equal(s.events.at(-1)?.kind, 'acm');
});

test('BST auto-locks a target on the nose inside 10 nm', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 8, spd: 250 }));
  castle(s, 'fwd');
  run(s, 0.5);
  assert.equal(s.radar.mode, 'STT');
  assert.equal(s.radar.stt?.targetId, 'T1');
});

test('BST ignores a target 10° off the nose; castle left (WACQ) finds it', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 1.39, y: 7.88, spd: 250 }));
  castle(s, 'fwd');
  run(s, 1);
  assert.equal(s.radar.mode, 'ACM');
  castle(s, 'left');
  assert.equal(s.radar.acm, 'WACQ');
  run(s, 4);
  assert.equal(s.radar.mode, 'STT');
});

test('castle aft selects VACQ, which locks a target high above the nose inside 5 nm', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 4, alt: 30000, spd: 250 }));
  castle(s, 'fwd');
  castle(s, 'aft');
  assert.equal(s.radar.acm, 'VACQ');
  run(s, 3);
  assert.equal(s.radar.mode, 'STT');
});

test('ACM range gates: nothing beyond 10 nm in BST', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 12, spd: 250 }));
  castle(s, 'fwd');
  run(s, 1);
  assert.equal(s.radar.mode, 'ACM');
});

test('undesignate leaves ACM, and an ACM lock, back to the previous search mode', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 8, spd: 250 }));
  setSearchMode(s, 'TWS');
  castle(s, 'fwd');
  undesignate(s);
  assert.equal(s.radar.mode, 'TWS');
  assert.equal(s.radar.acm, null);
  castle(s, 'fwd');
  run(s, 0.5);
  assert.equal(s.radar.mode, 'STT');
  undesignate(s);
  assert.equal(s.radar.mode, 'TWS');
});

test('castle aft/left/right do nothing outside ACM', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 20 }));
  castle(s, 'aft');
  castle(s, 'left');
  castle(s, 'right');
  assert.equal(s.radar.mode, 'RWS');
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `node --test lib/sim/acm-mode.test.ts`
Expected: FAIL: `castle` is not exported by `radar.ts`.

- [ ] **Step 4: Replace `lib/sim/radar.ts`**

This is the full file. It includes Plan 2's identification hooks and adds ACM.

```ts
import type { AcmMode, Power, Radar, SearchMode, Sim, Target } from './types.ts';
import {
  ACM_PATTERNS, AZ_WIDTHS, BAR_COUNTS, ELEV_RATE_DPS, GIMBAL_AZ_DEG, GIMBAL_EL_DEG, MAX_BRICKS, MAX_RANGE_NM,
  RANGE_SCALES, STT_MEMORY_S, TDC_HIT, TDC_RATE, TWS_BARS, TWS_MAX_AZ,
} from './constants.ts';
import { clamp, elevation, fromBscope, radialSpeed, range, relAz, toBscope } from './geometry.ts';
import { stepAntenna } from './antenna.ts';
import { stepAcmAntenna } from './acm.ts';
import { barPrf, inBeam, inNotch, probability, r50 } from './detection.ts';
import { pruneTracks, rankTracks, trackAt, updateTrack } from './tracks.ts';
import { iff, interrogate, stepNctr } from './ident.ts';

export function defaultRadar(): Radar {
  return {
    power: 'STBY', sil: false, mode: 'RWS', searchMode: 'RWS', acm: null, prf: 'INTL',
    azWidth: 140, bars: 4, rangeScale: 40, age: 8, scanCenter: 0, elev: 0, centering: 'MAN', nctr: true,
    antenna: { az: -70, el: 0, bar: 0, dir: 1, frame: 0 },
    cursor: { u: 0.5, v: 0.5 }, bumpLatched: false,
    bricks: [], tracks: [], looks: {}, ls: null, dt2: null, stt: null, dataPage: false,
  };
}

/** Next value in a list, wrapping at both ends (the real radar wraps on cursor bumps too). */
export function cycle<T>(list: readonly T[], cur: T, d = 1): T {
  const n = list.length;
  return list[(((list.indexOf(cur) + d) % n) + n) % n];
}

export const transmitting = (r: Radar) => r.power === 'OPR' && !r.sil;

export function lookAt(sim: Sim, t: Target) {
  const rng = range(sim.own, t);
  return { range: rng, az: relAz(sim.own, t), el: elevation(sim.own.alt, t.alt, rng) };
}

export function setPower(sim: Sim, power: Power) {
  sim.radar.power = power;
}

/** Bar settings available now: TWS never runs a 1-bar scan. */
export const barOptions = (r: Radar) => (r.mode === 'TWS' ? TWS_BARS : BAR_COUNTS);

/** Azimuth widths available now: TWS caps the frame near 3 s (2B ≤ 80°, 4B ≤ 60°, 6B ≤ 40°). */
export const azOptions = (r: Radar) =>
  r.mode === 'TWS' ? AZ_WIDTHS.filter((a) => a <= TWS_MAX_AZ[r.bars]) : AZ_WIDTHS;

/** Clip bars and azimuth to what the current mode allows (the real radar clips on TWS entry). */
export function clipScan(r: Radar) {
  if (!barOptions(r).includes(r.bars)) r.bars = barOptions(r)[0];
  const az = azOptions(r);
  if (!az.includes(r.azWidth)) r.azWidth = az.filter((a) => a <= r.azWidth).at(-1) ?? az[0];
}

export function setSearchMode(sim: Sim, mode: SearchMode) {
  const r = sim.radar;
  r.mode = mode;
  r.searchMode = mode;
  r.acm = null;
  r.looks = {};
  clipScan(r);
}

export function lock(sim: Sim, targetId: string) {
  const t = sim.targets.find((x) => x.id === targetId);
  if (!t) return;
  const r = sim.radar;
  r.mode = 'STT';
  r.acm = null;
  r.stt = { targetId, memory: 0, nctrTime: 0, print: null };
  r.bricks = [];
  r.looks = {};
  r.tracks = r.tracks.filter((tr) => tr.targetId === targetId); // STT drops the other trackfiles
  updateTrack(r, t, sim.t);
  r.ls = targetId;
  r.dt2 = null;
  sim.events.push({ kind: 'lock', targetId, text: `Locked: ${Math.round(lookAt(sim, t).range)} nm, angels ${Math.round(t.alt / 1000)}` });
  iff(sim, t); // STT interrogates the L&S automatically
}

export function breakLock(sim: Sim, kind: 'lockLost' | 'rts') {
  const r = sim.radar;
  r.mode = r.searchMode;
  r.stt = null;
  r.looks = {};
  sim.events.push(kind === 'rts' ? { kind, text: 'Returned to search' } : { kind, text: 'Lock lost' });
}

/** PB10 in STT: drop to TWS with the locked target as L&S and AUTO scan centring. */
export function sttToTws(sim: Sim) {
  const id = sim.radar.stt?.targetId ?? null;
  sim.radar.stt = null;
  setSearchMode(sim, 'TWS');
  sim.radar.centering = 'AUTO';
  sim.radar.ls = id;
}

/** RSET: clear the designations (the STT target stays L&S). */
export function rset(sim: Sim) {
  const r = sim.radar;
  r.dt2 = null;
  if (r.mode !== 'STT') r.ls = null;
}

/** Trackfiles drawn as symbols: all of them in TWS; only the L&S and DT2 in RWS. */
export const shownTracks = (r: Radar) =>
  r.mode === 'TWS' ? r.tracks : r.tracks.filter((tr) => tr.targetId === r.ls || tr.targetId === r.dt2);

/** The target whose symbol sits under the cursor: trackfile symbols first, then (RWS) bricks. */
export function pickTarget(sim: Sim): string | null {
  const r = sim.radar;
  const under = (az: number, rng: number) => {
    const p = toBscope(az, rng, r.rangeScale);
    return Math.abs(p.u - r.cursor.u) <= TDC_HIT && Math.abs(p.v - r.cursor.v) <= TDC_HIT;
  };
  for (const tr of shownTracks(r)) {
    const k = trackAt(tr, sim.t);
    if (under(relAz(sim.own, k), range(sim.own, k))) return tr.targetId;
  }
  if (r.mode === 'RWS') return r.bricks.findLast((b) => under(b.az, b.range))?.targetId ?? null;
  return null;
}

/** TDC depress.
 *  RWS: a symbol → STT.
 *  TWS ladder: trackfile → L&S (DT2 if an L&S exists); DT2 → L&S; L&S → STT.
 *  Empty space → move the scan centre (RWS, and TWS in MAN). */
export function tdcDepress(sim: Sim) {
  const r = sim.radar;
  if ((r.mode !== 'RWS' && r.mode !== 'TWS') || !transmitting(r)) return;
  const id = pickTarget(sim);
  if (!id) {
    if (r.mode === 'RWS' || r.centering === 'MAN') r.scanCenter = fromBscope(r.cursor.u, r.cursor.v, r.rangeScale).az;
    return;
  }
  if (r.mode === 'RWS' || id === r.ls) return lock(sim, id);
  if (id === r.dt2) {
    r.dt2 = r.ls;
    r.ls = id;
  } else if (r.ls) r.dt2 = id;
  else r.ls = id;
}

/** Undesignate.
 *  ACM → back to search.
 *  STT → back to search.
 *  TWS: nothing designated → #1-ranked becomes L&S; L&S + DT2 → swap; L&S alone → step through the ranks. */
export function undesignate(sim: Sim) {
  const r = sim.radar;
  if (r.mode === 'ACM') {
    r.mode = r.searchMode;
    r.acm = null;
    r.looks = {};
    sim.events.push({ kind: 'rts', text: 'Returned to search' });
    return;
  }
  if (r.mode === 'STT') return breakLock(sim, 'rts');
  if (r.mode !== 'TWS' || r.tracks.length === 0) return;
  const ranked = [...r.tracks].sort((a, b) => a.rank - b.rank);
  if (!r.ls) r.ls = ranked[0].targetId;
  else if (r.dt2) [r.ls, r.dt2] = [r.dt2, r.ls];
  else r.ls = ranked[(ranked.findIndex((tr) => tr.targetId === r.ls) + 1) % ranked.length].targetId;
}

/** Castle switch press: IFF-interrogate the target under the cursor (in STT: the locked target). */
export function castlePress(sim: Sim) {
  const r = sim.radar;
  if (!transmitting(r)) return;
  const id = r.mode === 'STT' ? (r.stt?.targetId ?? null) : pickTarget(sim);
  if (id) interrogate(sim, id);
}

function enterAcm(sim: Sim, acm: AcmMode) {
  const r = sim.radar;
  if (r.mode === 'ACM' && r.acm === acm) return;
  r.mode = 'ACM';
  r.acm = acm;
  r.stt = null; // entering ACM breaks any lock
  r.looks = {};
  r.antenna.bar = 0;
  sim.events.push({ kind: 'acm', acm, text: `ACM ${acm}` });
}

/** Sensor Control Switch (castle).
 *  Forward: ACM Boresight.
 *  Inside ACM: aft = Vertical acquisition, left = Wide acquisition.
 *  Outside ACM the other directions hand the TDC to other displays, which are not simulated. */
export function castle(sim: Sim, dir: 'fwd' | 'aft' | 'left' | 'right') {
  if (dir === 'fwd') return enterAcm(sim, 'BST');
  if (sim.radar.mode !== 'ACM') return;
  if (dir === 'aft') enterAcm(sim, 'VACQ');
  else if (dir === 'left') enterAcm(sim, 'WACQ');
}

function bump(r: Radar, edge: 'top' | 'bottom' | 'left' | 'right') {
  r.bumpLatched = true;
  if (edge === 'top') r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, 1);
  if (edge === 'bottom') r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, -1);
  if (edge === 'left') r.azWidth = cycle(azOptions(r), r.azWidth, -1);
  if (edge === 'right') r.azWidth = cycle(azOptions(r), r.azWidth, 1);
}

/** Slew the cursor; pushing it into an edge "bumps" range (top/bottom) or azimuth (left/right) once per push. */
export function stepCursor(sim: Sim, dt: number) {
  const r = sim.radar;
  const h = sim.held;
  if (!h.tdcX && !h.tdcY) {
    r.bumpLatched = false;
    return;
  }
  const u = r.cursor.u + h.tdcX * TDC_RATE * dt;
  const v = r.cursor.v - h.tdcY * TDC_RATE * dt;
  if (!r.bumpLatched && (r.mode === 'RWS' || r.mode === 'TWS')) {
    if (v < 0) bump(r, 'top');
    else if (v > 1) bump(r, 'bottom');
    else if (u < 0) bump(r, 'left');
    else if (u > 1) bump(r, 'right');
  }
  r.cursor = { u: clamp(u, 0, 1), v: clamp(v, 0, 1) };
}

function search(sim: Sim, dt: number) {
  const r = sim.radar;
  stepAntenna(r.antenna, r, dt);
  const look = `${r.antenna.frame}:${r.antenna.bar}`;
  const prf = barPrf(r.prf, r.antenna.bar, r.antenna.frame);
  for (const t of sim.targets) {
    const g = lookAt(sim, t);
    if (g.range > MAX_RANGE_NM || r.looks[t.id] === look || !inBeam(g.az, g.el, r.antenna)) continue;
    r.looks[t.id] = look; // one detection roll per bar pass
    if (inNotch(radialSpeed(sim.own, t))) continue;
    if (sim.rand() < probability(g.range, r50(prf, t.rcs, -radialSpeed(sim.own, t)))) {
      r.bricks.push({ targetId: t.id, az: g.az, range: g.range, t: sim.t });
      if (r.bricks.length > MAX_BRICKS) r.bricks.shift();
      updateTrack(r, t, sim.t);
    }
  }
}

/** ACM: sweep the pattern in MPRF and lock the first target detected inside the range gate. */
function acmSearch(sim: Sim, dt: number) {
  const r = sim.radar;
  if (!r.acm) return;
  const p = ACM_PATTERNS[r.acm];
  stepAcmAntenna(r.antenna, p, dt);
  const look = `${r.antenna.frame}:${r.antenna.bar}`;
  for (const t of sim.targets) {
    const g = lookAt(sim, t);
    if (g.range > p.gate || r.looks[t.id] === look || !inBeam(g.az, g.el, r.antenna)) continue;
    r.looks[t.id] = look;
    if (inNotch(radialSpeed(sim.own, t))) continue;
    if (sim.rand() < probability(g.range, r50('MED', t.rcs, -radialSpeed(sim.own, t)))) return lock(sim, t.id);
  }
}

function track(sim: Sim, dt: number) {
  const r = sim.radar;
  const stt = r.stt!;
  const t = sim.targets.find((x) => x.id === stt.targetId);
  const g = t && lookAt(sim, t);
  if (!t || !g || Math.abs(g.az) > GIMBAL_AZ_DEG || Math.abs(g.el) > GIMBAL_EL_DEG || g.range > MAX_RANGE_NM) {
    return breakLock(sim, 'lockLost');
  }
  r.antenna.az = g.az;
  r.antenna.el = g.el;
  updateTrack(r, t, sim.t);
  stt.memory = inNotch(radialSpeed(sim.own, t)) ? stt.memory + dt : 0;
  if (stt.memory > STT_MEMORY_S) return breakLock(sim, 'lockLost');
  stepNctr(sim, dt);
  // automatic range scale keeps the target at 45-90% of the scale
  r.rangeScale = RANGE_SCALES.find((s) => g.range <= 0.9 * s) ?? MAX_RANGE_NM;
}

/** TWS AUTO: scan centre and elevation follow the L&S trackfile. Returns false when there is no L&S to follow. */
function autoCenter(sim: Sim) {
  const r = sim.radar;
  const tr = r.tracks.find((x) => x.targetId === r.ls);
  if (!tr) return false;
  const k = trackAt(tr, sim.t);
  r.scanCenter = relAz(sim.own, k);
  r.elev = clamp(elevation(sim.own.alt, k.alt, range(sim.own, k)), -GIMBAL_EL_DEG, GIMBAL_EL_DEG);
  return true;
}

export function stepRadar(sim: Sim, dt: number) {
  const r = sim.radar;
  r.bricks = r.bricks.filter((b) => sim.t - b.t <= r.age);
  pruneTracks(sim);
  rankTracks(sim);
  const auto = r.mode === 'TWS' && r.centering === 'AUTO' && autoCenter(sim);
  if ((r.mode === 'RWS' || r.mode === 'TWS') && !auto) {
    r.elev = clamp(r.elev + sim.held.elev * ELEV_RATE_DPS * dt, -GIMBAL_EL_DEG, GIMBAL_EL_DEG);
  }
  if (!transmitting(r)) {
    if (r.mode === 'STT') breakLock(sim, 'lockLost');
    return;
  }
  if (r.mode === 'STT') track(sim, dt);
  else if (r.mode === 'ACM') acmSearch(sim, dt);
  else search(sim, dt);
}
```

- [ ] **Step 5: Run the tests and type-check**

Run: `npm test`
Expected: PASS for all suites, including the 7 new ACM-mode tests.

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add lib/sim/types.ts lib/sim/radar.ts lib/sim/acm-mode.test.ts
git commit -m "feat(sim): ACM mode via castle switch (BST/VACQ/WACQ) with auto-lock" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 3: ACM on the DDI (pushbuttons and caret)

**Files:**
- Modify: `lib/sim/pushbuttons.ts`, `lib/ddi/draw.ts`
- Test: `lib/sim/pushbuttons.test.ts`, `lib/ddi/draw.test.ts` (one test appended to each)

**Interfaces**

Consumes: `castle` (Task 2).

Produces the ACM page:
- PB5 shows the ACM sub-mode (`BST` / `VACQ` / `WACQ`).
- PB7 is SIL.
- PB18 is MENU.
- Every other button is blank.
- The elevation caret shows the antenna's elevation.

- [ ] **Step 1: Append the failing tests**

1. In `lib/sim/pushbuttons.test.ts`, add `castle` to the existing `./radar.ts` import, then append:

```ts
test('in ACM, PB5 shows the ACM sub-mode and the search controls disappear', () => {
  const s = createSim();
  castle(s, 'fwd');
  const pbs = pushbuttons(s);
  assert.equal(pbs[5].label, 'BST');
  assert.equal(pbs[7].label, 'SIL');
  assert.equal(pbs[19], undefined);
  assert.equal(pbs[11], undefined);
  castle(s, 'aft');
  assert.equal(pushbuttons(s)[5].label, 'VACQ');
});
```

2. In `lib/ddi/draw.test.ts`, add `import { castle } from '../sim/radar.ts';` next to the other imports, then append:

```ts
test('ACM frame shows the sub-mode legend and no cursor altitude numbers', () => {
  const s = createSim();
  setPower(s, 'OPR');
  castle(s, 'fwd');
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  assert.ok(texts.includes('BST'));
  assert.ok(!texts.includes('ERASE'));
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test lib/sim/pushbuttons.test.ts lib/ddi/draw.test.ts`
Expected: FAIL. PB5 reads `ACM` (the RWS/TWS branch prints `r.mode`) instead of `BST`.

- [ ] **Step 3: Add the ACM page to `lib/sim/pushbuttons.ts`**

Directly after the closing `}` of the `if (r.dataPage) { ... }` block, insert:

```ts
  if (r.mode === 'ACM') {
    pbs[5] = { label: r.acm ?? 'ACM' };
    pbs[7] = { label: 'SIL', boxed: r.sil, press: () => { r.sil = !r.sil; } };
    return pbs;
  }
```

- [ ] **Step 4: Make the caret follow the antenna in ACM (`lib/ddi/draw.ts`)**

Replace the line `const el = r.mode === 'STT' ? r.antenna.el : r.elev;` with:

```ts
  const el = r.mode === 'STT' || r.mode === 'ACM' ? r.antenna.el : r.elev;
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS for all suites.

- [ ] **Step 6: Commit**

```bash
git add lib/sim/pushbuttons.ts lib/sim/pushbuttons.test.ts lib/ddi/draw.ts lib/ddi/draw.test.ts
git commit -m "feat(ddi): ACM page legend and antenna-referenced caret" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 4: HUD window renderer

**Files:**
- Create: `lib/ddi/hud.ts`
- Test: `lib/ddi/hud.test.ts`

**Interfaces**

Consumes:
- `ACM_PATTERNS`, `BEAMWIDTH_DEG`, `VISUAL_RANGE_NM`
- `lookAt`, `castle`, `lock` (Task 2)

Produces:
- `HUD_FOV = { az: 32, elLo: -16, elHi: 48 }`
- `drawHud(ctx: CanvasRenderingContext2D, sim: Sim, size: number, font: string): void`, drawn on a square canvas.

- [ ] **Step 1: Write the failing test `lib/ddi/hud.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawHud } from './hud.ts';
import { createSim } from '../sim/sim.ts';
import { makeTarget } from '../sim/world.ts';
import { castle, lock, setPower } from '../sim/radar.ts';

/** Records fillText strings and the names of every other method called. */
function fakeCtx() {
  const texts: string[] = [];
  const calls: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) =>
        key === 'fillText'
          ? (s: string) => { texts.push(s); }
          : key === 'measureText'
            ? (s: string) => ({ width: s.length * 6 })
            : () => { calls.push(String(key)); },
      set: () => true,
    },
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts, calls };
}

const scene = () => {
  const s = createSim({
    targets: [makeTarget({ id: 'T', x: 0, y: 4 }), makeTarget({ id: 'FAR', x: 0, y: 30 })],
  });
  setPower(s, 'OPR');
  return s;
};

test('BST: legend, boresight circle, and only aircraft within visual range', () => {
  const s = scene();
  castle(s, 'fwd');
  const { ctx, texts, calls } = fakeCtx();
  drawHud(ctx, s, 300, 'monospace');
  assert.ok(texts.includes('BST'));
  assert.ok(calls.includes('arc'));
  assert.ok(texts.includes('4.0'));
  assert.ok(!texts.includes('30.0'));
});

test('VACQ draws its box; STT draws the lock box and LOCK', () => {
  const s = scene();
  castle(s, 'fwd');
  castle(s, 'aft');
  const a = fakeCtx();
  drawHud(a.ctx, s, 300, 'monospace');
  assert.ok(a.texts.includes('VACQ'));
  assert.ok(a.calls.includes('strokeRect'));
  lock(s, 'T');
  const b = fakeCtx();
  drawHud(b.ctx, s, 300, 'monospace');
  assert.ok(b.texts.includes('LOCK'));
  assert.ok(b.texts.includes('STT'));
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test lib/ddi/hud.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `hud.ts`.

- [ ] **Step 3: Write `lib/ddi/hud.ts`**

```ts
import type { Sim } from '../sim/types.ts';
import { ACM_PATTERNS, BEAMWIDTH_DEG, VISUAL_RANGE_NM } from '../sim/constants.ts';
import { lookAt } from '../sim/radar.ts';

const GREEN = '#6dff8a';

/** HUD window field of view, degrees off the nose (square: 64° × 64°). */
export const HUD_FOV = { az: 32, elLo: -16, elHi: 48 };

/** Forward view for close-in work: boresight cross, the ACM scan pattern, aircraft visible within 10 nm, the STT lock box. */
export function drawHud(ctx: CanvasRenderingContext2D, sim: Sim, size: number, font: string) {
  const r = sim.radar;
  const px = size / (HUD_FOV.elHi - HUD_FOV.elLo); // pixels per degree
  const X = (az: number) => size / 2 + az * px;
  const Y = (el: number) => (HUD_FOV.elHi - el) * px;
  const inView = (az: number, el: number) => Math.abs(az) <= HUD_FOV.az && el >= HUD_FOV.elLo && el <= HUD_FOV.elHi;

  ctx.save();
  ctx.fillStyle = '#030a05';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = GREEN;
  ctx.fillStyle = GREEN;
  ctx.lineWidth = Math.max(1, size / 250);
  ctx.font = `${size * 0.05}px ${font}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // Boresight cross: where the nose points
  const c = size * 0.03;
  ctx.beginPath();
  ctx.moveTo(X(0) - c, Y(0));
  ctx.lineTo(X(0) + c, Y(0));
  ctx.moveTo(X(0), Y(0) - c);
  ctx.lineTo(X(0), Y(0) + c);
  ctx.stroke();

  // ACM scan pattern (dashed)
  if (r.mode === 'ACM' && r.acm) {
    const p = ACM_PATTERNS[r.acm];
    const half = (BEAMWIDTH_DEG / 2) * px;
    ctx.setLineDash([size * 0.02, size * 0.015]);
    ctx.beginPath();
    if (r.acm === 'BST') {
      ctx.arc(X(0), Y(0), Math.max(half, size * 0.04), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(X(p.az[0]) - half, Y(p.el[1]) - half, (p.az[1] - p.az[0]) * px + 2 * half, (p.el[1] - p.el[0]) * px + 2 * half);
    }
    ctx.setLineDash([]);
  }

  // Aircraft you could see out of the canopy
  for (const t of sim.targets) {
    const g = lookAt(sim, t);
    if (g.range > VISUAL_RANGE_NM || !inView(g.az, g.el)) continue;
    const x = X(g.az);
    const y = Y(g.el);
    const d = size * 0.02;
    ctx.beginPath();
    ctx.moveTo(x, y - d);
    ctx.lineTo(x + d, y);
    ctx.lineTo(x, y + d);
    ctx.lineTo(x - d, y);
    ctx.closePath();
    ctx.stroke();
    ctx.fillText(g.range.toFixed(1), x, y + d * 2.2);
  }

  // STT lock box
  const stt = r.stt;
  const locked = r.mode === 'STT' && stt ? sim.targets.find((x) => x.id === stt.targetId) : undefined;
  if (locked) {
    const g = lookAt(sim, locked);
    if (inView(g.az, g.el)) {
      const b = size * 0.05;
      ctx.strokeRect(X(g.az) - b, Y(g.el) - b, 2 * b, 2 * b);
    }
    ctx.fillText('LOCK', size / 2, size * 0.94);
  }

  ctx.textAlign = 'left';
  ctx.fillText(r.mode === 'ACM' ? (r.acm ?? 'ACM') : r.mode, size * 0.05, size * 0.06);
  ctx.restore();
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS for all suites.

- [ ] **Step 5: Commit**

```bash
git add lib/ddi/hud.ts lib/ddi/hud.test.ts
git commit -m "feat(ddi): HUD window renderer with ACM patterns and visual contacts" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 5: Instructor map renderer

**Files:**
- Create: `lib/ddi/instructor.ts`
- Test: `lib/ddi/instructor.test.ts`

**Interfaces**

Consumes:
- `ACM_PATTERNS`, `MAX_ALT_FT`
- `scanEdges`, `altitudeCoverage`, `rad`, `lookAt`

Produces `drawInstructor(ctx, sim, w: number, font: string): void`:
- the canvas is `w × 1.5w`;
- the top `w × w` is the heading-up plan view;
- the bottom `w × 0.5w` is the side profile.

- [ ] **Step 1: Write the failing test `lib/ddi/instructor.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawInstructor } from './instructor.ts';
import { createSim } from '../sim/sim.ts';
import { makeTarget } from '../sim/world.ts';
import { castle, lock, setPower } from '../sim/radar.ts';

function fakeCtx() {
  const texts: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) =>
        key === 'fillText'
          ? (s: string) => { texts.push(s); }
          : key === 'measureText'
            ? (s: string) => ({ width: s.length * 6 })
            : () => {},
      set: () => true,
    },
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

const scene = () => {
  const s = createSim({
    targets: [
      makeTarget({ id: 'A', x: 0, y: 20, alt: 25000 }),
      makeTarget({ id: 'FAR', x: 0, y: 90, alt: 33000 }),
    ],
  });
  setPower(s, 'OPR');
  return s;
};

test('plan view and side view label the aircraft inside the radar scale', () => {
  const s = scene();
  const { ctx, texts } = fakeCtx();
  drawInstructor(ctx, s, 300, 'monospace');
  assert.ok(texts.includes('TRUTH · 40 NM'));
  assert.ok(texts.includes('SIDE VIEW · 0–50K FT'));
  assert.ok(texts.includes('25'));
  assert.ok(!texts.includes('33')); // 90 nm is beyond the 40 nm scale
});

test('draws in STT and ACM without throwing', () => {
  const s = scene();
  lock(s, 'A');
  drawInstructor(fakeCtx().ctx, s, 300, 'monospace');
  castle(s, 'fwd');
  drawInstructor(fakeCtx().ctx, s, 300, 'monospace');
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test lib/ddi/instructor.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `instructor.ts`.

- [ ] **Step 3: Write `lib/ddi/instructor.ts`**

```ts
import type { Sim, Target } from '../sim/types.ts';
import { ACM_PATTERNS, MAX_ALT_FT } from '../sim/constants.ts';
import { scanEdges } from '../sim/antenna.ts';
import { altitudeCoverage, rad } from '../sim/geometry.ts';
import { lookAt } from '../sim/radar.ts';

const INK = '#c7cfc8';
const FAINT = 'rgba(199,207,200,0.25)';
const SCAN = 'rgba(109,255,138,0.16)';
const GREEN = '#6dff8a';
const HOSTILE = '#ff7a6b';
const FRIENDLY = '#6db8ff';

/** Instructor ("truth") view on a w × 1.5w canvas. Top w × w: heading-up plan view. Bottom w × 0.5w: side profile.
 *  Unlike the DDI it shows where aircraft really are, coloured by side (hostile = red triangle, friendly = blue circle). */
export function drawInstructor(ctx: CanvasRenderingContext2D, sim: Sim, w: number, font: string) {
  const r = sim.radar;
  const own = sim.own;
  const R = r.rangeScale;
  const stt = r.stt;
  const locked = stt ? sim.targets.find((t) => t.id === stt.targetId) : undefined;
  const visible = sim.targets.filter((t) => {
    const g = lookAt(sim, t);
    return g.range <= R && Math.abs(g.az) <= 90;
  });
  const mark = (t: Target | null, x: number, y: number) => {
    const s = w * 0.018;
    ctx.fillStyle = t === null ? INK : t.side === 'hostile' ? HOSTILE : FRIENDLY;
    ctx.beginPath();
    if (t === null || t.side === 'hostile') {
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s, y + s);
      ctx.lineTo(x - s, y + s);
      ctx.closePath();
    } else ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.save();
  ctx.fillStyle = '#0b0d0c';
  ctx.fillRect(0, 0, w, w * 1.5);
  ctx.font = `${w * 0.04}px ${font}`;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(1, w / 300);

  // ---- Plan view: ownship bottom-centre, nose up; range rings at 25/50/75/100 % of the radar scale
  const cx = w / 2;
  const cy = w * 0.94;
  const rr = w * 0.86;
  const P = (az: number, d: number) => ({
    x: cx + (d / R) * rr * Math.sin(rad(az)),
    y: cy - (d / R) * rr * Math.cos(rad(az)),
  });
  const wedge = (lo: number, hi: number, d: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, Math.min(d / R, 1) * rr, rad(lo) - Math.PI / 2, rad(hi) - Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  };
  ctx.strokeStyle = FAINT;
  for (const f of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath();
    ctx.arc(cx, cy, f * rr, Math.PI, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = SCAN;
  if (r.mode === 'ACM' && r.acm) {
    const p = ACM_PATTERNS[r.acm];
    wedge(p.az[0] - 1.65, p.az[1] + 1.65, p.gate);
  } else if (r.mode !== 'STT') {
    const [lo, hi] = scanEdges(r);
    wedge(lo, hi, R);
  }
  if (r.power === 'OPR' && !r.sil) {
    // the beam: at the locked target in STT, otherwise the antenna azimuth
    const g = locked ? lookAt(sim, locked) : { az: r.antenna.az, range: R };
    const e = P(g.az, Math.min(g.range, R));
    ctx.strokeStyle = GREEN;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
  }
  for (const t of visible) {
    const g = lookAt(sim, t);
    const p = P(g.az, g.range);
    mark(t, p.x, p.y);
    // 1-minute velocity vector, relative to our nose
    const rel = rad(t.hdg - own.hdg);
    const len = (t.spd / 60 / R) * rr;
    ctx.strokeStyle = t.side === 'hostile' ? HOSTILE : FRIENDLY;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.sin(rel) * len, p.y - Math.cos(rel) * len);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(String(Math.round(t.alt / 1000)), p.x + w * 0.025, p.y);
  }
  mark(null, cx, cy);
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.fillText(`TRUTH · ${R} NM`, w * 0.03, w * 0.04);

  // ---- Side profile: range across, altitude up (0–50,000 ft); the slice of sky the scan covers
  const top = w;
  const h = w * 0.5;
  const PX = (d: number) => w * 0.05 + (d / R) * w * 0.9;
  const PY = (alt: number) => top + h * 0.92 - (alt / MAX_ALT_FT) * h * 0.8;
  ctx.strokeStyle = FAINT;
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(w, top);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, w, h);
  ctx.clip();
  if (r.mode === 'RWS' || r.mode === 'TWS') {
    const cov = altitudeCoverage(own.alt, R, r.elev, r.bars);
    ctx.fillStyle = SCAN;
    ctx.beginPath();
    ctx.moveTo(PX(0), PY(own.alt));
    ctx.lineTo(PX(R), PY(cov.hi * 1000));
    ctx.lineTo(PX(R), PY(cov.lo * 1000));
    ctx.closePath();
    ctx.fill();
  }
  if (locked) {
    ctx.strokeStyle = GREEN;
    ctx.beginPath();
    ctx.moveTo(PX(0), PY(own.alt));
    ctx.lineTo(PX(lookAt(sim, locked).range), PY(locked.alt));
    ctx.stroke();
  }
  for (const t of visible) mark(t, PX(lookAt(sim, t).range), PY(t.alt));
  mark(null, PX(0), PY(own.alt));
  ctx.restore();
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.fillText('SIDE VIEW · 0–50K FT', w * 0.03, top + h * 0.08);
  ctx.restore();
}
```

- [ ] **Step 4: Run the tests and type-check**

Run: `npm test`
Expected: PASS for all suites.

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add lib/ddi/instructor.ts lib/ddi/instructor.test.ts
git commit -m "feat(ddi): instructor truth map (plan view + side profile)" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 6: Cockpit — castle switch, HUD window, instructor map

**Files:**
- Create:
  - `components/cockpit/canvas.ts`
  - `components/cockpit/useKeyboard.ts`
  - `components/cockpit/HudWindow.tsx`
  - `components/cockpit/InstructorMap.tsx`
- Modify:
  - `lib/keys.ts`
  - `components/cockpit/StickGrip.tsx` (full replacement)
  - `components/cockpit/Cockpit.tsx` (full replacement)

**Interfaces**

Consumes:
- `castle`, `castlePress` (Task 2)
- `drawHud` (Task 4)
- `drawInstructor` (Task 5)

Produces:
- `fitCanvas(canvas: HTMLCanvasElement, ratio?: number): number`
- `useKeyboard(activeRef, press, release, releaseAll): void`
- `data-tut` hooks: `castle`, `undesignate`, `hud`, `map`

No unit test in this task: it is UI wiring over tested `lib/` code. Verify with build, lint and a browser check.

- [ ] **Step 1: Add the map key to `lib/keys.ts`**

In `KEYS`, directly after `pause: 'KeyP',`, add:

```ts
  map: 'KeyM',
```

- [ ] **Step 2: Write `components/cockpit/canvas.ts`**

```ts
/** Match a canvas' backing store to its CSS width × devicePixelRatio (height = width × ratio). Returns the width in device px. */
export function fitCanvas(canvas: HTMLCanvasElement, ratio = 1) {
  const w = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1));
  const h = Math.round(w * ratio);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return w;
}
```

- [ ] **Step 3: Write `components/cockpit/useKeyboard.ts`**

This is the keyboard effect that currently lives in `Cockpit.tsx`, moved here unchanged.

```ts
'use client';

import { useEffect, type RefObject } from 'react';
import { KEYS } from '@/lib/keys';

const HANDLED = new Set<string>(Object.values(KEYS));

/** Global keyboard → press/release of logical key codes, only while the cockpit is active. */
export function useKeyboard(
  activeRef: RefObject<boolean>,
  press: (code: string) => void,
  release: (code: string) => void,
  releaseAll: () => void,
) {
  useEffect(() => {
    // physical e.code -> logical code, so keyup releases what keydown pressed (+/- work on any layout)
    const logical = new Map<string, string>();
    const down = (e: KeyboardEvent) => {
      if (!activeRef.current || e.ctrlKey || e.metaKey || e.altKey) return; // keep browser shortcuts
      const code = e.key === '+' ? KEYS.faster : e.key === '-' ? KEYS.slower : e.code;
      if (!HANDLED.has(code) && !code.startsWith('Shift')) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (HANDLED.has(code)) e.preventDefault();
      logical.set(e.code, code);
      if (!e.repeat) press(code);
    };
    const up = (e: KeyboardEvent) => {
      const code = logical.get(e.code) ?? e.code;
      logical.delete(e.code);
      release(code); // always, so a key pressed before a modifier never sticks
      if (HANDLED.has(code) && activeRef.current && !(e.ctrlKey || e.metaKey || e.altKey)) e.preventDefault();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', releaseAll);
    };
  }, [activeRef, press, release, releaseAll]);
}
```

- [ ] **Step 4: Write `components/cockpit/HudWindow.tsx`**

```tsx
'use client';

import type { RefObject } from 'react';

export function HudWindow({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  return (
    <div data-tut="hud" className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-3">
      <h2 className="mb-2 text-[11px] tracking-[0.3em] text-ink/60">HUD · FORWARD VIEW</h2>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="HUD view: ACM scan pattern and aircraft within visual range"
        className="block aspect-square w-full rounded-md bg-black"
      />
    </div>
  );
}
```

- [ ] **Step 5: Write `components/cockpit/InstructorMap.tsx`**

```tsx
'use client';

import type { RefObject } from 'react';

export function InstructorMap({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  return (
    <div data-tut="map" className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-3">
      <h2 className="mb-2 text-[11px] tracking-[0.3em] text-ink/60">INSTRUCTOR MAP · TRUTH</h2>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Instructor map: true aircraft positions, the radar scan wedge and a side view of the scanned altitudes"
        className="block aspect-[2/3] w-full rounded-md bg-black"
      />
    </div>
  );
}
```

- [ ] **Step 6: Replace `components/cockpit/StickGrip.tsx`**

```tsx
'use client';

import { KEYS } from '@/lib/keys';
import { HoldButton, type GripProps } from './HoldButton';

export function StickGrip({ lit, press, release }: GripProps) {
  const b = (code: string, label: string, disabled = false) => (
    <HoldButton code={code} label={label} lit={lit.has(code)} press={press} release={release} disabled={disabled} />
  );
  return (
    <div data-tut="stick" className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-4">
      <h2 className="mb-3 text-[11px] tracking-[0.3em] text-ink/60">STICK · RIGHT HAND</h2>
      <p className="mb-1.5 text-[10px] tracking-widest text-ink/50">SENSOR CONTROL SWITCH</p>
      <div data-tut="castle" className="grid grid-cols-3 gap-1.5">
        <span />
        {b(KEYS.castleFwd, 'SCS ▲ ACM')}
        <span />
        {b(KEYS.castleLeft, 'SCS ◀ WACQ')}
        {b(KEYS.castlePress, 'SCS ● IFF')}
        {b(KEYS.castleRight, 'SCS ▶', true)}
        <span />
        {b(KEYS.castleAft, 'SCS ▼ VACQ')}
        <span />
      </div>
      <div data-tut="undesignate" className="mt-3 grid grid-cols-1">
        {b(KEYS.undesignate, 'UNDESIGNATE')}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {b('', 'WPN SEL', true)}
        {b('', 'TRIGGER', true)}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Replace `components/cockpit/Cockpit.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Mode, Power, Sim } from '@/lib/sim/types';
import { SIM_DT } from '@/lib/sim/constants';
import { createSim, step } from '@/lib/sim/sim';
import { makeTarget } from '@/lib/sim/world';
import { castle, castlePress, setPower, tdcDepress, undesignate } from '@/lib/sim/radar';
import { pushbuttons, type Pushbutton } from '@/lib/sim/pushbuttons';
import { drawDdi } from '@/lib/ddi/draw';
import { drawHud } from '@/lib/ddi/hud';
import { drawInstructor } from '@/lib/ddi/instructor';
import { KEYS } from '@/lib/keys';
import { fitCanvas } from './canvas';
import { useKeyboard } from './useKeyboard';
import { Ddi } from './Ddi';
import { ThrottleGrip } from './ThrottleGrip';
import { StickGrip } from './StickGrip';
import { RadarKnob } from './RadarKnob';
import { FlightStrip } from './FlightStrip';
import { HudWindow } from './HudWindow';
import { InstructorMap } from './InstructorMap';

// ponytail: fixed sandbox until free-play encounters land in Plan 5
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

type View = { pbs: Record<number, Pushbutton>; hdg: number; alt: number; spd: number; power: Power; mode: Mode };

const viewOf = (sim: Sim): View => ({
  pbs: pushbuttons(sim),
  hdg: sim.own.hdg,
  alt: sim.own.alt,
  spd: sim.own.spd,
  power: sim.radar.power,
  mode: sim.radar.mode,
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

export function Cockpit() {
  const [initial] = useState(() => {
    const sim = sandbox();
    return { sim, view: viewOf(sim) };
  });
  const simRef = useRef(initial.sim);
  const [view, setView] = useState(initial.view);
  const [lit, setLit] = useState<ReadonlySet<string>>(() => new Set());
  const [paused, setPaused] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [announcement, setAnnouncement] = useState({ text: '', n: 0 });
  const seenRef = useRef(0); // how far into sim.events the announcer has read
  const pressedRef = useRef(new Set<string>());
  const pausedRef = useRef(false);
  const activeRef = useRef(true);
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);

  const refresh = useCallback(() => setView(viewOf(simRef.current)), []);
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
      else ACTIONS[code]?.(simRef.current);
      setLit(new Set(pressed));
    },
    [togglePause, toggleMap],
  );
  const release = useCallback((code: string) => {
    if (pressedRef.current.delete(code)) setLit(new Set(pressedRef.current));
  }, []);
  const releaseAll = useCallback(() => {
    pressedRef.current.clear();
    setLit(new Set());
  }, []);
  const pressPb = useCallback(
    (n: number) => {
      pushbuttons(simRef.current)[n]?.press?.();
      refresh();
    },
    [refresh],
  );
  const changePower = useCallback(
    (p: Power) => {
      setPower(simRef.current, p);
      refresh();
    },
    [refresh],
  );

  // Keys and the sim run only while at least half of the cockpit (or half the viewport) is on screen.
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

  // Fixed-step simulation + drawing; React chrome refreshes at 10 Hz.
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
      if (activeRef.current && !pausedRef.current) {
        applyHeld(sim, pressedRef.current);
        acc += dt;
        while (acc >= SIM_DT) {
          step(sim);
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
      if (now - lastUi > 100) {
        lastUi = now;
        setView(viewOf(sim));
        const fresh = sim.events.slice(seenRef.current);
        seenRef.current = sim.events.length;
        if (fresh.length) setAnnouncement((a) => ({ text: fresh.map((e) => e.text).join('. '), n: a.n + 1 }));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const showHud = view.mode === 'ACM' || view.mode === 'STT';
  const chip = 'rounded border border-white/10 px-2 py-1 text-ink/80 hover:text-phosphor aria-pressed:text-phosphor';

  return (
    <section ref={sectionRef} aria-label="Cockpit" className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-2 text-xs tracking-widest">
        <span className="text-phosphor">APG-73 TRAINER · SANDBOX</span>
        <span aria-live="polite" className="truncate text-ink/80">
          {announcement.text}
          {announcement.n % 2 ? '​' : ''}
        </span>
        <div className="flex gap-2">
          <button type="button" aria-pressed={showMap} onMouseDown={(e) => e.preventDefault()} onClick={toggleMap} className={chip}>
            MAP · M
          </button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={togglePause} className={chip}>
            {paused ? 'PAUSED · P' : 'PAUSE · P'}
          </button>
        </div>
      </header>
      <div className="grid flex-1 items-center gap-6 p-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="order-2 flex flex-col items-center gap-4 lg:order-1 lg:items-end">
          <ThrottleGrip lit={lit} press={press} release={release} />
          <RadarKnob power={view.power} onChange={changePower} />
        </div>
        <div className="order-1 flex flex-col items-center gap-3 lg:order-2">
          <div className="w-[min(92vw,calc(100dvh-10rem))] lg:w-[min(52vw,calc(100dvh-10rem))]">
            <Ddi pbs={view.pbs} canvasRef={canvasRef} onPress={pressPb} />
          </div>
          <FlightStrip hdg={view.hdg} alt={view.alt} spd={view.spd} lit={lit} press={press} release={release} />
        </div>
        <div className="order-3 flex flex-col items-center gap-4 lg:items-start">
          <StickGrip lit={lit} press={press} release={release} />
          {showHud && <HudWindow canvasRef={hudRef} />}
          {showMap && <InstructorMap canvasRef={mapRef} />}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 8: Build, lint, test**

Run: `npm test`
Expected: all PASS.

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run lint`
Expected: no errors. If a React hooks rule fires, fix it; don't disable it.

Run: `npm run build`
Expected: `/` is static.

- [ ] **Step 9: Browser check**

Run `npm run dev`, or use the browser pane's `preview_start` with the `web` launch entry. Check each of these, with screenshots:

1. **Instructor map is on by default.** It shows:
   - the forward range rings and the scan wedge (140°);
   - the green beam line sweeping;
   - T1/T3 as red triangles and T2 as a blue circle, each with an altitude label and a velocity vector;
   - a side view with the shaded scan slice.
2. **Map toggle.** `M` (or the `MAP · M` button) hides and shows the map.
3. **Scan settings reshape the map.** Change AZ (PB19) and elevation (`R`/`F`): the wedge and the slice follow.
4. **ACM Boresight.** RADAR OPR, then `I`:
   - the DDI's PB5 reads `BST`;
   - the HUD window appears with the dashed boresight circle;
   - the map wedge narrows to the ACM gate.
5. **Auto-lock.** Fly until T1 is within 10 nm and on the nose (→/← with Shift for fine turns). BST locks it:
   - STT on the DDI;
   - `LOCK` and the box on the HUD;
   - the map's beam points at T1.
6. **Other ACM modes.** `U`, then `I`, then `J` → `WACQ` with a wide dashed box. `K` → `VACQ` with a tall box.
7. **Exit ACM.** `U` returns to the previous search mode.
8. **Console.** No errors.

- [ ] **Step 10: Commit**

```bash
git add lib/keys.ts components/cockpit
git commit -m "feat(cockpit): castle switch ACM, HUD window, toggleable instructor map" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Spec coverage for this plan

| Spec item | Task |
|---|---|
| ACM via castle: fwd = BST; inside ACM aft = VACQ, left = WACQ; other directions not simulated | 2, 6 |
| ACM patterns: BST 3.3°/10 nm, VACQ 6° × (−13…+46°)/5 nm, WACQ 60° × (−9…+6°)/10 nm; auto-lock into STT | 1, 2 |
| Undesignate exits ACM; ACM lock returns to the previous search mode | 2 |
| DDI in ACM: sub-mode legend and sweep | 3 |
| HUD window in ACM (and STT): pattern, aircraft within 10 nm, lock box | 4, 6 |
| Instructor map: heading-up plan view (scan wedge, true targets, range rings at the radar scale) plus side profile (scanned slice); toggle with `M`; on by default in the sandbox | 5, 6 |
| `data-tut` hooks for lessons: `castle`, `undesignate`, `hud`, `map` | 6 |
