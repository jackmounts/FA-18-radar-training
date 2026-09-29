# Hornet Radar Trainer — Plan 1: Playable RWS/STT Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable, faithful AN/APG-73 RWS ↔ STT radar in the browser. Covers the DDI with its 20 pushbuttons, the HOTAS panels, keyboard control and simple flight, over a small sandbox of targets.

**Architecture:**
- A framework-free TypeScript simulation lives in `lib/sim/`. It uses mutable plain objects, a fixed 60 Hz step and a seeded PRNG, and is tested with `node:test`.
- A pure canvas renderer lives in `lib/ddi/`.
- A single client component, `components/cockpit/Cockpit.tsx`, owns the sim and the `requestAnimationFrame` loop. It snapshots a small `View` for React at 10 Hz.

**Tech Stack:** Next.js 16 (App Router, Turbopack, static export), React 19, Tailwind CSS v4, TypeScript, Node 25 (`node --test` with native type stripping), npm.

**Spec:** `docs/superpowers/specs/2026-09-29-hornet-radar-trainer-design.md`. **Research:** `docs/research/apg-73.md`.

**This is Plan 1 of 5.** Later plans, each written once the previous one is merged:
2. TWS, trackfiles, L&S/DT2, IFF/NCTR, HAFU.
3. ACM + HUD window + instructor map.
4. Lesson runner, tutorial, lessons.
5. Free-play encounters, scoring, below-fold content, a11y/responsive polish.

## Global Constraints

**Stack and tooling**
- Next.js 16 App Router + TypeScript + Tailwind v4.
- No extra runtime dependencies: no state library, no test framework, no shadcn in this plan.
- Static export: `next.config.ts` has `output: 'export'`.
- Tests run with `npm test`, i.e. `node --test "lib/**/*.test.ts"`. There is no Vitest or Jest.

**Code under `lib/` (type stripping rules)**
- Relative imports include the `.ts` extension.
- Type-only imports use `import type`.
- No `enum`, `namespace`, or constructor parameter properties.

**Units and conventions**
- nm, ft, kt, degrees, seconds.
- x = east, y = north.
- Heading 0 = north, clockwise.
- Azimuth: right = positive.

**Pushbuttons (PB):** numbered clockwise from the bottom of the left column.
- PB1–5: left column, bottom → top.
- PB6–10: top row, left → right.
- PB11–15: right column, top → bottom.
- PB16–20: bottom row, right → left. PB18 = MENU.

**Look and copy**
- Display is monochrome green `#6dff8a` on `#030a05`. Font is B612 Mono.
- The site is English-only, sim-agnostic, and never mentions DCS keybinds.

**Keys**
| Keys | Function |
|---|---|
| `W A S D` | TDC slew |
| `Space` | Designate |
| `R` / `F` | Antenna elevation |
| `I J K L` | Castle fwd / left / aft / right |
| `O` | Castle press |
| `U` | Undesignate |
| Arrows | Fly (←/→ turn, ↑ nose down, ↓ nose up) |
| `+` / `-` | Speed |
| `P` | Pause |

**Git:** commit after every task. Commit messages end with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/sim/types.ts` | All shared sim types (no runtime code) |
| `lib/sim/constants.ts` | Every tunable number (the calibration knob); ESTIMATE values flagged |
| `lib/sim/geometry.ts` | Angles, bearings, closure, notch speed, B-scope projection, altitude coverage, Mach |
| `lib/sim/world.ts` | Ownship and target kinematics, scripted target legs, `makeTarget` |
| `lib/sim/antenna.ts` | Raster scan pattern, frame time, scan edges, bar elevations |
| `lib/sim/detection.ts` | Beam test, PRF per bar, R50/Pd model, Doppler notch |
| `lib/sim/radar.ts` | Radar state machine: power, RWS search, bricks, TDC/cursor bump, STT lock/track/break |
| `lib/sim/pushbuttons.ts` | PB labels and press actions for the current state (one source of truth for UI and renderer) |
| `lib/sim/sim.ts` | `createSim`, `step`, `run`, seeded PRNG |
| `lib/ddi/layout.ts` | DDI geometry shared by the canvas and the HTML bezel: tactical region, PB placement |
| `lib/ddi/draw.ts` | Canvas renderer for the A/A radar attack format (+ `hafu`, iron cross) |
| `lib/keys.ts` | Keyboard map and key labels |
| `components/cockpit/Cockpit.tsx` | Client: owns sim, loop, keyboard, visibility pause, layout |
| `components/cockpit/Ddi.tsx` | Bezel, 20 pushbuttons, canvas |
| `components/cockpit/HoldButton.tsx` | Press-and-hold control that behaves like its key |
| `components/cockpit/{ThrottleGrip,StickGrip,RadarKnob,FlightStrip}.tsx` | HOTAS, power and flight panels |
| `app/{layout.tsx,page.tsx,globals.css}` | Shell, font, theme tokens, sandbox help text |

**Deviations from the spec**
- **Pushbutton location:** the pushbutton map lives in `lib/sim/pushbuttons.ts`, not `lib/ddi/`, so the sim's press actions and labels share one file and the sim stays importable without UI code.
- **No `useSyncExternalStore`:** React state is refreshed by a 10 Hz `setView` snapshot. This has the same effect with less code.

---

### Task 1: Scaffold the app, theme and tooling

**Files:**
- Create (via create-next-app): `package.json`, `tsconfig.json`, `next.config.ts`, `app/*`, `eslint.config.mjs`, `postcss.config.mjs`, `.gitignore`, `AGENTS.md`
- Modify: `package.json`, `tsconfig.json`, `next.config.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
- Delete: `public/*.svg`

**Interfaces:**
- Produces:
  - Tailwind color tokens `panel`, `panel-2`, `bezel`, `button`, `ink`, `phosphor`, and `font-mono` (B612 Mono via the CSS variable `--font-ddi`);
  - the `npm test` script.

- [ ] **Step 1: Scaffold into a temp folder and copy into the workspace**

  create-next-app rejects the folder name `radar training` because it contains a space.

  Run (Git Bash, from the workspace root):

```bash
TMP=$(mktemp -d)
(cd "$TMP" && npx --yes create-next-app@latest radar-training --ts --tailwind --eslint --app --import-alias "@/*" --use-npm --disable-git --skip-install --yes)
cp -r "$TMP/radar-training/." .
rm -rf "$TMP"
rm -f public/*.svg
npm install
```

Expected: `package.json` has `"name": "radar-training"`, and `node_modules/` exists. `docs/` is untouched.

- [ ] **Step 2: Add the test script and ESM package type**

```bash
npm pkg set type=module
npm pkg set scripts.test="node --test \"lib/**/*.test.ts\""
```

- [ ] **Step 3: Allow `.ts` import extensions**

In `tsconfig.json`, inside `"compilerOptions"`, add this line directly after `"noEmit": true,`:

```json
    "allowImportingTsExtensions": true,
```

- [ ] **Step 4: Static export — replace `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
```

- [ ] **Step 5: Theme tokens — replace `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-panel: #1f2220;
  --color-panel-2: #272b28;
  --color-bezel: #141614;
  --color-button: #3b403c;
  --color-ink: #c7cfc8;
  --color-phosphor: #6dff8a;
}

@theme inline {
  --font-mono: var(--font-ddi), ui-monospace, monospace;
}
```

- [ ] **Step 6: Font and metadata — replace `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import { B612_Mono } from 'next/font/google';
import './globals.css';

const ddiFont = B612_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-ddi' });

export const metadata: Metadata = {
  title: 'Hornet Radar Trainer — learn the AN/APG-73',
  description:
    'Interactive F/A-18C Hornet AN/APG-73 radar simulator with lessons and random encounters. Unofficial training aid.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={ddiFont.variable}>
      <body className="bg-panel font-mono text-ink antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Temporary page — replace `app/page.tsx`** (replaced by the cockpit in Task 9)

```tsx
export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <h1 className="text-sm tracking-[0.4em] text-phosphor">HORNET RADAR TRAINER</h1>
    </main>
  );
}
```

- [ ] **Step 8: Verify the build**

Run: `npm run build`

Expected:
- the build succeeds and lists route `/` as static (`○`);
- `out/index.html` exists and contains `HORNET RADAR TRAINER`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with theme tokens, B612 Mono and node:test script" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Types, constants and geometry

**Files:**
- Create: `lib/sim/types.ts`, `lib/sim/constants.ts`, `lib/sim/geometry.ts`
- Test: `lib/sim/geometry.test.ts`

**Interfaces:**
- Produces:
  - **Types:** all types in `types.ts`: `Power`, `Prf`, `Mode`, `Side`, `Ident`, `Leg`, `Kinematics`, `Ownship`, `Target`, `Antenna`, `Brick`, `Stt`, `Radar`, `Held`, `Sim`.
  - **Constants:** all constants in `constants.ts`.
  - **Angle and position helpers** from `geometry.ts`:
    - `rad(d)`, `deg(r)`
    - `clamp(v, lo, hi)`
    - `wrap360(a)`, `wrap180(a)`
    - `bearing(from, to)`, `range(from, to)`, `relAz(own, to)`
    - `elevation(ownAlt, tgtAlt, rangeNm)`
    - `velocity(m)`, `radialSpeed(own, tgt)`, `closure(own, tgt)`, `aspect(own, tgt)`
  - **Display helpers** from `geometry.ts`:
    - `toBscope(az, rangeNm, scaleNm) → {u, v}` and `fromBscope(u, v, scaleNm) → {az, range}`
    - `altitudeCoverage(ownAlt, rangeNm, elev, bars) → {hi, lo}`
    - `mach(spdKt, altFt)`

- [ ] **Step 1: Write `lib/sim/types.ts`**

```ts
export type Power = 'OFF' | 'STBY' | 'OPR';
export type Prf = 'MED' | 'HI' | 'INTL';
export type Mode = 'RWS' | 'STT';
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
export type Stt = { targetId: string; memory: number };

export type Radar = {
  power: Power;
  sil: boolean;
  mode: Mode;
  prf: Prf;
  azWidth: number;
  bars: number;
  rangeScale: number;
  age: number;
  scanCenter: number;
  elev: number;
  antenna: Antenna;
  cursor: { u: number; v: number };
  bumpLatched: boolean;
  bricks: Brick[];
  looks: Record<string, string>;
  stt: Stt | null;
  dataPage: boolean;
};

/** Held controls: -1 / 0 / 1 per axis, set every frame from pressed keys and on-screen buttons. */
export type Held = { tdcX: number; tdcY: number; elev: number; turn: number; fine: boolean; climb: number; accel: number };

export type Sim = {
  t: number;
  own: Ownship;
  targets: Target[];
  radar: Radar;
  held: Held;
  rand: () => number;
  events: string[];
};
```

- [ ] **Step 2: Write `lib/sim/constants.ts`**

```ts
// Every tunable lives here. ESTIMATE = not public; see docs/research/apg-73.md.
import type { Prf } from './types.ts';

export const SIM_DT = 1 / 60;
export const NM_FT = 6076.12;

// Antenna
export const SCAN_RATE_DPS = 80; // ESTIMATE: fits the TWS <= 3 s frame limits
export const BAR_SPACING_DEG = 1.2;
export const BEAMWIDTH_DEG = 3.3;
export const GIMBAL_AZ_DEG = 70;
export const GIMBAL_EL_DEG = 60;
export const ELEV_RATE_DPS = 10; // ESTIMATE: antenna elevation wheel slew rate
export const AZ_WIDTHS: readonly number[] = [20, 40, 60, 80, 140];
export const BAR_COUNTS: readonly number[] = [1, 2, 4, 6];
export const RANGE_SCALES: readonly number[] = [5, 10, 20, 40, 80, 160];
export const AGE_OPTIONS: readonly number[] = [2, 4, 8, 16, 32];
export const PRFS: readonly Prf[] = ['MED', 'HI', 'INTL'];

// Detection — ESTIMATE, from Eagle Dynamics' radar white paper
export const R50_HPRF_NM = 65;
export const R50_MPRF_NM = 30;
export const HPRF_NONCLOSING_FACTOR = 0.25;
export const REF_RCS_M2 = 5;
export const PD_EXPONENT = 6;
export const NOTCH_KT = 90;
export const MAX_RANGE_NM = 160;
export const MAX_BRICKS = 64;

// Tracking
export const STT_MEMORY_S = 3;

// Cursor (display units: the tactical region is 1 x 1)
export const TDC_RATE = 0.5;
export const TDC_HIT = 0.03;

// Flight
export const TURN_RATE_DPS = 6;
export const FINE_TURN_RATE_DPS = 1.5;
export const CLIMB_FPS = 100;
export const ACCEL_KTPS = 10;
export const MIN_ALT_FT = 500;
export const MAX_ALT_FT = 50000;
export const MIN_SPD_KT = 200;
export const MAX_SPD_KT = 750;
export const TARGET_TURN_DPS = 3;
export const TARGET_CLIMB_FPS = 50;
```

- [ ] **Step 3: Write the failing test `lib/sim/geometry.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  altitudeCoverage, aspect, bearing, closure, fromBscope, mach, radialSpeed, relAz, toBscope, wrap180,
} from './geometry.ts';

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('bearing is 0 north, clockwise', () => {
  near(bearing({ x: 0, y: 0 }, { x: 0, y: 1 }), 0);
  near(bearing({ x: 0, y: 0 }, { x: 1, y: 0 }), 90);
  near(bearing({ x: 0, y: 0 }, { x: -1, y: 0 }), 270);
});

test('relAz is measured off the nose, right positive', () => {
  near(relAz({ x: 0, y: 0, hdg: 90 }, { x: 1, y: 0 }), 0);
  near(relAz({ x: 0, y: 0, hdg: 90 }, { x: 0, y: 1 }), -90);
  near(wrap180(190), -170);
});

test('B-scope projection round-trips', () => {
  assert.deepEqual(toBscope(0, 20, 40), { u: 0.5, v: 0.5 });
  const back = fromBscope(0.75, 0.25, 80);
  near(back.az, 35);
  near(back.range, 60);
});

test('altitude coverage reproduces the reference case: 4B, 33 nm, 14,760 ft, elevation 0 -> 27 / 3', () => {
  assert.deepEqual(altitudeCoverage(14760, 33, 0, 4), { hi: 27, lo: 3 });
});

test('radial speed is zero for a beaming target and full for a going-away one', () => {
  near(radialSpeed({ x: 0, y: 0 }, { x: 0, y: 10, hdg: 90, spd: 400 }), 0);
  near(radialSpeed({ x: 0, y: 0 }, { x: 0, y: 10, hdg: 0, spd: 400 }), 400);
});

test('closure adds both speeds head-on; aspect is 0 when the target points at us', () => {
  near(closure({ x: 0, y: 0, hdg: 0, spd: 400 }, { x: 0, y: 10, hdg: 180, spd: 400 }), 800);
  near(aspect({ x: 0, y: 0 }, { x: 0, y: 10, hdg: 180, spd: 400 }), 0);
});

test('mach is 1 at sea-level speed of sound', () => {
  near(mach(661.47, 0), 1);
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `node --test lib/sim/geometry.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `geometry.ts`.

- [ ] **Step 5: Write `lib/sim/geometry.ts`**

```ts
import { BAR_SPACING_DEG, BEAMWIDTH_DEG, GIMBAL_AZ_DEG, NM_FT } from './constants.ts';

type Point = { x: number; y: number };
type Mover = Point & { hdg: number; spd: number };

export const rad = (d: number) => (d * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const wrap360 = (a: number) => ((a % 360) + 360) % 360;
export const wrap180 = (a: number) => wrap360(a + 180) - 180;

/** True bearing from one point to another: 0 = north, clockwise. */
export const bearing = (from: Point, to: Point) => wrap360(deg(Math.atan2(to.x - from.x, to.y - from.y)));
export const range = (from: Point, to: Point) => Math.hypot(to.x - from.x, to.y - from.y);
/** Azimuth of `to` off the nose of `own`, -180..180, right positive. */
export const relAz = (own: Point & { hdg: number }, to: Point) => wrap180(bearing(own, to) - own.hdg);
/** Elevation angle to a target in degrees (flat earth). */
export const elevation = (ownAlt: number, tgtAlt: number, rangeNm: number) =>
  deg(Math.atan2(tgtAlt - ownAlt, rangeNm * NM_FT));

export function velocity(m: Mover) {
  return { vx: m.spd * Math.sin(rad(m.hdg)), vy: m.spd * Math.cos(rad(m.hdg)) };
}

function los(from: Point, to: Point) {
  const r = range(from, to) || 1e-9;
  return { ux: (to.x - from.x) / r, uy: (to.y - from.y) / r };
}

/** Target ground speed along the line of sight, kt (+ = moving away). This is what the Doppler notch sees. */
export function radialSpeed(own: Point, tgt: Mover) {
  const { ux, uy } = los(own, tgt);
  const v = velocity(tgt);
  return v.vx * ux + v.vy * uy;
}

/** Closure rate, kt (+ = closing). */
export function closure(own: Mover, tgt: Mover) {
  const { ux, uy } = los(own, tgt);
  const o = velocity(own);
  const t = velocity(tgt);
  return (o.vx - t.vx) * ux + (o.vy - t.vy) * uy;
}

/** Angle between the target's nose and the line back to us: 0 = hot (nose-on), 180 = cold. */
export const aspect = (own: Point, tgt: Mover) => Math.abs(wrap180(bearing(tgt, own) - tgt.hdg));

/** B-scope: u 0..1 = azimuth -70..+70 deg; v 0..1 = top (full scale) .. bottom (zero range). */
export const toBscope = (az: number, rangeNm: number, scaleNm: number) => ({
  u: (az + GIMBAL_AZ_DEG) / (2 * GIMBAL_AZ_DEG),
  v: 1 - rangeNm / scaleNm,
});
export const fromBscope = (u: number, v: number, scaleNm: number) => ({
  az: u * 2 * GIMBAL_AZ_DEG - GIMBAL_AZ_DEG,
  range: (1 - v) * scaleNm,
});

/** Altitudes (thousands of ft) the scan covers at a given range: the numbers beside the cursor. */
export function altitudeCoverage(ownAlt: number, rangeNm: number, elev: number, bars: number) {
  const half = ((bars - 1) / 2) * BAR_SPACING_DEG + BEAMWIDTH_DEG / 2;
  const at = (a: number) => clamp(Math.round((ownAlt + rangeNm * NM_FT * Math.sin(rad(a))) / 1000), -99, 99);
  return { hi: at(elev + half), lo: at(elev - half) };
}

/** Mach number from true airspeed (kt), using the ISA temperature at altitude. */
export function mach(spdKt: number, altFt: number) {
  const tempK = Math.max(216.65, 288.15 - 0.0019812 * altFt);
  return spdKt / (661.47 * Math.sqrt(tempK / 288.15));
}
```

- [ ] **Step 6: Run the tests**

Run: `node --test lib/sim/geometry.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 7: Commit**

```bash
git add lib/sim
git commit -m "feat(sim): shared types, tunable constants and radar geometry" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: World kinematics

**Files:**
- Create: `lib/sim/world.ts`
- Test: `lib/sim/world.test.ts`

**Interfaces:**
- Consumes (Task 2):
  - types `Held`, `Kinematics`, `Ownship`, `Target`;
  - flight constants;
  - `bearing`, `clamp`, `rad`, `wrap180`, `wrap360`.
- Produces:
  - `moveMover(m: Kinematics, dt: number): void`
  - `stepOwnship(own: Ownship, held: Held, dt: number): void`
  - `stepTarget(t: Target, own: Ownship, dt: number): void`
  - `makeTarget(p: Partial<Target> & Pick<Target, 'id' | 'x' | 'y'>): Target`. Defaults: MIG-29, rcs 5, hostile, no IFF reply, 20,000 ft, heading 180, 450 kt, no legs, ident `unknown`.

- [ ] **Step 1: Write the failing test `lib/sim/world.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTarget, moveMover, stepOwnship, stepTarget } from './world.ts';
import { radialSpeed } from './geometry.ts';

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const still = () => ({ x: 0, y: 0, alt: 20000, hdg: 0, spd: 0 });

test('moveMover covers speed x time', () => {
  const m = { x: 0, y: 0, alt: 0, hdg: 90, spd: 360 };
  moveMover(m, 10);
  near(m.x, 1);
  near(m.y, 0);
});

test('ownship turns, climbs and slows at the rate limits', () => {
  const own = { x: 0, y: 0, alt: 20000, hdg: 0, spd: 450 };
  const held = { tdcX: 0, tdcY: 0, elev: 0, turn: 1, fine: false, climb: 1, accel: -1 };
  for (let i = 0; i < 60; i++) stepOwnship(own, held, 1 / 60);
  near(own.hdg, 6);
  near(own.alt, 20100);
  near(own.spd, 440);
});

test('a turnTo leg completes on the exact heading and is removed', () => {
  const t = makeTarget({ id: 'T', x: 0, y: 10, hdg: 180, legs: [{ kind: 'turnTo', hdg: 270 }] });
  for (let i = 0; i < 40 * 60; i++) stepTarget(t, still(), 1 / 60);
  assert.equal(t.hdg, 270);
  assert.equal(t.legs.length, 0);
});

test('a beam leg puts the target in the Doppler notch', () => {
  const own = still();
  const t = makeTarget({ id: 'T', x: 0, y: 30, hdg: 180, spd: 400, legs: [{ kind: 'beam', seconds: 120 }] });
  for (let i = 0; i < 40 * 60; i++) stepTarget(t, own, 1 / 60);
  assert.ok(Math.abs(radialSpeed(own, t)) < 90);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test lib/sim/world.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `world.ts`.

- [ ] **Step 3: Write `lib/sim/world.ts`**

```ts
import type { Held, Kinematics, Ownship, Target } from './types.ts';
import {
  ACCEL_KTPS, CLIMB_FPS, FINE_TURN_RATE_DPS, MAX_ALT_FT, MAX_SPD_KT, MIN_ALT_FT, MIN_SPD_KT,
  TARGET_CLIMB_FPS, TARGET_TURN_DPS, TURN_RATE_DPS,
} from './constants.ts';
import { bearing, clamp, rad, wrap180, wrap360 } from './geometry.ts';

export function moveMover(m: Kinematics, dt: number) {
  m.x += (m.spd * Math.sin(rad(m.hdg)) * dt) / 3600;
  m.y += (m.spd * Math.cos(rad(m.hdg)) * dt) / 3600;
}

export function stepOwnship(own: Ownship, held: Held, dt: number) {
  const rate = held.fine ? FINE_TURN_RATE_DPS : TURN_RATE_DPS;
  own.hdg = wrap360(own.hdg + held.turn * rate * dt);
  own.alt = clamp(own.alt + held.climb * CLIMB_FPS * dt, MIN_ALT_FT, MAX_ALT_FT);
  own.spd = clamp(own.spd + held.accel * ACCEL_KTPS * dt, MIN_SPD_KT, MAX_SPD_KT);
  moveMover(own, dt);
}

function turnToward(t: Kinematics, hdg: number, dt: number) {
  const d = wrap180(hdg - t.hdg);
  const s = TARGET_TURN_DPS * dt;
  if (Math.abs(d) <= s) {
    t.hdg = wrap360(hdg);
    return true;
  }
  t.hdg = wrap360(t.hdg + Math.sign(d) * s);
  return false;
}

export function stepTarget(t: Target, own: Ownship, dt: number) {
  const leg = t.legs[0];
  if (leg) {
    t.legTime += dt;
    let done: boolean;
    if (leg.kind === 'straight') done = t.legTime >= leg.seconds;
    else if (leg.kind === 'turnTo') done = turnToward(t, leg.hdg, dt);
    else if (leg.kind === 'climbTo') {
      const d = leg.alt - t.alt;
      const s = TARGET_CLIMB_FPS * dt;
      t.alt = Math.abs(d) <= s ? leg.alt : t.alt + Math.sign(d) * s;
      done = t.alt === leg.alt;
    } else {
      // beam: keep the line of sight to us on the wing, the side needing the smaller turn
      const los = bearing(t, own);
      const a = wrap360(los + 90);
      const b = wrap360(los - 90);
      turnToward(t, Math.abs(wrap180(a - t.hdg)) < Math.abs(wrap180(b - t.hdg)) ? a : b, dt);
      done = t.legTime >= leg.seconds;
    }
    if (done) {
      t.legs.shift();
      t.legTime = 0;
    }
  }
  moveMover(t, dt);
}

export function makeTarget(p: Partial<Target> & Pick<Target, 'id' | 'x' | 'y'>): Target {
  return {
    type: 'MIG-29', rcs: 5, side: 'hostile', iffReplies: false,
    alt: 20000, hdg: 180, spd: 450, legs: [], legTime: 0, ident: 'unknown',
    ...p,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test lib/sim/world.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/sim/world.ts lib/sim/world.test.ts
git commit -m "feat(sim): ownship and scripted target kinematics" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Antenna scan pattern

**Files:**
- Create: `lib/sim/antenna.ts`
- Test: `lib/sim/antenna.test.ts`

**Interfaces:**
- Consumes (Task 2): type `Antenna`; `BAR_SPACING_DEG`, `GIMBAL_AZ_DEG`, `SCAN_RATE_DPS`; `clamp`.
- Produces:
  - `type Scan = { azWidth: number; bars: number; scanCenter: number; elev: number }`. `Radar` satisfies this structurally.
  - `frameTime(azWidth, bars): number` (seconds)
  - `scanEdges(s: Scan): [number, number]`
  - `barElevation(s: Scan, bar: number): number` (bar 0 is the top bar)
  - `stepAntenna(ant: Antenna, s: Scan, dt: number): void`. It mutates the antenna: it reverses at each edge, steps down a bar, and wraps to bar 0 with `frame += 1`.

- [ ] **Step 1: Write the failing test `lib/sim/antenna.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barElevation, frameTime, scanEdges, stepAntenna } from './antenna.ts';
import { SIM_DT } from './constants.ts';
import type { Antenna } from './types.ts';

test('frame time = bars x width / scan rate', () => {
  assert.equal(frameTime(140, 4), 7);
  assert.equal(frameTime(60, 2), 1.5);
});

test('a simulated 140 deg / 4-bar frame takes about 7 s', () => {
  const ant: Antenna = { az: -70, el: 0, bar: 0, dir: 1, frame: 0 };
  const s = { azWidth: 140, bars: 4, scanCenter: 0, elev: 0 };
  let t = 0;
  while (ant.frame === 0) {
    stepAntenna(ant, s, SIM_DT);
    t += SIM_DT;
  }
  assert.ok(Math.abs(t - 7) < 0.1, `frame took ${t}s`);
  assert.equal(ant.bar, 0);
});

test('scan edges keep the pattern inside the +/-70 deg gimbal', () => {
  assert.deepEqual(scanEdges({ azWidth: 40, bars: 1, scanCenter: 60, elev: 0 }), [30, 70]);
  assert.deepEqual(scanEdges({ azWidth: 20, bars: 1, scanCenter: -10, elev: 0 }), [-20, 0]);
});

test('bars are stacked 1.2 deg apart around the elevation setting, top bar first', () => {
  const s = { azWidth: 140, bars: 4, scanCenter: 0, elev: 0 };
  assert.ok(Math.abs(barElevation(s, 0) - 1.8) < 1e-9);
  assert.ok(Math.abs(barElevation(s, 3) + 1.8) < 1e-9);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test lib/sim/antenna.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `antenna.ts`.

- [ ] **Step 3: Write `lib/sim/antenna.ts`**

```ts
import type { Antenna } from './types.ts';
import { BAR_SPACING_DEG, GIMBAL_AZ_DEG, SCAN_RATE_DPS } from './constants.ts';
import { clamp } from './geometry.ts';

export type Scan = { azWidth: number; bars: number; scanCenter: number; elev: number };

export const frameTime = (azWidth: number, bars: number) => (azWidth * bars) / SCAN_RATE_DPS;

export function scanEdges(s: Scan): [number, number] {
  const half = s.azWidth / 2;
  const c = clamp(s.scanCenter, -GIMBAL_AZ_DEG + half, GIMBAL_AZ_DEG - half);
  return [c - half, c + half];
}

export const barElevation = (s: Scan, bar: number) => s.elev + ((s.bars - 1) / 2 - bar) * BAR_SPACING_DEG;

/** Raster scan: sweep one bar, reverse at the edge and step down a bar; after the last bar jump back to bar 1. */
export function stepAntenna(ant: Antenna, s: Scan, dt: number) {
  const [lo, hi] = scanEdges(s);
  if (ant.bar >= s.bars) ant.bar = 0;
  ant.az = clamp(ant.az, lo, hi) + ant.dir * SCAN_RATE_DPS * dt;
  if (ant.az > hi || ant.az < lo) {
    ant.az = clamp(ant.az, lo, hi);
    ant.dir = ant.dir === 1 ? -1 : 1;
    ant.bar += 1;
    if (ant.bar >= s.bars) {
      ant.bar = 0;
      ant.frame += 1;
    }
  }
  ant.el = barElevation(s, ant.bar);
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test lib/sim/antenna.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/sim/antenna.ts lib/sim/antenna.test.ts
git commit -m "feat(sim): raster antenna scan with frame timing and gimbal limits" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Detection model

**Files:**
- Create: `lib/sim/detection.ts`
- Test: `lib/sim/detection.test.ts`

**Interfaces:**
- Consumes (Task 2): type `Prf`; the detection constants.
- Produces:
  - `barPrf(prf: Prf, bar: number, frame: number): 'HI' | 'MED'`
  - `r50(prf: 'HI' | 'MED', rcs: number, closureKt: number): number`
  - `probability(rangeNm: number, r50Nm: number): number`
  - `inNotch(radialKt: number): boolean`
  - `inBeam(az: number, el: number, ant: { az: number; el: number }): boolean`

- [ ] **Step 1: Write the failing test `lib/sim/detection.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barPrf, inBeam, inNotch, probability, r50 } from './detection.ts';

test('INTL alternates HI and MED by bar and flips each frame', () => {
  assert.equal(barPrf('INTL', 0, 0), 'HI');
  assert.equal(barPrf('INTL', 1, 0), 'MED');
  assert.equal(barPrf('INTL', 0, 1), 'MED');
  assert.equal(barPrf('MED', 0, 0), 'MED');
});

test('R50: HPRF long against closing targets, weak against non-closing; MPRF all-aspect', () => {
  assert.equal(r50('HI', 5, 300), 65);
  assert.equal(r50('HI', 5, -100), 16.25);
  assert.equal(r50('MED', 5, -100), 30);
  assert.equal(r50('HI', 80, 300), 130); // 16x RCS doubles range (fourth root)
});

test('Pd is 50% at R50 and falls off beyond it', () => {
  assert.equal(probability(30, 30), 0.5);
  assert.ok(probability(20, 30) > 0.9);
  assert.ok(probability(45, 30) < 0.1);
});

test('the notch rejects radial speeds under 90 kt', () => {
  assert.equal(inNotch(50), true);
  assert.equal(inNotch(-89), true);
  assert.equal(inNotch(120), false);
});

test('in-beam test uses half the 3.3 deg beamwidth on both axes', () => {
  assert.equal(inBeam(1.6, 0, { az: 0, el: 0 }), true);
  assert.equal(inBeam(1.7, 0, { az: 0, el: 0 }), false);
  assert.equal(inBeam(0, -1.7, { az: 0, el: 0 }), false);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test lib/sim/detection.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `detection.ts`.

- [ ] **Step 3: Write `lib/sim/detection.ts`**

```ts
import type { Prf } from './types.ts';
import {
  BEAMWIDTH_DEG, HPRF_NONCLOSING_FACTOR, NOTCH_KT, PD_EXPONENT, R50_HPRF_NM, R50_MPRF_NM, REF_RCS_M2,
} from './constants.ts';

/** PRF actually used on this bar: INTL alternates bar by bar and reverses every frame. */
export const barPrf = (prf: Prf, bar: number, frame: number): 'HI' | 'MED' =>
  prf !== 'INTL' ? prf : (bar + frame) % 2 === 0 ? 'HI' : 'MED';

/** Range (nm) with a 50% chance of detection per look. Scales with the fourth root of RCS. */
export function r50(prf: 'HI' | 'MED', rcs: number, closureKt: number) {
  const base = prf === 'MED' ? R50_MPRF_NM : closureKt > 0 ? R50_HPRF_NM : R50_HPRF_NM * HPRF_NONCLOSING_FACTOR;
  return base * (rcs / REF_RCS_M2) ** 0.25;
}

export const probability = (rangeNm: number, r50Nm: number) => 1 / (1 + (rangeNm / r50Nm) ** PD_EXPONENT);

export const inNotch = (radialKt: number) => Math.abs(radialKt) < NOTCH_KT;

export const inBeam = (az: number, el: number, ant: { az: number; el: number }) =>
  Math.abs(az - ant.az) <= BEAMWIDTH_DEG / 2 && Math.abs(el - ant.el) <= BEAMWIDTH_DEG / 2;
```

- [ ] **Step 4: Run the tests**

Run: `node --test lib/sim/detection.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/sim/detection.ts lib/sim/detection.test.ts
git commit -m "feat(sim): PRF-aware detection model with Doppler notch" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Radar state machine (RWS search, STT) and the sim loop

**Files:**
- Create: `lib/sim/radar.ts`, `lib/sim/sim.ts`
- Test: `lib/sim/sim.test.ts`

**Interfaces:**
- Consumes:
  - Tasks 2–5: all their exports.
  - Task 3: `stepOwnship`, `stepTarget`, `makeTarget` (tests).
- Produces, in `radar.ts`:
  - `defaultRadar(): Radar`. Defaults: STBY, RWS, INTL, 140°, 4 bars, 40 nm, AGE 8.
  - `cycle<T>(list: readonly T[], cur: T, d?: number): T` (wraps)
  - `transmitting(r: Radar): boolean`
  - `lookAt(sim, t): { range, az, el }`
  - `setPower(sim, power)`
  - `lock(sim, targetId)` and `breakLock(sim, reason)`
  - `tdcDepress(sim)` and `undesignate(sim)`
  - `stepCursor(sim, dt)` and `stepRadar(sim, dt)`
- Produces, in `sim.ts`:
  - `mulberry32(seed): () => number`
  - `createSim(opts?: { seed?: number; own?: Partial<Ownship>; targets?: Target[] }): Sim`. Default ownship: 20,000 ft, heading 0, 450 kt.
  - `step(sim, dt = SIM_DT)`
  - `run(sim, seconds)`
- Events: `lock` pushes `Locked: N nm, angels A` onto `sim.events`; `breakLock` pushes its reason.

- [ ] **Step 1: Write the failing test `lib/sim/sim.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim, run } from './sim.ts';
import { makeTarget } from './world.ts';
import { lock, setPower, tdcDepress, undesignate } from './radar.ts';
import { toBscope } from './geometry.ts';
import type { Target } from './types.ts';

const headOn = () => makeTarget({ id: 'T1', x: 0, y: 30, alt: 20000, hdg: 180, spd: 300 });
const sandbox = (targets: Target[] = [headOn()]) => createSim({ seed: 7, own: { spd: 300 }, targets });

test('a radar in STBY paints nothing', () => {
  const s = sandbox();
  run(s, 15);
  assert.equal(s.radar.bricks.length, 0);
});

test('in OPR a head-on target is painted within two frames', () => {
  const s = sandbox();
  setPower(s, 'OPR');
  run(s, 14);
  assert.ok(s.radar.bricks.length > 0);
});

test('a beaming target sits in the notch and is never painted', () => {
  const s = sandbox([makeTarget({ id: 'T1', x: 0, y: 30, hdg: 90, spd: 300 })]);
  setPower(s, 'OPR');
  run(s, 15);
  assert.equal(s.radar.bricks.length, 0);
});

test('a target above the scan is found by raising the antenna elevation', () => {
  const s = sandbox([makeTarget({ id: 'T1', x: 0, y: 30, alt: 40000, hdg: 180, spd: 300 })]);
  setPower(s, 'OPR');
  run(s, 14);
  assert.equal(s.radar.bricks.length, 0);
  s.radar.elev = 7;
  run(s, 14);
  assert.ok(s.radar.bricks.length > 0);
});

test('TDC depress on a brick locks STT, auto-ranges, and undesignate returns to RWS', () => {
  const s = sandbox();
  setPower(s, 'OPR');
  run(s, 14);
  const b = s.radar.bricks.at(-1)!;
  s.radar.cursor = toBscope(b.az, b.range, s.radar.rangeScale);
  tdcDepress(s);
  assert.equal(s.radar.mode, 'STT');
  assert.match(s.events.at(-1)!, /^Locked: \d+ nm, angels 20$/);
  run(s, 1);
  assert.equal(s.radar.mode, 'STT');
  assert.equal(s.radar.rangeScale, 40);
  undesignate(s);
  assert.equal(s.radar.mode, 'RWS');
});

test('the lock breaks when the target leaves the gimbal limits', () => {
  const s = sandbox();
  setPower(s, 'OPR');
  lock(s, 'T1');
  run(s, 0.5);
  assert.equal(s.radar.mode, 'STT');
  s.own.hdg = 90;
  run(s, 0.1);
  assert.equal(s.radar.mode, 'RWS');
});

test('STT coasts 3 s on memory in the notch, then drops', () => {
  const s = sandbox();
  setPower(s, 'OPR');
  lock(s, 'T1');
  s.targets[0].hdg = 90;
  run(s, 2);
  assert.equal(s.radar.mode, 'STT');
  run(s, 2);
  assert.equal(s.radar.mode, 'RWS');
});

test('bumping the cursor into the top edge steps the range scale once per push', () => {
  const s = sandbox();
  s.radar.cursor = { u: 0.5, v: 0.02 };
  s.held.tdcY = 1;
  run(s, 1);
  assert.equal(s.radar.rangeScale, 80);
  s.held.tdcY = 0;
  run(s, 0.1);
  s.held.tdcY = 1;
  run(s, 0.5);
  assert.equal(s.radar.rangeScale, 160);
});

test('TDC depress on empty space moves the scan centre', () => {
  const s = sandbox([]);
  setPower(s, 'OPR');
  s.radar.cursor = toBscope(30, 20, 40);
  tdcDepress(s);
  assert.equal(Math.round(s.radar.scanCenter), 30);
});

test('the same seed gives the same picture', () => {
  const a = sandbox();
  const b = sandbox();
  setPower(a, 'OPR');
  setPower(b, 'OPR');
  run(a, 20);
  run(b, 20);
  assert.deepEqual(a.radar.bricks, b.radar.bricks);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test lib/sim/sim.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `sim.ts`.

- [ ] **Step 3: Write `lib/sim/radar.ts`**

```ts
import type { Power, Radar, Sim, Target } from './types.ts';
import {
  AZ_WIDTHS, ELEV_RATE_DPS, GIMBAL_AZ_DEG, GIMBAL_EL_DEG, MAX_BRICKS, MAX_RANGE_NM, RANGE_SCALES,
  STT_MEMORY_S, TDC_HIT, TDC_RATE,
} from './constants.ts';
import { clamp, closure, elevation, fromBscope, radialSpeed, range, relAz, toBscope } from './geometry.ts';
import { stepAntenna } from './antenna.ts';
import { barPrf, inBeam, inNotch, probability, r50 } from './detection.ts';

export function defaultRadar(): Radar {
  return {
    power: 'STBY', sil: false, mode: 'RWS', prf: 'INTL',
    azWidth: 140, bars: 4, rangeScale: 40, age: 8, scanCenter: 0, elev: 0,
    antenna: { az: -70, el: 0, bar: 0, dir: 1, frame: 0 },
    cursor: { u: 0.5, v: 0.5 }, bumpLatched: false,
    bricks: [], looks: {}, stt: null, dataPage: false,
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

export function lock(sim: Sim, targetId: string) {
  const r = sim.radar;
  r.mode = 'STT';
  r.stt = { targetId, memory: 0 };
  r.bricks = [];
  const t = sim.targets.find((x) => x.id === targetId);
  if (t) sim.events.push(`Locked: ${Math.round(lookAt(sim, t).range)} nm, angels ${Math.round(t.alt / 1000)}`);
}

export function breakLock(sim: Sim, reason: string) {
  sim.radar.mode = 'RWS';
  sim.radar.stt = null;
  sim.events.push(reason);
}

/** TDC depress: on a brick -> STT (LTWS off behaviour); on empty space -> move the scan centre. */
export function tdcDepress(sim: Sim) {
  const r = sim.radar;
  if (r.mode !== 'RWS' || !transmitting(r)) return;
  const hit = r.bricks.findLast((b) => {
    const p = toBscope(b.az, b.range, r.rangeScale);
    return Math.abs(p.u - r.cursor.u) <= TDC_HIT && Math.abs(p.v - r.cursor.v) <= TDC_HIT;
  });
  if (hit) lock(sim, hit.targetId);
  else r.scanCenter = fromBscope(r.cursor.u, r.cursor.v, r.rangeScale).az;
}

export function undesignate(sim: Sim) {
  if (sim.radar.mode === 'STT') breakLock(sim, 'Returned to search');
}

function bump(r: Radar, edge: 'top' | 'bottom' | 'left' | 'right') {
  r.bumpLatched = true;
  if (edge === 'top') r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, 1);
  if (edge === 'bottom') r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, -1);
  if (edge === 'left') r.azWidth = cycle(AZ_WIDTHS, r.azWidth, -1);
  if (edge === 'right') r.azWidth = cycle(AZ_WIDTHS, r.azWidth, 1);
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
  if (!r.bumpLatched && r.mode === 'RWS') {
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
    if (sim.rand() < probability(g.range, r50(prf, t.rcs, closure(sim.own, t)))) {
      r.bricks.push({ targetId: t.id, az: g.az, range: g.range, t: sim.t });
      if (r.bricks.length > MAX_BRICKS) r.bricks.shift();
    }
  }
}

function track(sim: Sim, dt: number) {
  const r = sim.radar;
  const stt = r.stt!;
  const t = sim.targets.find((x) => x.id === stt.targetId);
  const g = t && lookAt(sim, t);
  if (!t || !g || Math.abs(g.az) > GIMBAL_AZ_DEG || Math.abs(g.el) > GIMBAL_EL_DEG || g.range > MAX_RANGE_NM) {
    return breakLock(sim, 'Lock lost');
  }
  r.antenna.az = g.az;
  r.antenna.el = g.el;
  stt.memory = inNotch(radialSpeed(sim.own, t)) ? stt.memory + dt : 0;
  if (stt.memory > STT_MEMORY_S) return breakLock(sim, 'Lock lost');
  // automatic range scale keeps the target at 45-90% of the scale
  r.rangeScale = RANGE_SCALES.find((s) => g.range <= 0.9 * s) ?? MAX_RANGE_NM;
}

export function stepRadar(sim: Sim, dt: number) {
  const r = sim.radar;
  r.bricks = r.bricks.filter((b) => sim.t - b.t <= r.age);
  if (r.mode !== 'STT') r.elev = clamp(r.elev + sim.held.elev * ELEV_RATE_DPS * dt, -GIMBAL_EL_DEG, GIMBAL_EL_DEG);
  if (!transmitting(r)) {
    if (r.mode === 'STT') breakLock(sim, 'Lock lost');
    return;
  }
  if (r.mode === 'STT') track(sim, dt);
  else search(sim, dt);
}
```

- [ ] **Step 4: Write `lib/sim/sim.ts`**

```ts
import type { Ownship, Sim, Target } from './types.ts';
import { SIM_DT } from './constants.ts';
import { stepOwnship, stepTarget } from './world.ts';
import { defaultRadar, stepCursor, stepRadar } from './radar.ts';

/** Small seeded PRNG so lessons and tests are repeatable. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSim(opts: { seed?: number; own?: Partial<Ownship>; targets?: Target[] } = {}): Sim {
  return {
    t: 0,
    own: { x: 0, y: 0, alt: 20000, hdg: 0, spd: 450, ...opts.own },
    targets: opts.targets ?? [],
    radar: defaultRadar(),
    held: { tdcX: 0, tdcY: 0, elev: 0, turn: 0, fine: false, climb: 0, accel: 0 },
    rand: mulberry32(opts.seed ?? 1),
    events: [],
  };
}

export function step(sim: Sim, dt = SIM_DT) {
  sim.t += dt;
  stepOwnship(sim.own, sim.held, dt);
  for (const t of sim.targets) stepTarget(t, sim.own, dt);
  stepCursor(sim, dt);
  stepRadar(sim, dt);
}

export function run(sim: Sim, seconds: number) {
  const n = Math.round(seconds / SIM_DT);
  for (let i = 0; i < n; i++) step(sim);
}
```

- [ ] **Step 5: Run the tests**

Run: `node --test lib/sim/sim.test.ts`
Expected: PASS, 10 tests.

If "above the scan" or "head-on" fails, do not loosen the assertion. Print `s.radar.antenna` and the target's `lookAt` each second, and check the beam geometry. Target elevation at 30 nm / +20,000 ft is about 6.3°; 4 bars at elev 0 reach about ±3.45°.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS, all tests from Tasks 2–6.

- [ ] **Step 7: Commit**

```bash
git add lib/sim/radar.ts lib/sim/sim.ts lib/sim/sim.test.ts
git commit -m "feat(sim): RWS search with bricks, TDC/cursor bump, STT lock with memory and auto range" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Pushbutton map and DDI layout

**Files:**
- Create: `lib/sim/pushbuttons.ts`, `lib/ddi/layout.ts`
- Test: `lib/sim/pushbuttons.test.ts`, `lib/ddi/layout.test.ts`

**Interfaces:**
- Consumes:
  - Task 2: `AGE_OPTIONS`, `AZ_WIDTHS`, `BAR_COUNTS`, `PRFS`, `RANGE_SCALES`.
  - Task 5: `barPrf`.
  - Task 6: `breakLock`, `cycle`; `createSim`, `lock`, `setPower` (tests).
- Produces:
  - `type Pushbutton = { label: string; boxed?: boolean; press?: () => void }`. Multi-line labels use `\n`.
  - `pushbuttons(sim: Sim): Record<number, Pushbutton>`. Keys are PB numbers 1–20; absent keys are blank buttons.
  - `REGION = { x0, y0, x1, y1 }` (screen fractions) and `PB_T: number[]`.
  - `type Edge = 'left' | 'top' | 'right' | 'bottom'`.
  - `pbPlace(n: number): { side: Edge; t: number }`.

- [ ] **Step 1: Write the failing tests**

`lib/ddi/layout.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pbPlace } from './layout.ts';

test('pushbuttons are numbered clockwise from the bottom of the left column', () => {
  assert.deepEqual(pbPlace(1), { side: 'left', t: 0.8 });
  assert.deepEqual(pbPlace(5), { side: 'left', t: 0.2 });
  assert.deepEqual(pbPlace(6), { side: 'top', t: 0.2 });
  assert.deepEqual(pbPlace(11), { side: 'right', t: 0.2 });
  assert.deepEqual(pbPlace(16), { side: 'bottom', t: 0.8 });
  assert.deepEqual(pbPlace(18), { side: 'bottom', t: 0.5 });
  assert.deepEqual(pbPlace(20), { side: 'bottom', t: 0.2 });
});
```

`lib/sim/pushbuttons.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushbuttons } from './pushbuttons.ts';
import { createSim } from './sim.ts';
import { makeTarget } from './world.ts';
import { lock, setPower } from './radar.ts';

test('RWS pushbuttons cycle the scan settings', () => {
  const s = createSim();
  assert.equal(pushbuttons(s)[5].label, 'RWS');
  assert.equal(pushbuttons(s)[18].label, 'MENU');
  assert.equal(pushbuttons(s)[1].label, 'HI\nINTL');
  pushbuttons(s)[19].press!();
  assert.equal(s.radar.azWidth, 20);
  pushbuttons(s)[6].press!();
  assert.equal(s.radar.bars, 6);
  pushbuttons(s)[1].press!();
  assert.equal(s.radar.prf, 'MED');
  pushbuttons(s)[11].press!();
  assert.equal(s.radar.rangeScale, 80);
  pushbuttons(s)[12].press!();
  assert.equal(s.radar.rangeScale, 40);
});

test('SIL toggles and is boxed; ERASE clears bricks', () => {
  const s = createSim();
  s.radar.bricks.push({ targetId: 'T1', az: 0, range: 20, t: 0 });
  pushbuttons(s)[8].press!();
  assert.equal(s.radar.bricks.length, 0);
  pushbuttons(s)[7].press!();
  assert.equal(s.radar.sil, true);
  assert.equal(pushbuttons(s)[7].boxed, true);
});

test('the DATA sub-level exposes AGE and exits', () => {
  const s = createSim();
  pushbuttons(s)[16].press!();
  const data = pushbuttons(s);
  assert.equal(data[16].boxed, true);
  assert.equal(data[19], undefined);
  data[10].press!();
  assert.equal(s.radar.age, 16);
  pushbuttons(s)[16].press!();
  assert.equal(s.radar.dataPage, false);
});

test('STT swaps PB5 to RTS and removes the range and azimuth buttons', () => {
  const s = createSim({ targets: [makeTarget({ id: 'T1', x: 0, y: 20 })] });
  setPower(s, 'OPR');
  lock(s, 'T1');
  const pbs = pushbuttons(s);
  assert.equal(pbs[5].label, 'RTS\nRWS');
  assert.equal(pbs[11], undefined);
  assert.equal(pbs[19], undefined);
  pbs[5].press!();
  assert.equal(s.radar.mode, 'RWS');
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test lib/ddi/layout.test.ts lib/sim/pushbuttons.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Write `lib/ddi/layout.ts`**

```ts
/** Tactical (B-scope) region inside the DDI screen, as fractions of the screen edge. */
export const REGION = { x0: 0.15, y0: 0.15, x1: 0.85, y1: 0.85 };

/** Pushbutton positions along each screen edge, as fractions of the edge. */
export const PB_T = [0.2, 0.35, 0.5, 0.65, 0.8];

export type Edge = 'left' | 'top' | 'right' | 'bottom';

/** PB1-5 left (bottom->top), PB6-10 top (left->right), PB11-15 right (top->bottom), PB16-20 bottom (right->left). */
export function pbPlace(n: number): { side: Edge; t: number } {
  if (n <= 5) return { side: 'left', t: PB_T[5 - n] };
  if (n <= 10) return { side: 'top', t: PB_T[n - 6] };
  if (n <= 15) return { side: 'right', t: PB_T[n - 11] };
  return { side: 'bottom', t: PB_T[20 - n] };
}
```

- [ ] **Step 4: Write `lib/sim/pushbuttons.ts`**

```ts
import type { Sim } from './types.ts';
import { AGE_OPTIONS, AZ_WIDTHS, BAR_COUNTS, PRFS, RANGE_SCALES } from './constants.ts';
import { barPrf } from './detection.ts';
import { breakLock, cycle } from './radar.ts';

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
  pbs[5] = stt ? { label: 'RTS\nRWS', press: () => breakLock(sim, 'Returned to search') } : { label: 'RWS' };
  pbs[6] = { label: `${r.bars}B ${r.antenna.bar + 1}`, press: stt ? undefined : () => { r.bars = cycle(BAR_COUNTS, r.bars); } };
  pbs[7] = { label: 'SIL', boxed: r.sil, press: () => { r.sil = !r.sil; } };
  pbs[16] = { label: 'DATA', press: () => { r.dataPage = true; } };
  if (stt) return pbs;
  pbs[8] = { label: 'ERASE', press: () => { r.bricks = []; } };
  pbs[11] = { label: '↑', press: () => { r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, 1); } };
  pbs[12] = { label: '↓', press: () => { r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, -1); } };
  pbs[19] = { label: `${r.azWidth}°`, press: () => { r.azWidth = cycle(AZ_WIDTHS, r.azWidth); } };
  return pbs;
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS. Every suite so far passes, including the 5 new tests.

- [ ] **Step 6: Commit**

```bash
git add lib/sim/pushbuttons.ts lib/sim/pushbuttons.test.ts lib/ddi
git commit -m "feat(ddi): pushbutton map per radar state and DDI edge layout" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Canvas renderer for the radar attack format

**Files:**
- Create: `lib/ddi/draw.ts`
- Test: `lib/ddi/draw.test.ts`

**Interfaces:**
- Consumes:
  - Task 2: `Ident`, `Sim`; `GIMBAL_EL_DEG`; `altitudeCoverage`, `closure`, `fromBscope`, `mach`, `toBscope`, `wrap360`.
  - Task 6: `lookAt`, `transmitting`.
  - Task 7: `pushbuttons`, `REGION`, `pbPlace`.
- Produces:
  - `drawDdi(ctx: CanvasRenderingContext2D, sim: Sim, size: number, font: string): void`, where `size` is the canvas edge in device pixels.
  - `hafu(ctx, x, y, s, ident: Ident, center: string): void`, reused by Plan 2 for TWS trackfiles.

- [ ] **Step 1: Write the failing test `lib/ddi/draw.test.ts`**

It uses a recording fake context, since Node has no canvas.

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawDdi } from './draw.ts';
import { createSim } from '../sim/sim.ts';
import { makeTarget } from '../sim/world.ts';
import { lock, setPower } from '../sim/radar.ts';

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

test('RWS frame draws the legends and pushbutton labels', () => {
  const s = createSim();
  setPower(s, 'OPR');
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  for (const want of ['OPR', 'RWS', '140°', 'MENU', 'DATA', 'ERASE', '40', '360°', '20000']) {
    assert.ok(texts.includes(want), `missing ${want}`);
  }
});

test('STT frame draws the L&S star, RTS and target data', () => {
  const s = createSim({ targets: [makeTarget({ id: 'T1', x: 0, y: 20, alt: 25000 })] });
  setPower(s, 'OPR');
  lock(s, 'T1');
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  for (const want of ['RTS', 'RWS', '★', '25', '180°']) assert.ok(texts.includes(want), `missing ${want}`);
});

test('radar OFF shows OFF and no cursor coverage numbers from a live scan', () => {
  const s = createSim();
  setPower(s, 'OFF');
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  assert.ok(texts.includes('OFF'));
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test lib/ddi/draw.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `draw.ts`.

- [ ] **Step 3: Write `lib/ddi/draw.ts`**

```ts
import type { Ident, Sim } from '../sim/types.ts';
import { GIMBAL_EL_DEG } from '../sim/constants.ts';
import { altitudeCoverage, closure, fromBscope, mach, toBscope, wrap360 } from '../sim/geometry.ts';
import { lookAt, transmitting } from '../sim/radar.ts';
import { pushbuttons } from '../sim/pushbuttons.ts';
import { REGION, pbPlace } from './layout.ts';

const GREEN = '#6dff8a';
const BG = '#030a05';

const hdgText = (h: number) => `${String(Math.round(wrap360(h)) % 360 || 360).padStart(3, '0')}°`;

/** Top half of a HAFU symbol: chevron = hostile, arc = friendly, box = unknown, box + bold top = ambiguous. */
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

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, size, size);
  ctx.save();
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
  ctx.stroke();

  // Legends around the region
  const top = Y(0) - fs * 1.2;
  const bottom = Y(1) + fs * 1.6;
  text(r.power === 'OPR' && r.sil ? 'SIL' : r.power, X(0), top);
  text(hdgText(own.hdg), size / 2, top, 'center');
  text(String(r.rangeScale), size * 0.98, top, 'right');
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

  const stt = r.stt;
  const t = stt ? sim.targets.find((x) => x.id === stt.targetId) : undefined;
  if (r.mode === 'STT' && stt && t) {
    const g = lookAt(sim, t);
    const p = toBscope(g.az, g.range, r.rangeScale);
    const x = X(p.u);
    const y = Y(p.v);
    const s = size * 0.022;
    hafu(ctx, x, y, s, t.ident, '★');
    // Stem: direction of travel relative to our nose (up = same way as us)
    const rel = ((t.hdg - own.hdg) * Math.PI) / 180;
    ctx.beginPath();
    line(x, y, x + Math.sin(rel) * s * 2.2, y - Math.cos(rel) * s * 2.2);
    ctx.stroke();
    text(mach(t.spd, t.alt).toFixed(1), x - s * 1.4, y - s * 0.5, 'right');
    text(String(Math.round(t.alt / 1000)), x + s * 1.4, y - s * 0.5);
    text(hdgText(t.hdg), X(0) + fs * 0.4, Y(0) + fs); // target ground track
    text(String(Math.round((t.alt - own.alt) / 1000)), X(0) + tick * 2.2, cy); // altitude difference
    // Range caret ">" on the right edge, closure beside it
    ctx.beginPath();
    line(X(1) - tick * 1.6, y - tick * 0.6, X(1) - tick * 0.5, y);
    line(X(1) - tick * 0.5, y, X(1) - tick * 1.6, y + tick * 0.6);
    ctx.stroke();
    text(String(Math.round(closure(own, t))), X(1) - tick * 2.2, y, 'right');
    if (stt.memory > 0) text('MEM', size / 2, Y(1) - fs, 'center');
  }
  ctx.restore();
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 5: Commit**

```bash
git add lib/ddi/draw.ts lib/ddi/draw.test.ts
git commit -m "feat(ddi): canvas renderer for the A/A radar attack format" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Cockpit UI: DDI bezel, HOTAS panels, keyboard and loop

**Files:**
- Create:
  - `lib/keys.ts`
  - `components/cockpit/HoldButton.tsx`
  - `components/cockpit/Ddi.tsx`
  - `components/cockpit/ThrottleGrip.tsx`
  - `components/cockpit/StickGrip.tsx`
  - `components/cockpit/RadarKnob.tsx`
  - `components/cockpit/FlightStrip.tsx`
  - `components/cockpit/Cockpit.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes:
  - Task 2: `Power`, `Sim`; `SIM_DT`.
  - Task 3: `makeTarget`.
  - Tasks 6 and 7:
    - `createSim`, `step`, `setPower`, `tdcDepress`, `undesignate`;
    - `pushbuttons`, `Pushbutton`, `pbPlace`.
  - Task 8: `drawDdi`.
- Produces:
  - `KEYS` (key codes) and `keyLabel(code)`.
  - `<Cockpit />` (client).
  - `data-tut` hooks for Plan 4: `ddi`, `pb-1` … `pb-20`, `throttle`, `tdc`, `elevation`, `stick`, `radar-knob`, `flight`.

No unit test in this task. It is a UI shell, and all its logic lives in the tested `lib/`. Verification is `npm run build`, `npm run lint` and a browser check.

- [ ] **Step 1: Write `lib/keys.ts`**

```ts
/** Keyboard map (KeyboardEvent.code). Left hand = throttle, right hand = stick, arrows = fly. */
export const KEYS = {
  tdcUp: 'KeyW',
  tdcDown: 'KeyS',
  tdcLeft: 'KeyA',
  tdcRight: 'KeyD',
  designate: 'Space',
  elevUp: 'KeyR',
  elevDown: 'KeyF',
  castleFwd: 'KeyI',
  castleAft: 'KeyK',
  castleLeft: 'KeyJ',
  castleRight: 'KeyL',
  castlePress: 'KeyO',
  undesignate: 'KeyU',
  turnLeft: 'ArrowLeft',
  turnRight: 'ArrowRight',
  noseDown: 'ArrowUp',
  noseUp: 'ArrowDown',
  faster: 'Equal',
  slower: 'Minus',
  pause: 'KeyP',
} as const;

const LABELS: Record<string, string> = {
  Space: 'Space',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Equal: '+',
  Minus: '−',
};

export const keyLabel = (code: string) => LABELS[code] ?? code.replace(/^Key/, '');
```

- [ ] **Step 2: Write `components/cockpit/HoldButton.tsx`**

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

/** A control that behaves exactly like its key: pressed while held, lit while pressed. */
export function HoldButton({ code, label, lit, press, release, disabled }: HoldButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={disabled ? 'Not simulated yet' : undefined}
      aria-label={disabled ? `${label} (not simulated yet)` : `${label} (key ${keyLabel(code)})`}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        press(code);
      }}
      onPointerUp={() => release(code)}
      onPointerCancel={() => release(code)}
      onClick={(e) => {
        if (e.detail === 0) {
          press(code); // keyboard activation (Enter) = a quick tap
          release(code);
        }
      }}
      className={`flex min-h-11 flex-col items-center justify-center rounded-md border px-2 py-1 text-[11px] leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        lit ? 'border-phosphor/70 bg-phosphor/20 text-phosphor' : 'border-black/60 bg-button text-ink hover:brightness-110'
      }`}
    >
      <span>{label}</span>
      {code && <kbd className="text-[10px] text-ink/50">{keyLabel(code)}</kbd>}
    </button>
  );
}
```

- [ ] **Step 3: Write `components/cockpit/Ddi.tsx`**

```tsx
'use client';

import type { RefObject } from 'react';
import type { Pushbutton } from '@/lib/sim/pushbuttons';
import { pbPlace } from '@/lib/ddi/layout';

const EDGE = 9; // bezel margin, % of the DDI width

export function Ddi({
  pbs,
  canvasRef,
  onChange,
}: {
  pbs: Record<number, Pushbutton>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onChange: () => void;
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
        const along = `${EDGE + (100 - 2 * EDGE) * t}%`;
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
            onClick={() => {
              pb?.press?.();
              onChange();
            }}
            className="absolute size-[6%] -translate-x-1/2 -translate-y-1/2 rounded-[18%] border border-black/70 bg-button shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] active:bg-black/60 focus-visible:outline-2 focus-visible:outline-phosphor"
            style={pos}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Write `components/cockpit/ThrottleGrip.tsx`**

```tsx
'use client';

import { KEYS } from '@/lib/keys';
import { HoldButton, type GripProps } from './HoldButton';

export function ThrottleGrip({ lit, press, release }: GripProps) {
  const b = (code: string, label: string, disabled = false) => (
    <HoldButton code={code} label={label} lit={lit.has(code)} press={press} release={release} disabled={disabled} />
  );
  return (
    <div data-tut="throttle" className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-4">
      <h2 className="mb-3 text-[11px] tracking-[0.3em] text-ink/60">THROTTLE · LEFT HAND</h2>
      <div data-tut="tdc" className="grid grid-cols-3 gap-1.5">
        <span />
        {b(KEYS.tdcUp, 'TDC ▲')}
        <span />
        {b(KEYS.tdcLeft, 'TDC ◀')}
        {b(KEYS.designate, 'DESIG')}
        {b(KEYS.tdcRight, 'TDC ▶')}
        <span />
        {b(KEYS.tdcDown, 'TDC ▼')}
        <span />
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

- [ ] **Step 5: Write `components/cockpit/StickGrip.tsx`**

The castle switch arrives with TWS/ACM (Plans 2–3); until then it lights up but is disabled.

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
      <div className="grid grid-cols-3 gap-1.5">
        <span />
        {b(KEYS.castleFwd, 'SCS ▲', true)}
        <span />
        {b(KEYS.castleLeft, 'SCS ◀', true)}
        {b(KEYS.castlePress, 'SCS ●', true)}
        {b(KEYS.castleRight, 'SCS ▶', true)}
        <span />
        {b(KEYS.castleAft, 'SCS ▼', true)}
        <span />
      </div>
      <div className="mt-3 grid grid-cols-1">{b(KEYS.undesignate, 'UNDESIGNATE')}</div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {b('', 'WPN SEL', true)}
        {b('', 'TRIGGER', true)}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write `components/cockpit/RadarKnob.tsx`**

```tsx
'use client';

import type { Power } from '@/lib/sim/types';

const POSITIONS: Power[] = ['OFF', 'STBY', 'OPR'];

export function RadarKnob({ power, onChange }: { power: Power; onChange: (p: Power) => void }) {
  return (
    <div
      data-tut="radar-knob"
      role="radiogroup"
      aria-label="RADAR knob"
      className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-4"
    >
      <h2 className="mb-3 text-[11px] tracking-[0.3em] text-ink/60">RADAR</h2>
      <div className="grid grid-cols-3 gap-1.5">
        {POSITIONS.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={power === p}
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

- [ ] **Step 7: Write `components/cockpit/FlightStrip.tsx`**

```tsx
'use client';

import { KEYS } from '@/lib/keys';
import { HoldButton, type GripProps } from './HoldButton';

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-md bg-black/40 px-2 py-1 text-center">
      <div className="text-[10px] text-ink/50">{label}</div>
      <div className="text-phosphor">{value}</div>
    </div>
  );
}

export function FlightStrip({ hdg, alt, spd, lit, press, release }: GripProps & { hdg: number; alt: number; spd: number }) {
  const b = (code: string, label: string) => (
    <HoldButton code={code} label={label} lit={lit.has(code)} press={press} release={release} />
  );
  return (
    <div data-tut="flight" className="flex flex-wrap items-center justify-center gap-2 text-xs">
      {b(KEYS.turnLeft, 'TURN ◀')}
      <Readout label="HDG" value={String(Math.round(hdg) % 360 || 360).padStart(3, '0')} />
      {b(KEYS.turnRight, 'TURN ▶')}
      {b(KEYS.noseDown, 'NOSE ▼')}
      <Readout label="ALT" value={Math.round(alt).toLocaleString('en-US')} />
      {b(KEYS.noseUp, 'NOSE ▲')}
      {b(KEYS.slower, 'SPD −')}
      <Readout label="SPD" value={`${Math.round(spd)} KT`} />
      {b(KEYS.faster, 'SPD +')}
    </div>
  );
}
```

- [ ] **Step 8: Write `components/cockpit/Cockpit.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Power, Sim } from '@/lib/sim/types';
import { SIM_DT } from '@/lib/sim/constants';
import { createSim, step } from '@/lib/sim/sim';
import { makeTarget } from '@/lib/sim/world';
import { setPower, tdcDepress, undesignate } from '@/lib/sim/radar';
import { pushbuttons, type Pushbutton } from '@/lib/sim/pushbuttons';
import { drawDdi } from '@/lib/ddi/draw';
import { KEYS } from '@/lib/keys';
import { Ddi } from './Ddi';
import { ThrottleGrip } from './ThrottleGrip';
import { StickGrip } from './StickGrip';
import { RadarKnob } from './RadarKnob';
import { FlightStrip } from './FlightStrip';

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

type View = { pbs: Record<number, Pushbutton>; hdg: number; alt: number; spd: number; power: Power };

const viewOf = (sim: Sim): View => ({
  pbs: pushbuttons(sim),
  hdg: sim.own.hdg,
  alt: sim.own.alt,
  spd: sim.own.spd,
  power: sim.radar.power,
});

const HANDLED = new Set<string>(Object.values(KEYS));

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
  const [announcement, setAnnouncement] = useState('');
  const pressedRef = useRef(new Set<string>());
  const pausedRef = useRef(false);
  const activeRef = useRef(true);
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const refresh = useCallback(() => setView(viewOf(simRef.current)), []);
  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  }, []);
  const press = useCallback(
    (code: string) => {
      const pressed = pressedRef.current;
      if (!code || pressed.has(code)) return;
      pressed.add(code);
      const sim = simRef.current;
      if (code === KEYS.designate) tdcDepress(sim);
      else if (code === KEYS.undesignate) undesignate(sim);
      else if (code === KEYS.pause) togglePause();
      setLit(new Set(pressed));
    },
    [togglePause],
  );
  const release = useCallback((code: string) => {
    if (pressedRef.current.delete(code)) setLit(new Set(pressedRef.current));
  }, []);
  const releaseAll = useCallback(() => {
    pressedRef.current.clear();
    setLit(new Set());
  }, []);
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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (!HANDLED.has(e.code) && !e.code.startsWith('Shift')) return;
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
      if (HANDLED.has(e.code)) e.preventDefault();
      if (!e.repeat) press(e.code);
    };
    const up = (e: KeyboardEvent) => {
      if (HANDLED.has(e.code) && activeRef.current) e.preventDefault();
      release(e.code);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', releaseAll);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', releaseAll);
    };
  }, [press, release, releaseAll]);

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
      const size = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1));
      if (canvas.width !== size) {
        canvas.width = size;
        canvas.height = size;
      }
      drawDdi(ctx, sim, size, font);
      if (now - lastUi > 100) {
        lastUi = now;
        setView(viewOf(sim));
        const msg = sim.events.splice(0).at(-1);
        if (msg) setAnnouncement(msg);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section ref={sectionRef} aria-label="Cockpit" className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-2 text-xs tracking-widest">
        <span className="text-phosphor">APG-73 TRAINER · SANDBOX</span>
        <span aria-live="polite" className="truncate text-ink/80">
          {announcement}
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={togglePause}
          className="rounded border border-white/10 px-2 py-1 text-ink/80 hover:text-phosphor"
        >
          {paused ? 'PAUSED · P' : 'PAUSE · P'}
        </button>
      </header>
      <div className="grid flex-1 items-center gap-6 p-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="order-2 flex flex-col items-center gap-4 lg:order-1 lg:items-end">
          <ThrottleGrip lit={lit} press={press} release={release} />
          <RadarKnob power={view.power} onChange={changePower} />
        </div>
        <div className="order-1 flex flex-col items-center gap-3 lg:order-2">
          <div className="w-[min(92vw,calc(100dvh-10rem))] lg:w-[min(52vw,calc(100dvh-10rem))]">
            <Ddi pbs={view.pbs} canvasRef={canvasRef} onChange={refresh} />
          </div>
          <FlightStrip hdg={view.hdg} alt={view.alt} spd={view.spd} lit={lit} press={press} release={release} />
        </div>
        <div className="order-3 flex flex-col items-center gap-4 lg:items-start">
          <StickGrip lit={lit} press={press} release={release} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 9: Replace `app/page.tsx`**

```tsx
import { Cockpit } from '@/components/cockpit/Cockpit';

export default function Home() {
  return (
    <main>
      <Cockpit />
      <section className="mx-auto max-w-3xl space-y-6 px-4 py-16 text-sm leading-relaxed">
        <h2 className="text-xs tracking-[0.35em] text-phosphor">HOW TO FLY THE SANDBOX</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Turn the RADAR knob to OPR. The vertical line sweeping across the display is the antenna.</li>
          <li>Contacts appear as small bricks: range is up the screen, azimuth left to right.</li>
          <li>
            Slew the cursor with <kbd>W A S D</kbd> over a brick and press <kbd>Space</kbd> to lock it (STT).
          </li>
          <li>
            Press <kbd>U</kbd> (undesignate) to break lock. Roll the antenna up and down with <kbd>R</kbd> / <kbd>F</kbd>.
          </li>
          <li>Fly with the arrow keys; hold Shift for fine turns. <kbd>+</kbd> / <kbd>−</kbd> change speed.</li>
        </ol>
        <p className="text-xs text-ink/60">
          Unofficial training aid built from public sources with simplified numbers. Not affiliated with the US Navy,
          Boeing, RTX or Eagle Dynamics.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 10: Build and lint**

Run: `npm run build`
Expected: the build succeeds and `/` is static.

Run: `npm run lint`
Expected: no errors. If the React hooks rules flag something, fix it. Don't disable the rule. In particular, never read `simRef.current` during render: `view` exists so that render only reads state.

- [ ] **Step 11: Verify in the browser**

Start the dev server with `npm run dev`. In the Claude desktop app, use the browser pane's `preview_start` with a `.claude/launch.json` entry of `{"name":"web","runtimeExecutable":"npm","runtimeArgs":["run","dev"],"port":3000}`. Then check the following, taking screenshots as evidence:

1. The DDI sits centred and square. Its 20 buttons are around the screen, with the throttle panel on the left and the stick panel on the right.
2. The radar starts in STBY: the Iron Cross is at lower-left, there is no sweep, and PB labels read `HI INTL`, `RWS`, `4B 1`, `SIL`, `ERASE`, `↑`, `↓`, `DATA`, `MENU`, `140°`.
3. Click OPR. The sweep line moves across and the `4B n` bar counter cycles. Bricks appear within about 15 s (T1 near 34 nm, T2 to the right, T3 only after raising the elevation with `R`).
4. Hold `W`/`D`. The cursor moves and its altitude numbers change with range. Pushing the cursor into the top edge steps the range scale `40 → 80` once per push.
5. Put the cursor on a brick and press `Space`. The display switches to STT: star symbol, Mach/altitude, closure caret, `RTS RWS` at PB5, and the range arrows disappear. The status bar announces "Locked: …".
6. Press `U`. The display is back in RWS.
7. Click PB19 (bottom row, second from left). Azimuth cycles `140° → 20°`.
8. Scroll to the help section. The sim pauses, and `Space` scrolls the page instead of designating.
9. Resize to 375 px wide. The panels stack under the DDI and all controls stay tappable.
10. The console shows no errors.

- [ ] **Step 12: Run the full test suite once more**

Run: `npm test`
Expected: PASS, all suites.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(cockpit): playable DDI with pushbuttons, HOTAS panels, keyboard and flight controls" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Spec coverage for this plan

| Spec item | Where |
|---|---|
| B-scope ±70° / linear range, ticks, B-sweep, elevation caret, cursor + altitude coverage, bricks, Iron Cross, legends | Tasks 2, 8 |
| PB numbering and baseline PB map for RWS / STT / DATA (PB1, 5, 6, 7, 8, 11, 12, 16, 18, 19, DATA→AGE) | Task 7 |
| RADAR knob OFF/STBY/OPR, SIL | Tasks 6, 7, 9 |
| Raster scan, 80°/s, 1.2° bars, 3.3° beam, gimbal limits, frame time | Task 4 |
| Detection Pd/R50/PRF/INTL/notch, seeded PRNG | Tasks 5, 6 |
| TDC designate on brick → STT, empty space → scan centre, cursor bump, undesignate, STT memory/auto range/lock loss | Task 6 |
| Simple flight (turn/fine/climb/speed), scripted target legs | Tasks 3, 9 |
| Keyboard map, lit switches, visibility pause, `aria-live` announcements, stacked narrow layout | Task 9 |

**Deferred to later plans:**
- **Plan 2:** TWS, PB13/14/15, IFF/NCTR, HAFU trackfiles.
- **Plan 3:** ACM, HUD window, instructor map.
- **Plan 4:** lessons and tutorial.
- **Plan 5:** free play, scoring, below-fold content, sources section.
