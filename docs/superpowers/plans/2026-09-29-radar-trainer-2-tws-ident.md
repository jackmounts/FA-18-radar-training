# Hornet Radar Trainer — Plan 2: TWS, Trackfiles and Identification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Hornet's multi-target radar work on top of the Plan 1 RWS/STT core:
- Track While Scan (TWS) with trackfiles;
- the designation ladder (L&S ★, DT2 ◇, undesignate, RSET, AUTO/MAN scan centring);
- IFF / NCTR identification;
- HAFU symbols on the DDI.

**Architecture:**
- New pure modules:
  - `lib/sim/tracks.ts`: trackfile store (snapshot per target, dead reckoning, ageing, ranking).
  - `lib/sim/ident.ts`: IFF interrogation and NCTR.
- `lib/sim/radar.ts` grows into the full mode machine for RWS / TWS / STT.
- Events become structured (`SimEvent`). The UI announcer, and later the lesson runner and free play, read them from an append-only log.
- The renderer draws trackfiles as HAFU symbols, with L&S cues and the NCTR print.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, Tailwind v4, TypeScript, Node 25 `node --test` with native type stripping, npm.

**Spec:** `docs/superpowers/specs/2026-09-29-hornet-radar-trainer-design.md`, sections 2–3. **Research:** `docs/research/apg-73.md`, §3, §5–7.

**Sequence:** Plan 2 of 5. It requires Plan 1, which is merged on `main`. Plan 3 (ACM, HUD window, instructor map) builds on the names defined here.

## Global Constraints

**Stack and dependencies**
- Next.js 16 App Router + TypeScript + Tailwind v4.
- No extra runtime dependencies: no state library, no test framework, no shadcn.
- Static export (`output: 'export'` in `next.config.ts`).

**Tests**
- `npm test` = `node --test "lib/**/*.test.ts"`. Node 25 strips types. No Vitest/Jest.

**Code under `lib/` (type-stripping rules)**
- Relative imports include the `.ts` extension.
- Type-only imports use `import type`.
- No `enum`, `namespace`, or constructor parameter properties.
- Components import from `@/lib/...` without the extension.

**Conventions**
- Units: nm, ft, kt, degrees, seconds.
- Axes: x = east, y = north. Heading 0 = north, clockwise. Azimuth right = positive.
- Pushbuttons (PB) are numbered clockwise from the bottom of the left column:
  - PB1–5 left (bottom→top)
  - PB6–10 top (left→right)
  - PB11–15 right (top→bottom)
  - PB16–20 bottom (right→left); PB18 = MENU.

**Display and copy**
- Monochrome green `#6dff8a` on `#030a05`, font B612 Mono.
- English only; sim-agnostic copy (never mention DCS keybinds).

**Keys**

| Key | Function |
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

**Commits**
- Commit after every task.
- End each commit message with the Co-Authored-By trailer from your own session's attribution reminder (the model that wrote the commit).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `lib/sim/types.ts` | modify | `SimEvent`, `Track`, `SearchMode`, `Centering`, new `Radar`/`Stt` fields |
| `lib/sim/constants.ts` | modify | Track, TWS, IFF and NCTR tunables |
| `lib/sim/tracks.ts` | create | Trackfile store: update, dead reckoning, coast ageing, ranking |
| `lib/sim/ident.ts` | create | IFF (one 22° interrogation scan), NCTR print, identity changes |
| `lib/sim/radar.ts` | modify | RWS/TWS/STT mode machine, TDC and undesignate ladders, AUTO/MAN, RSET, STT→TWS, castle press |
| `lib/sim/pushbuttons.ts` | modify | TWS labels: PB5 mode toggle, PB10 TWS-from-STT, PB13 AUTO/MAN, PB14 RSET, PB15 NCTR |
| `lib/ddi/draw.ts` | modify | HAFU trackfiles with rank / ★ / ◇, L&S cues for TWS and STT, NCTR print |
| `components/cockpit/Cockpit.tsx` | modify | Structured-event announcer; castle press `O` → IFF |
| `components/cockpit/StickGrip.tsx` | modify | Enable the castle press |
| Tests | create or modify | `lib/sim/tracks.test.ts`, `lib/sim/tws.test.ts`, `lib/sim/ident.test.ts`; plus the existing `sim.test.ts`, `pushbuttons.test.ts` and `draw.test.ts` |

---

### Task 1: Structured events

**Files:**
- Modify: `lib/sim/types.ts`, `lib/sim/radar.ts`, `lib/sim/pushbuttons.ts`, `components/cockpit/Cockpit.tsx`
- Test: `lib/sim/sim.test.ts` (four assertions change)

**Interfaces:**
- Produces:
  - the `SimEvent` union, used by every later plan;
  - `breakLock(sim: Sim, kind: 'lockLost' | 'rts'): void` (was `breakLock(sim, reason: string)`).
- `sim.events` is append-only: consumers remember how far they have read.

- [ ] **Step 1: Update the tests to the structured API** (`lib/sim/sim.test.ts`)

Replace this line in the test `'TDC depress on a brick locks STT, auto-ranges, and undesignate returns to RWS'`:

```ts
  assert.match(s.events.at(-1)!, /^Locked: \d+ nm, angels 20$/);
```

with:

```ts
  assert.match(s.events.find((e) => e.kind === 'lock')!.text, /^Locked: \d+ nm, angels 20$/);
```

Replace each of the three lines `assert.equal(s.events.at(-1), 'Lock lost');` with:

```ts
  assert.equal(s.events.at(-1)?.kind, 'lockLost');
```

They are in the gimbal-limit test, the STT memory test and the STBY test.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test lib/sim/sim.test.ts`

Expected: FAIL. `.text` of a string is undefined, and the `kind` asserts see `undefined`.

- [ ] **Step 3: Add `SimEvent` to `lib/sim/types.ts`**

Insert directly above `export type Sim = {`:

```ts
/** Things that happened, in order. Append-only: each consumer (announcer, lessons, free play) keeps its own read index. */
export type SimEvent =
  | { kind: 'lock'; targetId: string; text: string }
  | { kind: 'lockLost'; text: string }
  | { kind: 'rts'; text: string }
  | { kind: 'ident'; targetId: string; ident: Ident; text: string }
  | { kind: 'nctr'; targetId: string; print: string; text: string };
```

Then, inside `Sim`, change `events: string[];` to:

```ts
  events: SimEvent[];
```

- [ ] **Step 4: Emit structured events in `lib/sim/radar.ts`**

1. In `lock`, replace the `sim.events.push(...)` line with:

```ts
  sim.events.push({ kind: 'lock', targetId, text: `Locked: ${Math.round(lookAt(sim, t).range)} nm, angels ${Math.round(t.alt / 1000)}` });
```

2. Replace the whole `breakLock` function with:

```ts
export function breakLock(sim: Sim, kind: 'lockLost' | 'rts') {
  sim.radar.mode = 'RWS';
  sim.radar.stt = null;
  sim.radar.looks = {};
  sim.events.push(kind === 'rts' ? { kind, text: 'Returned to search' } : { kind, text: 'Lock lost' });
}
```

3. In `undesignate`, change `breakLock(sim, 'Returned to search')` to `breakLock(sim, 'rts')`.
4. In `track` (two places) and in `stepRadar` (one place), change `breakLock(sim, 'Lock lost')` to `breakLock(sim, 'lockLost')`.

- [ ] **Step 5: Update `lib/sim/pushbuttons.ts`**

Change `press: () => breakLock(sim, 'Returned to search')` to:

```ts
press: () => breakLock(sim, 'rts')
```

- [ ] **Step 6: Announce every fresh event in `components/cockpit/Cockpit.tsx`**

1. Replace `const [announcement, setAnnouncement] = useState('');` with:

```tsx
  const [announcement, setAnnouncement] = useState({ text: '', n: 0 });
  const seenRef = useRef(0); // how far into sim.events the announcer has read
```

2. In the frame loop, replace:

```tsx
        const msg = sim.events.splice(0).at(-1);
        if (msg) setAnnouncement(msg);
```

with:

```tsx
        const fresh = sim.events.slice(seenRef.current);
        seenRef.current = sim.events.length;
        if (fresh.length) setAnnouncement((a) => ({ text: fresh.map((e) => e.text).join('. '), n: a.n + 1 }));
```

3. Replace the header span's content `{announcement}` with:

```tsx
          {announcement.text}
          {announcement.n % 2 ? '​' : ''}
```

The zero-width space alternates, so a repeated message such as a second "Lock lost" still changes the live region and gets read out.

- [ ] **Step 7: Run the tests and type-check**

Run: `npm test`
Expected: PASS, all 40.

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add lib/sim/types.ts lib/sim/radar.ts lib/sim/pushbuttons.ts lib/sim/sim.test.ts components/cockpit/Cockpit.tsx
git commit -m "refactor(sim): structured, append-only SimEvent log" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 2: Trackfile store

**Files:**
- Create: `lib/sim/tracks.ts`
- Modify: `lib/sim/types.ts`, `lib/sim/constants.ts`, `lib/sim/radar.ts` (two small edits)
- Test: `lib/sim/tracks.test.ts`

**Interfaces:**
- Produces:
  - `type Track = Kinematics & { targetId: string; t: number; rank: number }`
  - `Radar` gains `tracks: Track[]`, `ls: string | null`, `dt2: string | null`.
  - `Stt` becomes `{ targetId; memory; nctrTime: number; print: string | null }`.
  - `trackCoast(r: Pick<Radar, 'azWidth' | 'bars'>): number`
  - `updateTrack(r: Radar, t: Target, now: number): void`
  - `trackAt(tr: Track, now: number): Kinematics`
  - `pruneTracks(sim: Sim): void`
  - `rankTracks(sim: Sim): void`

- [ ] **Step 1: Extend `lib/sim/types.ts`**

1. Below `export type Brick = ...`, add:

```ts
/** A trackfile: what the radar believes about one target (a snapshot at its last detection). */
export type Track = Kinematics & { targetId: string; t: number; rank: number };
```

2. Replace `export type Stt = { targetId: string; memory: number };` with:

```ts
export type Stt = { targetId: string; memory: number; nctrTime: number; print: string | null };
```

3. Inside `Radar`, replace `bricks: Brick[];` with:

```ts
  bricks: Brick[];
  tracks: Track[];
```

4. Inside `Radar`, replace `stt: Stt | null;` with:

```ts
  ls: string | null; // launch-and-steering target (★)
  dt2: string | null; // secondary designated target (◇)
  stt: Stt | null;
```

- [ ] **Step 2: Add constants to `lib/sim/constants.ts`**

Replace the `// Tracking` block with:

```ts
// Tracking
export const STT_MEMORY_S = 3;
export const MAX_TRACKS = 10; // the real radar maintains 10 trackfiles
export const TRACK_MIN_COAST_S = 8; // ESTIMATE: shortest time a trackfile survives without a detection
```

- [ ] **Step 3: Keep `lib/sim/radar.ts` compiling**

1. In `defaultRadar()`, replace `bricks: [], looks: {}, stt: null, dataPage: false,` with:

```ts
    bricks: [], tracks: [], looks: {}, ls: null, dt2: null, stt: null, dataPage: false,
```

2. In `lock`, replace `r.stt = { targetId, memory: 0 };` with:

```ts
  r.stt = { targetId, memory: 0, nctrTime: 0, print: null };
```

- [ ] **Step 4: Write the failing test `lib/sim/tracks.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pruneTracks, rankTracks, trackAt, trackCoast, updateTrack } from './tracks.ts';
import { createSim } from './sim.ts';
import { makeTarget } from './world.ts';
import { MAX_TRACKS } from './constants.ts';

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('a detection creates a trackfile and a later one refreshes it', () => {
  const s = createSim();
  const t = makeTarget({ id: 'T1', x: 0, y: 20 });
  updateTrack(s.radar, t, 1);
  assert.equal(s.radar.tracks.length, 1);
  t.y = 19;
  updateTrack(s.radar, t, 5);
  assert.equal(s.radar.tracks.length, 1);
  assert.equal(s.radar.tracks[0].y, 19);
  assert.equal(s.radar.tracks[0].t, 5);
});

test('the radar keeps at most MAX_TRACKS trackfiles', () => {
  const s = createSim();
  for (let i = 0; i < MAX_TRACKS + 2; i++) updateTrack(s.radar, makeTarget({ id: `T${i}`, x: i, y: 20 }), 0);
  assert.equal(s.radar.tracks.length, MAX_TRACKS);
});

test('trackfiles are dead-reckoned from their last detection', () => {
  const k = trackAt({ targetId: 'T', x: 0, y: 0, alt: 20000, hdg: 90, spd: 360, t: 0, rank: 1 }, 10);
  near(k.x, 1);
  near(k.y, 0);
});

test('coast time is the longer of 8 s and 2.5 frames', () => {
  assert.equal(trackCoast({ azWidth: 140, bars: 4 }), 17.5);
  assert.equal(trackCoast({ azWidth: 20, bars: 2 }), 8);
});

test('stale trackfiles are dropped with their designations, but never the STT target', () => {
  const s = createSim();
  updateTrack(s.radar, makeTarget({ id: 'A', x: 0, y: 20 }), 0);
  updateTrack(s.radar, makeTarget({ id: 'B', x: 1, y: 20 }), 0);
  s.radar.ls = 'A';
  s.radar.dt2 = 'B';
  s.radar.stt = { targetId: 'B', memory: 0, nctrTime: 0, print: null };
  s.t = 30; // beyond the 17.5 s coast of the default 140°/4-bar scan
  pruneTracks(s);
  assert.deepEqual(s.radar.tracks.map((tr) => tr.targetId), ['B']);
  assert.equal(s.radar.ls, null);
  assert.equal(s.radar.dt2, 'B');
});

test('trackfiles are ranked by range, closest first', () => {
  const s = createSim();
  updateTrack(s.radar, makeTarget({ id: 'FAR', x: 0, y: 40 }), 0);
  updateTrack(s.radar, makeTarget({ id: 'NEAR', x: 0, y: 10 }), 0);
  rankTracks(s);
  const rank = (id: string) => s.radar.tracks.find((tr) => tr.targetId === id)!.rank;
  assert.equal(rank('NEAR'), 1);
  assert.equal(rank('FAR'), 2);
});
```

- [ ] **Step 5: Run it to see it fail**

Run: `node --test lib/sim/tracks.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `tracks.ts`.

- [ ] **Step 6: Write `lib/sim/tracks.ts`**

```ts
import type { Kinematics, Radar, Sim, Target, Track } from './types.ts';
import { MAX_TRACKS, TRACK_MIN_COAST_S } from './constants.ts';
import { frameTime } from './antenna.ts';
import { range, velocity } from './geometry.ts';

/** How long a trackfile survives without a new detection. */
export const trackCoast = (r: Pick<Radar, 'azWidth' | 'bars'>) =>
  Math.max(TRACK_MIN_COAST_S, 2.5 * frameTime(r.azWidth, r.bars));

/** Record a detection: the trackfile becomes a snapshot of the target now.
 *  ponytail: no Kalman filter; add one only if tracks look wrong. */
export function updateTrack(r: Radar, t: Target, now: number) {
  const snap: Track = { targetId: t.id, x: t.x, y: t.y, alt: t.alt, hdg: t.hdg, spd: t.spd, t: now, rank: 0 };
  const i = r.tracks.findIndex((tr) => tr.targetId === t.id);
  if (i >= 0) r.tracks[i] = { ...snap, rank: r.tracks[i].rank };
  else if (r.tracks.length < MAX_TRACKS) r.tracks.push(snap);
}

/** Where the trackfile says the target is now (dead-reckoned from the last detection). */
export function trackAt(tr: Track, now: number): Kinematics {
  const { vx, vy } = velocity(tr);
  const dt = now - tr.t;
  return { x: tr.x + (vx * dt) / 3600, y: tr.y + (vy * dt) / 3600, alt: tr.alt, hdg: tr.hdg, spd: tr.spd };
}

/** Drop trackfiles not refreshed within the coast time (never the STT target), and designations that lost their track. */
export function pruneTracks(sim: Sim) {
  const r = sim.radar;
  const coast = trackCoast(r);
  r.tracks = r.tracks.filter((tr) => sim.t - tr.t <= coast || tr.targetId === r.stt?.targetId);
  const alive = (id: string | null) => id !== null && r.tracks.some((tr) => tr.targetId === id);
  if (!alive(r.ls)) r.ls = null;
  if (!alive(r.dt2)) r.dt2 = null;
}

/** Rank 1 = closest trackfile (ponytail: range-only threat ranking). */
export function rankTracks(sim: Sim) {
  const d = (tr: Track) => range(sim.own, trackAt(tr, sim.t));
  [...sim.radar.tracks].sort((a, b) => d(a) - d(b)).forEach((tr, i) => {
    tr.rank = i + 1;
  });
}
```

- [ ] **Step 7: Run the tests and type-check**

Run: `npm test`
Expected: PASS, 46 tests.

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add lib/sim/types.ts lib/sim/constants.ts lib/sim/radar.ts lib/sim/tracks.ts lib/sim/tracks.test.ts
git commit -m "feat(sim): trackfile store with dead reckoning, coast ageing and range ranking" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 3: TWS mode and the designation ladder

**Files:**
- Modify: `lib/sim/types.ts` (full replacement), `lib/sim/constants.ts`, `lib/sim/radar.ts` (full replacement)
- Test: `lib/sim/tws.test.ts`

**Interfaces:**
- Consumes (Task 2): `pruneTracks`, `rankTracks`, `trackAt`, `updateTrack`.
- Produces (all in `radar.ts`):
  - `defaultRadar`, `cycle`, `transmitting`, `lookAt`, `setPower`, `lock`, `breakLock`, `tdcDepress`, `undesignate`, `stepCursor`, `stepRadar`; same signatures as before.
  - `barOptions(r: Radar): readonly number[]`
  - `azOptions(r: Radar): readonly number[]`
  - `clipScan(r: Radar): void`
  - `setSearchMode(sim: Sim, mode: SearchMode): void`
  - `sttToTws(sim: Sim): void`
  - `rset(sim: Sim): void`
  - `shownTracks(r: Radar): Track[]`
  - `pickTarget(sim: Sim): string | null`
- `Radar` gains:
  - `searchMode: SearchMode`: the search mode STT returns to;
  - `centering: Centering`: AUTO or MAN, default MAN;
  - `nctr: boolean`: default `true`.

- [ ] **Step 1: Replace `lib/sim/types.ts`**

```ts
export type Power = 'OFF' | 'STBY' | 'OPR';
export type Prf = 'MED' | 'HI' | 'INTL';
export type SearchMode = 'RWS' | 'TWS';
export type Mode = SearchMode | 'STT';
export type Centering = 'AUTO' | 'MAN';
export type Side = 'hostile' | 'friendly';
export type Ident = 'unknown' | 'ambiguous' | 'friendly' | 'hostile';

export type Leg =
  | { kind: 'straight'; seconds: number }
  | { kind: 'turnTo'; hdg: number }
  | { kind: 'climbTo'; alt: number }
  | { kind: 'beam'; seconds: number };

export type Kinematics = { x: number; y: number; alt: number; hdg: number; spd: number };
export type Ownship = Kinematics;

export type Target = Kinematics & {
  id: string;
  type: string;
  rcs: number;
  side: Side;
  iffReplies: boolean;
  legs: Leg[];
  legTime: number;
  ident: Ident;
};

export type Antenna = { az: number; el: number; bar: number; dir: 1 | -1; frame: number };
export type Brick = { targetId: string; az: number; range: number; t: number };

/** A trackfile: what the radar believes about one target (a snapshot at its last detection). */
export type Track = Kinematics & { targetId: string; t: number; rank: number };

export type Stt = { targetId: string; memory: number; nctrTime: number; print: string | null };

export type Radar = {
  power: Power;
  sil: boolean;
  mode: Mode;
  searchMode: SearchMode; // what STT returns to
  prf: Prf;
  azWidth: number;
  bars: number;
  rangeScale: number;
  age: number;
  scanCenter: number;
  elev: number;
  centering: Centering; // TWS scan centring
  nctr: boolean;
  antenna: Antenna;
  cursor: { u: number; v: number };
  bumpLatched: boolean;
  bricks: Brick[];
  tracks: Track[];
  looks: Record<string, string>;
  ls: string | null; // launch-and-steering target (★)
  dt2: string | null; // secondary designated target (◇)
  stt: Stt | null;
  dataPage: boolean;
};

/** Held controls: -1 / 0 / 1 per axis, set every frame from pressed keys and on-screen buttons. */
export type Held = { tdcX: number; tdcY: number; elev: number; turn: number; fine: boolean; climb: number; accel: number };

/** Things that happened, in order. Append-only: each consumer (announcer, lessons, free play) keeps its own read index. */
export type SimEvent =
  | { kind: 'lock'; targetId: string; text: string }
  | { kind: 'lockLost'; text: string }
  | { kind: 'rts'; text: string }
  | { kind: 'ident'; targetId: string; ident: Ident; text: string }
  | { kind: 'nctr'; targetId: string; print: string; text: string };

export type Sim = {
  t: number;
  own: Ownship;
  targets: Target[];
  radar: Radar;
  held: Held;
  rand: () => number;
  events: SimEvent[];
};
```

- [ ] **Step 2: Add the TWS limits to `lib/sim/constants.ts`**

Directly below the `PRFS` line, add:

```ts
// TWS keeps the frame near 3 s: no 1-bar scan, and azimuth capped per bar count
export const TWS_BARS: readonly number[] = [2, 4, 6];
export const TWS_MAX_AZ: Readonly<Record<number, number>> = { 2: 80, 4: 60, 6: 40 };
```

- [ ] **Step 3: Write the failing test `lib/sim/tws.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim, run } from './sim.ts';
import { makeTarget } from './world.ts';
import { lock, rset, setPower, setSearchMode, sttToTws, tdcDepress, undesignate } from './radar.ts';
import { range, relAz, toBscope } from './geometry.ts';
import { trackAt } from './tracks.ts';
import type { Sim } from './types.ts';

// three contacts 30 nm out, 12° apart, all hot
const trio = () => {
  const s = createSim({
    seed: 3,
    own: { spd: 300 },
    targets: [
      makeTarget({ id: 'L', x: -6.2, y: 29.4, spd: 300 }),
      makeTarget({ id: 'C', x: 0, y: 30, spd: 300 }),
      makeTarget({ id: 'R', x: 6.2, y: 29.4, spd: 300 }),
    ],
  });
  setPower(s, 'OPR');
  return s;
};

/** Put the cursor on a target's trackfile symbol. */
function aim(s: Sim, id: string) {
  const k = trackAt(s.radar.tracks.find((tr) => tr.targetId === id)!, s.t);
  s.radar.cursor = toBscope(relAz(s.own, k), range(s.own, k), s.radar.rangeScale);
}

const byRank = (s: Sim) => [...s.radar.tracks].sort((a, b) => a.rank - b.rank).map((tr) => tr.targetId);

test('entering TWS clips the scan to the ~3 s frame limits', () => {
  const s = trio();
  setSearchMode(s, 'TWS');
  assert.equal(s.radar.mode, 'TWS');
  assert.equal(s.radar.azWidth, 60);
  assert.equal(s.radar.bars, 4);
  s.radar.bars = 1;
  s.radar.azWidth = 140;
  setSearchMode(s, 'TWS');
  assert.equal(s.radar.bars, 2);
  assert.equal(s.radar.azWidth, 80);
});

test('detections build trackfiles (latent in RWS too)', () => {
  const s = trio();
  run(s, 8);
  assert.deepEqual(byRank(s).sort(), ['C', 'L', 'R']);
});

test('TDC ladder in TWS: trackfile → L&S, another → DT2, DT2 → L&S (swap), L&S → STT', () => {
  const s = trio();
  setSearchMode(s, 'TWS');
  run(s, 4);
  aim(s, 'C');
  tdcDepress(s);
  assert.equal(s.radar.ls, 'C');
  aim(s, 'L');
  tdcDepress(s);
  assert.equal(s.radar.dt2, 'L');
  aim(s, 'L');
  tdcDepress(s);
  assert.deepEqual([s.radar.ls, s.radar.dt2], ['L', 'C']);
  aim(s, 'L');
  tdcDepress(s);
  assert.equal(s.radar.mode, 'STT');
  assert.deepEqual(s.radar.tracks.map((tr) => tr.targetId), ['L']); // STT drops the other trackfiles
  assert.equal(s.radar.searchMode, 'TWS');
});

test('undesignate ladder in TWS: none → #1, L&S + DT2 → swap, L&S alone → next rank', () => {
  const s = trio();
  setSearchMode(s, 'TWS');
  run(s, 4);
  undesignate(s);
  assert.equal(s.radar.ls, byRank(s)[0]);
  aim(s, byRank(s)[2]);
  tdcDepress(s);
  assert.equal(s.radar.dt2, byRank(s)[2]);
  const before = [s.radar.ls, s.radar.dt2];
  undesignate(s);
  assert.deepEqual([s.radar.ls, s.radar.dt2], [before[1], before[0]]);
  rset(s);
  assert.deepEqual([s.radar.ls, s.radar.dt2], [null, null]);
  undesignate(s);
  undesignate(s);
  assert.equal(s.radar.ls, byRank(s)[1]);
});

test('STT returns to the search mode it came from; PB10 path drops to TWS with AUTO centring', () => {
  const s = trio();
  setSearchMode(s, 'TWS');
  run(s, 4);
  lock(s, 'C');
  undesignate(s);
  assert.equal(s.radar.mode, 'TWS');
  assert.equal(s.events.at(-1)?.kind, 'rts');
  lock(s, 'C');
  sttToTws(s);
  assert.equal(s.radar.mode, 'TWS');
  assert.equal(s.radar.centering, 'AUTO');
  assert.equal(s.radar.ls, 'C');
});

test('AUTO centring points the scan at the L&S; TDC on empty space then leaves it alone', () => {
  const s = trio();
  setSearchMode(s, 'TWS');
  run(s, 4);
  s.radar.ls = 'R';
  s.radar.centering = 'AUTO';
  run(s, 0.1);
  const k = trackAt(s.radar.tracks.find((tr) => tr.targetId === 'R')!, s.t);
  assert.ok(Math.abs(s.radar.scanCenter - relAz(s.own, k)) < 0.5);
  s.radar.cursor = toBscope(-40, 5, s.radar.rangeScale);
  const centre = s.radar.scanCenter;
  tdcDepress(s);
  assert.equal(s.radar.scanCenter, centre);
});

test('TWS cursor bumps respect the TWS azimuth limits', () => {
  const s = trio();
  setSearchMode(s, 'TWS'); // 60°/4B: allowed widths 20/40/60
  s.radar.cursor = { u: 0.99, v: 0.5 };
  s.held.tdcX = 1;
  run(s, 0.2);
  assert.equal(s.radar.azWidth, 20); // wraps past 60
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `node --test lib/sim/tws.test.ts`
Expected: FAIL: `setSearchMode` (and the other new names) are not exported by `radar.ts`.

- [ ] **Step 5: Replace `lib/sim/radar.ts`**

```ts
import type { Power, Radar, SearchMode, Sim, Target } from './types.ts';
import {
  AZ_WIDTHS, BAR_COUNTS, ELEV_RATE_DPS, GIMBAL_AZ_DEG, GIMBAL_EL_DEG, MAX_BRICKS, MAX_RANGE_NM, RANGE_SCALES,
  STT_MEMORY_S, TDC_HIT, TDC_RATE, TWS_BARS, TWS_MAX_AZ,
} from './constants.ts';
import { clamp, elevation, fromBscope, radialSpeed, range, relAz, toBscope } from './geometry.ts';
import { stepAntenna } from './antenna.ts';
import { barPrf, inBeam, inNotch, probability, r50 } from './detection.ts';
import { pruneTracks, rankTracks, trackAt, updateTrack } from './tracks.ts';

export function defaultRadar(): Radar {
  return {
    power: 'STBY', sil: false, mode: 'RWS', searchMode: 'RWS', prf: 'INTL',
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
  r.looks = {};
  clipScan(r);
}

export function lock(sim: Sim, targetId: string) {
  const t = sim.targets.find((x) => x.id === targetId);
  if (!t) return;
  const r = sim.radar;
  r.mode = 'STT';
  r.stt = { targetId, memory: 0, nctrTime: 0, print: null };
  r.bricks = [];
  r.looks = {};
  r.tracks = r.tracks.filter((tr) => tr.targetId === targetId); // STT drops the other trackfiles
  updateTrack(r, t, sim.t);
  r.ls = targetId;
  r.dt2 = null;
  sim.events.push({ kind: 'lock', targetId, text: `Locked: ${Math.round(lookAt(sim, t).range)} nm, angels ${Math.round(t.alt / 1000)}` });
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
 *  STT → back to search.
 *  TWS: nothing designated → #1-ranked becomes L&S; L&S + DT2 → swap; L&S alone → step through the ranks. */
export function undesignate(sim: Sim) {
  const r = sim.radar;
  if (r.mode === 'STT') return breakLock(sim, 'rts');
  if (r.mode !== 'TWS' || r.tracks.length === 0) return;
  const ranked = [...r.tracks].sort((a, b) => a.rank - b.rank);
  if (!r.ls) r.ls = ranked[0].targetId;
  else if (r.dt2) [r.ls, r.dt2] = [r.dt2, r.ls];
  else r.ls = ranked[(ranked.findIndex((tr) => tr.targetId === r.ls) + 1) % ranked.length].targetId;
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
  if (r.mode !== 'STT' && !auto) r.elev = clamp(r.elev + sim.held.elev * ELEV_RATE_DPS * dt, -GIMBAL_EL_DEG, GIMBAL_EL_DEG);
  if (!transmitting(r)) {
    if (r.mode === 'STT') breakLock(sim, 'lockLost');
    return;
  }
  if (r.mode === 'STT') track(sim, dt);
  else search(sim, dt);
}
```

- [ ] **Step 6: Run the tests and type-check**

Run: `node --test lib/sim/tws.test.ts`
Expected: PASS, 7 tests.

Run: `npm test`
Expected: PASS, all suites.

Run: `npx tsc --noEmit`
Expected: no output.

If a TWS test fails because a trackfile is missing, don't lengthen the run blindly. First print `s.radar.tracks` and `s.radar.antenna` for the failing seed. Each contact sits at about ±12° azimuth and 0° elevation, inside the 60°/4-bar scan. It gets a HI look and a MED look per 3 s frame.

- [ ] **Step 7: Commit**

```bash
git add lib/sim/types.ts lib/sim/constants.ts lib/sim/radar.ts lib/sim/tws.test.ts
git commit -m "feat(sim): TWS mode, designation and undesignate ladders, AUTO/MAN centring, RSET" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 4: IFF and NCTR identification

**Files:**
- Create: `lib/sim/ident.ts`
- Modify: `lib/sim/constants.ts`, `lib/sim/radar.ts` (three small edits)
- Test: `lib/sim/ident.test.ts`

**Interfaces:**
- Consumes (Task 2): `trackAt`.
- Produces, in `ident.ts`:
  - `iff(sim: Sim, t: Target): void`
  - `interrogate(sim: Sim, targetId: string): void`
  - `stepNctr(sim: Sim, dt: number): void`
- Produces, in `radar.ts`: `castlePress(sim: Sim): void`.
- Behaviour: `lock()` now interrogates the target automatically. Identity changes emit `{ kind: 'ident' }`; a print emits `{ kind: 'nctr' }`.

- [ ] **Step 1: Add constants to `lib/sim/constants.ts`**

Append:

```ts
// Identification
export const IFF_HALF_WIDTH_DEG = 11; // one IFF interrogation scan is 22° wide
export const NCTR_MAX_ASPECT_DEG = 30; // ESTIMATE: NCTR needs a nose-on view of the engines
export const NCTR_MAX_RANGE_NM = 25; // ESTIMATE
export const NCTR_TIME_S = 2; // ESTIMATE: time on target before a print appears
```

- [ ] **Step 2: Write the failing test `lib/sim/ident.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim, run } from './sim.ts';
import { makeTarget } from './world.ts';
import { castlePress, lock, setPower, setSearchMode } from './radar.ts';
import { iff } from './ident.ts';
import { range, relAz, toBscope } from './geometry.ts';
import { trackAt } from './tracks.ts';
import type { Sim, Target } from './types.ts';

// a friendly F-16 at about -13° and a hostile MiG-29 at about +14°: 27° apart, so one IFF scan can't cover both
const pair = () => {
  const s = createSim({
    seed: 5,
    own: { spd: 300 },
    targets: [
      makeTarget({ id: 'F', type: 'F-16', side: 'friendly', iffReplies: true, x: -5, y: 22, hdg: 170, spd: 300 }),
      makeTarget({ id: 'H', x: 5, y: 20, hdg: 190, spd: 300 }),
    ],
  });
  setPower(s, 'OPR');
  setSearchMode(s, 'TWS');
  run(s, 4);
  return s;
};

function aim(s: Sim, id: string) {
  const k = trackAt(s.radar.tracks.find((tr) => tr.targetId === id)!, s.t);
  s.radar.cursor = toBscope(relAz(s.own, k), range(s.own, k), s.radar.rangeScale);
}

const single = (t: Target) => {
  const s = createSim({ seed: 9, own: { spd: 300 }, targets: [t] });
  setPower(s, 'OPR');
  return s;
};

test('IFF: a reply means friendly, silence means ambiguous, and a hostile never downgrades', () => {
  const s = pair();
  const [f, h] = s.targets;
  iff(s, f);
  iff(s, h);
  assert.equal(f.ident, 'friendly');
  assert.equal(h.ident, 'ambiguous');
  h.ident = 'hostile';
  iff(s, h);
  assert.equal(h.ident, 'hostile');
  assert.equal(s.events.filter((e) => e.kind === 'ident').length, 2);
});

test('castle press interrogates only trackfiles within ±11° of the one under the cursor', () => {
  const s = pair();
  aim(s, 'F');
  castlePress(s);
  assert.equal(s.targets[0].ident, 'friendly');
  assert.equal(s.targets[1].ident, 'unknown');
});

test('locking interrogates automatically; NCTR prints the type nose-on inside 25 nm and confirms hostile', () => {
  const s = pair();
  lock(s, 'H');
  assert.equal(s.targets[1].ident, 'ambiguous');
  run(s, 2.2);
  assert.equal(s.radar.stt?.print, 'MIG-29');
  assert.equal(s.targets[1].ident, 'hostile');
  assert.ok(s.events.some((e) => e.kind === 'nctr'));
});

test('no NCTR print beyond 25 nm, off-aspect, or with NCTR switched off', () => {
  const far = single(makeTarget({ id: 'T', x: 0, y: 30, spd: 300 }));
  lock(far, 'T');
  run(far, 3);
  assert.equal(far.radar.stt?.print, null);

  const beam = single(makeTarget({ id: 'T', x: 0, y: 15, hdg: 90, spd: 300 }));
  lock(beam, 'T');
  run(beam, 2.5); // still inside the 3 s notch memory
  assert.equal(beam.radar.mode, 'STT');
  assert.equal(beam.radar.stt?.print, null);

  const off = single(makeTarget({ id: 'T', x: 0, y: 15, spd: 300 }));
  lock(off, 'T');
  off.radar.nctr = false;
  run(off, 3);
  assert.equal(off.radar.stt?.print, null);
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `node --test lib/sim/ident.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `ident.ts`.

- [ ] **Step 4: Write `lib/sim/ident.ts`**

```ts
import type { Ident, Sim, Target } from './types.ts';
import { IFF_HALF_WIDTH_DEG, NCTR_MAX_ASPECT_DEG, NCTR_MAX_RANGE_NM, NCTR_TIME_S } from './constants.ts';
import { aspect, range, relAz } from './geometry.ts';
import { trackAt } from './tracks.ts';

const WORD: Record<Ident, string> = { unknown: 'UNKNOWN', ambiguous: 'AMBIGUOUS', friendly: 'FRIENDLY', hostile: 'HOSTILE' };

// ponytail: identity lives on the target, not the trackfile; revisit if datalink is added
function setIdent(sim: Sim, t: Target, ident: Ident) {
  if (t.ident === ident) return;
  t.ident = ident;
  sim.events.push({ kind: 'ident', targetId: t.id, ident, text: `Contact ${Math.round(range(sim.own, t))} nm: ${WORD[ident]}` });
}

/** IFF: a reply means friendly, silence means ambiguous (it never downgrades a hostile). */
export function iff(sim: Sim, t: Target) {
  setIdent(sim, t, t.iffReplies ? 'friendly' : t.ident === 'hostile' ? 'hostile' : 'ambiguous');
}

/** One IFF scan, 22° wide, centred on the given trackfile: interrogates every trackfile inside it. */
export function interrogate(sim: Sim, targetId: string) {
  const tracks = sim.radar.tracks;
  const center = tracks.find((tr) => tr.targetId === targetId);
  if (!center) return;
  const az0 = relAz(sim.own, trackAt(center, sim.t));
  for (const tr of tracks) {
    if (Math.abs(relAz(sim.own, trackAt(tr, sim.t)) - az0) > IFF_HALF_WIDTH_DEG) continue;
    const t = sim.targets.find((x) => x.id === tr.targetId);
    if (t) iff(sim, t);
  }
}

/** NCTR in STT: nose-on and close enough for ~2 s → the type print appears; ambiguous + hostile print → hostile. */
export function stepNctr(sim: Sim, dt: number) {
  const stt = sim.radar.stt;
  if (!stt || !sim.radar.nctr || stt.print) return;
  const t = sim.targets.find((x) => x.id === stt.targetId);
  if (!t) return;
  const ok = aspect(sim.own, t) <= NCTR_MAX_ASPECT_DEG && range(sim.own, t) <= NCTR_MAX_RANGE_NM;
  stt.nctrTime = ok ? stt.nctrTime + dt : 0;
  if (stt.nctrTime < NCTR_TIME_S) return;
  stt.print = t.type;
  sim.events.push({ kind: 'nctr', targetId: t.id, print: t.type, text: `NCTR print: ${t.type}` });
  if (t.ident === 'ambiguous' && t.side === 'hostile') setIdent(sim, t, 'hostile');
}
```

- [ ] **Step 5: Wire identification into `lib/sim/radar.ts`**

1. Below the `tracks.ts` import line, add:

```ts
import { iff, interrogate, stepNctr } from './ident.ts';
```

2. In `lock`, add after the `sim.events.push(...)` line:

```ts
  iff(sim, t); // STT interrogates the L&S automatically
```

3. In `track`, add after the line `if (stt.memory > STT_MEMORY_S) return breakLock(sim, 'lockLost');`:

```ts
  stepNctr(sim, dt);
```

4. Add this exported function directly below `undesignate`:

```ts
/** Castle switch press: IFF-interrogate the target under the cursor (in STT: the locked target). */
export function castlePress(sim: Sim) {
  const r = sim.radar;
  if (!transmitting(r)) return;
  const id = r.mode === 'STT' ? (r.stt?.targetId ?? null) : pickTarget(sim);
  if (id) interrogate(sim, id);
}
```

- [ ] **Step 6: Run the tests and type-check**

Run: `npm test`
Expected: PASS, all suites.

The existing `sim.test.ts` still passes: its lock assertion looks up the `lock` event by kind, and no NCTR print happens beyond 25 nm.

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add lib/sim/ident.ts lib/sim/ident.test.ts lib/sim/constants.ts lib/sim/radar.ts
git commit -m "feat(sim): IFF interrogation scan, NCTR print and automatic IFF on lock" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 5: Pushbuttons for TWS, RSET and NCTR

**Files:**
- Modify: `lib/sim/pushbuttons.ts` (full replacement)
- Test: `lib/sim/pushbuttons.test.ts` (append 4 tests)

**Interfaces:**
- Consumes (Task 3): `azOptions`, `barOptions`, `breakLock`, `clipScan`, `cycle`, `rset`, `setSearchMode`, `sttToTws`.
- Produces: `pushbuttons(sim)`. It keeps the same signature, and new labels appear at PB5, PB10 (in STT), PB13 (TWS), PB14 and PB15.

- [ ] **Step 1: Append the failing tests to `lib/sim/pushbuttons.test.ts`**

```ts
test('PB5 toggles RWS ↔ TWS; TWS shows AUTO/MAN at PB13 and no ERASE', () => {
  const s = createSim();
  pushbuttons(s)[5].press!();
  assert.equal(s.radar.mode, 'TWS');
  const pbs = pushbuttons(s);
  assert.equal(pbs[5].label, 'TWS');
  assert.equal(pbs[13].label, 'MAN');
  assert.equal(pbs[8], undefined);
  pbs[13].press!();
  assert.equal(s.radar.centering, 'AUTO');
  pushbuttons(s)[5].press!();
  assert.equal(s.radar.mode, 'RWS');
});

test('TWS bar and azimuth buttons stay inside the frame limits', () => {
  const s = createSim();
  pushbuttons(s)[5].press!(); // TWS: 60°/4B
  pushbuttons(s)[19].press!();
  assert.equal(s.radar.azWidth, 20);
  pushbuttons(s)[19].press!();
  pushbuttons(s)[19].press!();
  assert.equal(s.radar.azWidth, 60);
  pushbuttons(s)[6].press!();
  assert.equal(s.radar.bars, 6);
  assert.equal(s.radar.azWidth, 40); // 6 bars cap the scan at 40°
  pushbuttons(s)[6].press!();
  assert.equal(s.radar.bars, 2);
});

test('RSET clears the designations; NCTR is boxed and toggles', () => {
  const s = createSim();
  s.radar.ls = 'A';
  s.radar.dt2 = 'B';
  pushbuttons(s)[14].press!();
  assert.deepEqual([s.radar.ls, s.radar.dt2], [null, null]);
  assert.equal(pushbuttons(s)[15].boxed, true);
  pushbuttons(s)[15].press!();
  assert.equal(s.radar.nctr, false);
});

test('in STT, PB10 drops to TWS with AUTO centring on the locked target', () => {
  const s = createSim({ targets: [makeTarget({ id: 'T1', x: 0, y: 20 })] });
  setPower(s, 'OPR');
  lock(s, 'T1');
  const pbs = pushbuttons(s);
  assert.equal(pbs[10].label, 'TWS');
  pbs[10].press!();
  assert.equal(s.radar.mode, 'TWS');
  assert.equal(s.radar.centering, 'AUTO');
  assert.equal(s.radar.ls, 'T1');
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test lib/sim/pushbuttons.test.ts`
Expected: FAIL. PB5 has no `press` in RWS, so `press!()` throws "is not a function".

- [ ] **Step 3: Replace `lib/sim/pushbuttons.ts`**

```ts
import type { Sim } from './types.ts';
import { AGE_OPTIONS, PRFS, RANGE_SCALES } from './constants.ts';
import { barPrf } from './detection.ts';
import { azOptions, barOptions, breakLock, clipScan, cycle, rset, setSearchMode, sttToTws } from './radar.ts';

export type Pushbutton = { label: string; boxed?: boolean; press?: () => void };

/** DDI pushbutton labels and actions for the current radar state (A/A radar attack format). */
export function pushbuttons(sim: Sim): Record<number, Pushbutton> {
  const r = sim.radar;
  const pbs: Record<number, Pushbutton> = { 18: { label: 'MENU' } };
  if (r.dataPage) {
    pbs[10] = { label: `AGE\n${r.age}`, press: () => { r.age = cycle(AGE_OPTIONS, r.age); } };
    pbs[16] = { label: 'DATA', boxed: true, press: () => { r.dataPage = false; } };
    return pbs;
  }
  const stt = r.mode === 'STT';
  pbs[1] = {
    label: r.prf === 'INTL' ? `${barPrf(r.prf, r.antenna.bar, r.antenna.frame)}\nINTL` : r.prf,
    press: () => { r.prf = cycle(PRFS, r.prf); },
  };
  pbs[5] = stt
    ? { label: `RTS\n${r.searchMode}`, press: () => breakLock(sim, 'rts') }
    : { label: r.mode, press: () => setSearchMode(sim, r.mode === 'RWS' ? 'TWS' : 'RWS') };
  pbs[6] = {
    label: `${r.bars}B ${r.antenna.bar + 1}`,
    press: stt ? undefined : () => { r.bars = cycle(barOptions(r), r.bars); clipScan(r); },
  };
  pbs[7] = { label: 'SIL', boxed: r.sil, press: () => { r.sil = !r.sil; } };
  pbs[14] = { label: 'RSET', press: () => rset(sim) };
  pbs[15] = { label: 'NCTR', boxed: r.nctr, press: () => { r.nctr = !r.nctr; } };
  pbs[16] = { label: 'DATA', press: () => { r.dataPage = true; } };
  if (stt) {
    pbs[10] = { label: 'TWS', press: () => sttToTws(sim) };
    return pbs;
  }
  if (r.mode === 'RWS') pbs[8] = { label: 'ERASE', press: () => { r.bricks = []; } };
  else pbs[13] = { label: r.centering, press: () => { r.centering = r.centering === 'AUTO' ? 'MAN' : 'AUTO'; } };
  pbs[11] = { label: '↑', press: () => { r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, 1); } };
  pbs[12] = { label: '↓', press: () => { r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, -1); } };
  pbs[19] = { label: `${r.azWidth}°`, press: () => { r.azWidth = cycle(azOptions(r), r.azWidth); } };
  return pbs;
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS, all suites, including the 4 new pushbutton tests.

- [ ] **Step 5: Commit**

```bash
git add lib/sim/pushbuttons.ts lib/sim/pushbuttons.test.ts
git commit -m "feat(ddi): TWS mode toggle, AUTO/MAN, RSET, NCTR and STT→TWS pushbuttons" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 6: HAFU trackfiles, L&S cues and NCTR print on the DDI

**Files:**
- Modify: `lib/ddi/draw.ts` (full replacement)
- Test: `lib/ddi/draw.test.ts` (append 2 tests)

**Interfaces:**
- Consumes:
  - Task 3: `shownTracks`, `transmitting`.
  - Task 2: `trackAt`.
  - Existing geometry: `rad`, `range`, `relAz`.
- Produces: `drawDdi` and `hafu`, with unchanged signatures.

- [ ] **Step 1: Append the failing tests to `lib/ddi/draw.test.ts`**

1. Add these imports at the top, next to the existing ones:

```ts
import { setSearchMode } from '../sim/radar.ts';
import { rankTracks, updateTrack } from '../sim/tracks.ts';
```

2. Append the tests:

```ts
test('TWS frame draws ranked trackfiles, the L&S star and its data', () => {
  const s = createSim({
    targets: [makeTarget({ id: 'A', x: -3, y: 20, alt: 24000 }), makeTarget({ id: 'B', x: 3, y: 25 })],
  });
  setPower(s, 'OPR');
  setSearchMode(s, 'TWS');
  for (const t of s.targets) updateTrack(s.radar, t, 0);
  rankTracks(s);
  s.radar.ls = 'A';
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  for (const want of ['TWS', 'MAN', 'RSET', 'NCTR', '★', '2', '24', '180°']) assert.ok(texts.includes(want), `missing ${want}`);
});

test('STT frame shows the NCTR print once available', () => {
  const s = createSim({ targets: [makeTarget({ id: 'T1', x: 0, y: 20 })] });
  setPower(s, 'OPR');
  lock(s, 'T1');
  s.radar.stt!.print = 'MIG-29';
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  assert.ok(texts.includes('NCTR MIG-29'));
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test lib/ddi/draw.test.ts`
Expected: FAIL: `missing ★` (TWS trackfiles aren't drawn yet) and `NCTR MIG-29` is missing.

- [ ] **Step 3: Replace `lib/ddi/draw.ts`**

```ts
import type { Ident, Kinematics, Sim } from '../sim/types.ts';
import { GIMBAL_EL_DEG } from '../sim/constants.ts';
import { altitudeCoverage, closure, fromBscope, hdg3, mach, rad, range, relAz, toBscope } from '../sim/geometry.ts';
import { shownTracks, transmitting } from '../sim/radar.ts';
import { trackAt } from '../sim/tracks.ts';
import { pushbuttons } from '../sim/pushbuttons.ts';
import { REGION, pbPlace } from './layout.ts';

const GREEN = '#6dff8a';
const BG = '#030a05';

const hdgText = (h: number) => `${hdg3(h)}°`;

/** Top half of a HAFU symbol (expects the caller to have set stroke/fill style, font and textBaseline, as drawDdi does): chevron = hostile, arc = friendly, box = unknown, box + bold top = ambiguous. */
export function hafu(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ident: Ident, center: string) {
  ctx.beginPath();
  if (ident === 'hostile') {
    ctx.moveTo(x - s, y);
    ctx.lineTo(x, y - s * 1.3);
    ctx.lineTo(x + s, y);
  } else if (ident === 'friendly') {
    ctx.arc(x, y, s, Math.PI, 0);
  } else {
    ctx.moveTo(x - s, y);
    ctx.lineTo(x - s, y - s);
    ctx.lineTo(x + s, y - s);
    ctx.lineTo(x + s, y);
  }
  ctx.stroke();
  if (ident === 'ambiguous') ctx.fillRect(x - s, y - s * 1.15, s * 2, s * 0.3);
  ctx.textAlign = 'center';
  ctx.fillText(center, x, y - s * 0.5);
}

/** "Iron Cross": the radar is not transmitting. */
function ironCross(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.lineTo(x + s, y);
  ctx.moveTo(x, y - s);
  ctx.lineTo(x, y + s);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.moveTo(x + dx * s - dy * s * 0.35, y + dy * s - dx * s * 0.35);
    ctx.lineTo(x + dx * s + dy * s * 0.35, y + dy * s + dx * s * 0.35);
  }
  ctx.stroke();
}

/** Draws the A/A radar attack format (B-scope). `size` is the canvas edge in device pixels. */
export function drawDdi(ctx: CanvasRenderingContext2D, sim: Sim, size: number, font: string) {
  const r = sim.radar;
  const own = sim.own;
  const fs = size * 0.03;
  const tick = size * 0.015;
  const X = (u: number) => (REGION.x0 + u * (REGION.x1 - REGION.x0)) * size;
  const Y = (v: number) => (REGION.y0 + v * (REGION.y1 - REGION.y0)) * size;
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  };
  const text = (s: string, x: number, y: number, align: CanvasTextAlign = 'left') => {
    ctx.textAlign = align;
    const lines = s.split('\n');
    lines.forEach((l, i) => ctx.fillText(l, x, y + (i - (lines.length - 1) / 2) * fs * 1.15));
  };

  ctx.save();
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = GREEN;
  ctx.fillStyle = GREEN;
  ctx.lineWidth = Math.max(1, size / 400);
  ctx.shadowColor = GREEN;
  ctx.shadowBlur = size / 120;
  ctx.font = `${fs}px ${font}`;
  ctx.textBaseline = 'middle';

  // Tactical region with azimuth ticks (0, ±30, ±60°) and range ticks (25/50/75 %)
  ctx.strokeRect(X(0), Y(0), X(1) - X(0), Y(1) - Y(0));
  ctx.beginPath();
  for (const az of [-60, -30, 0, 30, 60]) {
    const x = X(toBscope(az, 0, 1).u);
    line(x, Y(0), x, Y(0) + tick);
    line(x, Y(1), x, Y(1) - tick);
  }
  for (const f of [0.25, 0.5, 0.75]) {
    line(X(0), Y(f), X(0) + tick, Y(f));
    line(X(1), Y(f), X(1) - tick, Y(f));
  }
  for (const e of [-30, -20, -10, 0, 10, 20, 30]) {
    const y = Y(0.5 - e / (2 * GIMBAL_EL_DEG)); // elevation scale, same mapping as the caret
    line(X(0), y, X(0) + tick * 0.6, y);
  }
  ctx.stroke();

  // Legends around the region
  const top = Y(0) - fs * 1.2;
  const bottom = Y(1) + fs * 1.6;
  text(r.power === 'OPR' && r.sil ? 'SIL' : r.power, X(0), top);
  text(hdgText(own.hdg), size / 2, top, 'center');
  text(String(r.rangeScale), size * 0.98, top, 'right');
  // TDC-ownership diamond: the TDC is always owned by this display in the baseline
  const dx = size * 0.98 - fs * 2.2;
  const dh = fs * 0.35;
  ctx.beginPath();
  ctx.moveTo(dx, top - dh);
  ctx.lineTo(dx + dh, top);
  ctx.lineTo(dx, top + dh);
  ctx.lineTo(dx - dh, top);
  ctx.closePath();
  ctx.stroke();
  text(`M ${mach(own.spd, own.alt).toFixed(2)}\n${Math.round(own.spd)}`, X(0), bottom);
  text(String(Math.round(own.alt)), X(1), bottom, 'right');

  // Pushbutton labels next to their buttons
  for (const [n, pb] of Object.entries(pushbuttons(sim))) {
    const { side, t } = pbPlace(Number(n));
    const align: CanvasTextAlign = side === 'left' ? 'left' : side === 'right' ? 'right' : 'center';
    const x = (side === 'left' ? 0.02 : side === 'right' ? 0.98 : t) * size;
    const y = (side === 'top' ? 0.045 : side === 'bottom' ? 0.955 : t) * size;
    text(pb.label, x, y, align);
    if (pb.boxed) {
      const lines = pb.label.split('\n');
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + fs * 0.5;
      const h = lines.length * fs * 1.15 + fs * 0.2;
      const bx = align === 'left' ? x - fs * 0.25 : align === 'right' ? x - w + fs * 0.25 : x - w / 2;
      ctx.strokeRect(bx, y - h / 2, w, h);
    }
  }

  // Horizon line and velocity vector (static: the flight model has no pitch or roll)
  const hx = size / 2;
  const hy = size * 0.39;
  const hr = size * 0.012;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  line(size * 0.33, hy, hx - hr * 1.6, hy);
  line(hx + hr * 1.6, hy, size * 0.67, hy);
  line(hx, hy - hr, hx, hy - hr * 2.2);
  ctx.stroke();

  // Elevation caret "<" on the left edge (±60° over the full height)
  const el = r.mode === 'STT' ? r.antenna.el : r.elev;
  const cy = Y(0.5 - el / (2 * GIMBAL_EL_DEG));
  ctx.beginPath();
  line(X(0) + tick * 1.6, cy - tick * 0.6, X(0) + tick * 0.5, cy);
  line(X(0) + tick * 0.5, cy, X(0) + tick * 1.6, cy + tick * 0.6);
  ctx.stroke();

  if (!transmitting(r)) {
    ironCross(ctx, X(0) + size * 0.04, Y(1) - size * 0.04, size * 0.022);
  } else {
    // B-sweep: the antenna's azimuth
    const sx = X(toBscope(r.antenna.az, 0, 1).u);
    ctx.beginPath();
    line(sx, Y(0), sx, Y(1));
    ctx.stroke();
  }

  if (r.mode === 'RWS') {
    // Raw hits ("bricks") fade with age
    for (const b of r.bricks) {
      const p = toBscope(b.az, b.range, r.rangeScale);
      if (p.v < 0) continue;
      ctx.globalAlpha = Math.max(0.15, 1 - (sim.t - b.t) / r.age);
      ctx.fillRect(X(p.u) - size * 0.009, Y(p.v) - size * 0.005, size * 0.018, size * 0.01);
    }
    ctx.globalAlpha = 1;
  }
  if (r.mode === 'RWS' || r.mode === 'TWS') {
    // Acquisition cursor with the altitude coverage at its range
    const cx = X(r.cursor.u);
    const cyc = Y(r.cursor.v);
    const gap = size * 0.01;
    const half = size * 0.012;
    ctx.beginPath();
    line(cx - gap, cyc - half, cx - gap, cyc + half);
    line(cx + gap, cyc - half, cx + gap, cyc + half);
    ctx.stroke();
    const cov = altitudeCoverage(own.alt, fromBscope(r.cursor.u, r.cursor.v, r.rangeScale).range, r.elev, r.bars);
    text(String(cov.hi), cx, cyc - half - fs * 0.7, 'center');
    text(String(cov.lo), cx, cyc + half + fs * 0.7, 'center');
  }

  /** A HAFU symbol with its stem (direction of travel, up = same way as us); Mach and altitude beside ★ / ◇. Returns its y, or null if off-scope. */
  const symbol = (k: Kinematics, ident: Ident, center: string) => {
    const p = toBscope(relAz(own, k), range(own, k), r.rangeScale);
    if (p.u < 0 || p.u > 1 || p.v < 0 || p.v > 1) return null;
    const x = X(p.u);
    const y = Y(p.v);
    const s = size * 0.022;
    hafu(ctx, x, y, s, ident, center);
    const rel = rad(k.hdg - own.hdg);
    ctx.beginPath();
    line(x, y, x + Math.sin(rel) * s * 2.2, y - Math.cos(rel) * s * 2.2);
    ctx.stroke();
    if (center === '★' || center === '◇') {
      text(mach(k.spd, k.alt).toFixed(1), x - s * 1.4, y - s * 0.5, 'right');
      text(String(Math.round(k.alt / 1000)), x + s * 1.4, y - s * 0.5);
    }
    return y;
  };
  /** L&S cues: target ground track, altitude difference by the caret, range caret with closure. */
  const lsCues = (k: Kinematics, y: number) => {
    text(hdgText(k.hdg), X(0) + fs * 0.4, Y(0) + fs);
    text(String(Math.round((k.alt - own.alt) / 1000)), X(0) + tick * 2.2, cy);
    ctx.beginPath();
    line(X(1) - tick * 1.6, y - tick * 0.6, X(1) - tick * 0.5, y);
    line(X(1) - tick * 0.5, y, X(1) - tick * 1.6, y + tick * 0.6);
    ctx.stroke();
    text(String(Math.round(closure(own, k))), X(1) - tick * 2.2, y, 'right');
  };
  const targetOf = (id: string) => sim.targets.find((x) => x.id === id);

  const stt = r.stt;
  if (r.mode === 'STT' && stt) {
    const t = targetOf(stt.targetId);
    if (t) {
      const y = symbol(t, t.ident, '★');
      if (y !== null) lsCues(t, y);
    }
    if (stt.memory > 0) text('MEM', size / 2, Y(1) - fs, 'center');
    if (stt.print) text(`NCTR ${stt.print}`, size / 2, Y(1) - fs * 2.3, 'center');
  } else if (r.mode === 'RWS' || r.mode === 'TWS') {
    for (const tr of shownTracks(r)) {
      const t = targetOf(tr.targetId);
      if (!t) continue;
      const k = trackAt(tr, sim.t);
      const center = tr.targetId === r.ls ? '★' : tr.targetId === r.dt2 ? '◇' : String(tr.rank);
      const y = symbol(k, t.ident, center);
      if (y !== null && tr.targetId === r.ls) lsCues(k, y);
    }
  }
  ctx.restore();
}
```

- [ ] **Step 4: Run the tests and type-check**

Run: `npm test`
Expected: PASS, all suites; `draw.test.ts` now has 5 tests.

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add lib/ddi/draw.ts lib/ddi/draw.test.ts
git commit -m "feat(ddi): HAFU trackfiles with rank/L&S/DT2, L&S cues in TWS and STT, NCTR print" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 7: Cockpit wiring and browser check

**Files:**
- Modify: `components/cockpit/Cockpit.tsx`, `components/cockpit/StickGrip.tsx`

**Interfaces:**
- Consumes (Task 4): `castlePress`.

- [ ] **Step 1: Castle press → IFF in `components/cockpit/Cockpit.tsx`**

1. Change the radar import line to:

```tsx
import { castlePress, setPower, tdcDepress, undesignate } from '@/lib/sim/radar';
```

2. In `press`, replace:

```tsx
      else if (code === KEYS.undesignate) undesignate(sim);
```

with:

```tsx
      else if (code === KEYS.undesignate) undesignate(sim);
      else if (code === KEYS.castlePress) castlePress(sim);
```

- [ ] **Step 2: Enable the castle press in `components/cockpit/StickGrip.tsx`**

Change `{b(KEYS.castlePress, 'SCS ●', true)}` to:

```tsx
        {b(KEYS.castlePress, 'SCS ● IFF')}
```

The four castle directions stay disabled until Plan 3.

- [ ] **Step 3: Build, lint, test**

Run: `npm test`
Expected: all PASS.

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: `/` static.

- [ ] **Step 4: Browser check**

Start the dev server: `npm run dev`, or the browser pane's `preview_start` with the `web` entry in `.claude/launch.json`. Confirm each item with a screenshot:

1. **Radar on:** RADAR → OPR. Bricks appear for T1 and T2 within about 15 s.
2. **Enter TWS:** press PB5 (top of the left column). The label reads `TWS`, the azimuth reads `60°`, and PB13 reads `MAN`. Each contact shows a HAFU box with a rank number and a stem.
3. **Designate:** cursor on a trackfile, then `Space` → ★ with Mach/altitude beside it, plus the range caret and closure on the right edge. `Space` on another trackfile → ◇. `U` → they swap. PB14 `RSET` → both are cleared.
4. **IFF:** cursor on the T2 (friendly) trackfile, then `O` → it becomes an arc, and the status bar announces `Contact … nm: FRIENDLY`. `O` on T1 → box with a bold top (AMBIGUOUS).
5. **NCTR:** lock T1 (`Space` twice) and wait until it is inside 25 nm and nose-on. `NCTR MIG-29` appears at the bottom of the display, the symbol turns into a chevron (HOSTILE), and both events are announced.
6. **STT → TWS:** in STT, PB10 `TWS` → TWS with AUTO centring following the ★. The scan centre tracks the target.
7. **Console:** no errors.

- [ ] **Step 5: Commit**

```bash
git add components/cockpit/Cockpit.tsx components/cockpit/StickGrip.tsx
git commit -m "feat(cockpit): castle press interrogates IFF" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Spec coverage for this plan

| Spec item | Task |
|---|---|
| TWS mode, ≤3 s frame limits clipped on entry, TWS azimuth/bar/bump limits | 3, 5 |
| Trackfiles: max 10, snapshot + dead reckoning, coast `max(8 s, 2.5 frames)`, rank by range, STT drops the others | 2, 3 |
| TDC ladder (trackfile → L&S / DT2, DT2 ↔ L&S, L&S → STT), empty space → scan centre (RWS, TWS MAN) | 3 |
| Undesignate ladder (none → #1, swap, step), STT → return to `searchMode` | 3 |
| AUTO/MAN centring (PB13), RSET (PB14), NCTR toggle (PB15), STT → TWS (PB10) | 3, 5 |
| IFF: castle press, 22° interrogation scan; automatic IFF on lock; identity stored on the target | 4, 7 |
| NCTR print: STT, NCTR on, ±30° aspect, ≤25 nm, ~2 s; ambiguous + hostile print → hostile | 4 |
| HAFU symbols (box / bold box / arc / chevron) with rank / ★ / ◇, stem, Mach/altitude, L&S cues, NCTR print | 6 |
| Structured events for the announcer (and later lessons / free play) | 1 |
