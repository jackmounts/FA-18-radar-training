# Hornet Radar Trainer — Plan 4: Tutorial and Lessons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the learning layer:
- one lesson runner that drives an interactive first-visit tutorial and seven lessons;
- a coach strip, spotlights and markers on the B-scope;
- a welcome dialog;
- lesson cards below the cockpit, with completion stored in `localStorage`.

**Architecture:** Lessons are data (`lib/lessons/`).
- Each lesson has a scripted scenario (`setup()` returns a seeded `Sim`) and a list of steps.
- **Info steps** advance with "Next". **Action steps** advance when their `until(sim)` predicate becomes true.
- Every lesson is proven completable by a walkthrough test that plays it with scripted HOTAS actions.
- The UI runs the current step inside the Cockpit loop:
  - `data-tut` elements get a pulsing outline;
  - a ring can mark a point on the B-scope.
- Components that live outside the Cockpit (the lesson cards) start activities by dispatching a window `CustomEvent`. There is no state library.

**Tech Stack:** Next.js 16 (App Router, static export), React 19 (`useSyncExternalStore` for `localStorage`), Tailwind v4, TypeScript, Node 25 `node --test` with native type stripping, npm.

**Spec:** `docs/superpowers/specs/2026-09-29-hornet-radar-trainer-design.md` §4 (Learning layer). **Research:** `docs/research/apg-73.md` §9 (teaching notes).

**Sequence:** Plan 4 of 5. It requires Plan 3 (ACM, HUD window, instructor map, `castle`, and the `data-tut` hooks `castle`, `undesignate`, `hud`, `map`).

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

**Conventions**
- Units: nm, ft, kt, degrees, seconds.
- Axes: x = east, y = north. Heading 0 = north, clockwise. Azimuth right = positive.
- Pushbuttons (PB) are numbered clockwise from the bottom of the left column:
  - PB1–5: left column, bottom → top.
  - PB6–10: top row, left → right.
  - PB11–15: right column, top → bottom.
  - PB16–20: bottom row, right → left. PB18 = MENU.

**Copy and look**
- Monochrome green `#6dff8a` on `#030a05`, font B612 Mono.
- English only.
- Sim-agnostic copy: never mention DCS or its keybinds.
- Lesson copy is original, plain English, and explains from zero.

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

**Storage:** `localStorage` only, every access wrapped in try/catch. Keys: `apg73.tutorialSeen`, `apg73.lessonsDone`.

**Commits:** commit after every task. End each message with the Co-Authored-By trailer from your own session attribution reminder (the model that wrote the commit).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `lib/lessons/lesson.ts` | create | `Step` and `Lesson` types, `advance`, `isComplete` |
| `lib/lessons/lessons.ts` | create | The tutorial and 7 lessons (content + scenarios) |
| `lib/lessons/lessons.test.ts` | create | Runner tests plus a walkthrough proving every lesson is completable |
| `lib/progress.ts` | create | `localStorage`: tutorial seen, lessons done; `PROGRESS_EVENT` |
| `lib/bus.ts` | create | `requestStart(req)` over a window `CustomEvent` |
| `app/globals.css` | modify | Spotlight style (`[data-spot]`), reduced-motion safe |
| `components/cockpit/Ddi.tsx` | modify (full) | Optional ring marking a point on the B-scope |
| `components/cockpit/LessonStrip.tsx` | create | Coach strip: step text, Next / Exit / next lesson |
| `components/cockpit/WelcomeDialog.tsx` | create | First-visit `<dialog>`: start tutorial / skip |
| `components/cockpit/Cockpit.tsx` | modify (full) | Activities (sandbox / lesson), step checks, spotlight, pause gating, start requests |
| `components/sections/StartHere.tsx` | create | Below-the-fold lesson cards with ✓ state |
| `app/page.tsx` | modify (full) | Adds the Start Here section |

---

### Task 1: Lesson runner, content and walkthrough tests

**Files:**
- Create: `lib/lessons/lesson.ts`, `lib/lessons/lessons.ts`
- Test: `lib/lessons/lessons.test.ts`

**Interfaces:**
- Consumes:
  - `createSim`, `step` (`sim.ts`)
  - `makeTarget` (`world.ts`)
  - from `radar.ts`: `setPower`, `castle`, `castlePress`, `tdcDepress`, `undesignate`
  - `pushbuttons`
  - from `geometry.ts`: `bearing`, `fromBscope`, `range`, `relAz`, `toBscope`
  - `trackAt`
- Produces:
  - `type Step = { text: string; highlight?: string[]; mark?: (sim: Sim) => { u: number; v: number } | null; until?: (sim: Sim) => boolean }`
  - `type Lesson = { id: string; title: string; summary: string; setup: () => Sim; steps: Step[] }`
  - `advance(lesson: Lesson, index: number, sim: Sim): number`
  - `isComplete(lesson: Lesson, index: number): boolean`
  - `LESSONS: Lesson[]`, with ids in this order: `tutorial, scan, elevation, lock, tws, ident, acm, notch`

- [ ] **Step 1: Write the failing test `lib/lessons/lessons.test.ts`**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS } from './lessons.ts';
import { advance, isComplete, type Lesson } from './lesson.ts';
import { createSim, step } from '../sim/sim.ts';
import { castle, castlePress, setPower, tdcDepress, undesignate } from '../sim/radar.ts';
import { pushbuttons } from '../sim/pushbuttons.ts';
import { bearing, range, relAz, toBscope } from '../sim/geometry.ts';
import { trackAt } from '../sim/tracks.ts';
import type { Sim } from '../sim/types.ts';

const TUT_IDS = new Set([
  'ddi', 'throttle', 'tdc', 'elevation', 'stick', 'castle', 'undesignate', 'radar-knob', 'flight', 'hud', 'map',
  ...Array.from({ length: 20 }, (_, i) => `pb-${i + 1}`),
]);

function runUntil(s: Sim, done: (s: Sim) => boolean, seconds = 90) {
  for (let i = 0; i < seconds * 60 && !done(s); i++) step(s);
  return done(s);
}

/** Cursor onto a target's symbol: its trackfile in TWS, otherwise its newest brick. */
function aim(s: Sim, id: string) {
  const tr = s.radar.tracks.find((x) => x.targetId === id);
  if (s.radar.mode === 'TWS' && tr) {
    const k = trackAt(tr, s.t);
    s.radar.cursor = toBscope(relAz(s.own, k), range(s.own, k), s.radar.rangeScale);
    return;
  }
  const b = s.radar.bricks.findLast((x) => x.targetId === id);
  assert.ok(b, `no brick for ${id}`);
  s.radar.cursor = toBscope(b.az, b.range, s.radar.rangeScale);
}

/** Press a pushbutton until a condition holds (e.g. cycle PB19 to 60°). */
function pressUntil(s: Sim, n: number, done: (s: Sim) => boolean) {
  for (let i = 0; i < 10 && !done(s); i++) pushbuttons(s)[n].press!();
}

function lockOn(s: Sim, id: string) {
  assert.ok(runUntil(s, (x) => x.radar.bricks.some((b) => b.targetId === id)), `${id} never painted`);
  aim(s, id);
  tdcDepress(s);
}

/** Play a lesson start to finish. Info steps are clicked through.
 *  Action steps run the scripted action, then the sim until the step's condition holds. */
function walk(lesson: Lesson, actions: Record<number, (s: Sim) => void>) {
  const s = lesson.setup();
  let i = 0;
  while (!isComplete(lesson, i)) {
    const current = lesson.steps[i];
    if (!current.until) {
      i += 1;
      continue;
    }
    actions[i]?.(s);
    assert.ok(runUntil(s, current.until), `${lesson.id}: step ${i + 1} never completed`);
    const next = advance(lesson, i, s);
    assert.equal(next, i + 1);
    i = next;
  }
}

const lesson = (id: string) => LESSONS.find((l) => l.id === id)!;

test('advance: info steps never auto-advance; action steps advance once their condition holds', () => {
  const l: Lesson = {
    id: 'x', title: 'X', summary: '', setup: () => createSim(),
    steps: [{ text: 'info' }, { text: 'act', until: (s) => s.radar.power === 'OPR' }],
  };
  const s = l.setup();
  assert.equal(advance(l, 0, s), 0);
  assert.equal(advance(l, 1, s), 1);
  s.radar.power = 'OPR';
  assert.equal(advance(l, 1, s), 2);
  assert.ok(isComplete(l, 2));
});

test('lessons are in order, non-trivial, and only spotlight elements that exist', () => {
  assert.deepEqual(LESSONS.map((l) => l.id), ['tutorial', 'scan', 'elevation', 'lock', 'tws', 'ident', 'acm', 'notch']);
  for (const l of LESSONS) {
    assert.ok(l.steps.length >= 4, `${l.id} is too short`);
    for (const st of l.steps) for (const h of st.highlight ?? []) assert.ok(TUT_IDS.has(h), `${l.id}: unknown highlight ${h}`);
  }
});

test('tutorial is completable', () =>
  walk(lesson('tutorial'), {
    1: (s) => setPower(s, 'OPR'),
    3: (s) => pressUntil(s, 19, (x) => x.radar.azWidth === 60),
    4: (s) => pressUntil(s, 6, (x) => x.radar.bars === 2),
    5: (s) => pressUntil(s, 11, (x) => x.radar.rangeScale === 80),
    6: (s) => { s.radar.elev = 3.5; },
    7: (s) => lockOn(s, 'T1'),
    9: (s) => undesignate(s),
  }));

test('scan lesson is completable', () =>
  walk(lesson('scan'), {
    1: (s) => pressUntil(s, 19, (x) => x.radar.azWidth === 20),
    2: (s) => {
      s.radar.cursor = toBscope(-30, 20, s.radar.rangeScale);
      tdcDepress(s);
    },
    3: (s) => pressUntil(s, 6, (x) => x.radar.bars === 2),
  }));

test('elevation lesson is completable', () =>
  walk(lesson('elevation'), {
    1: (s) => { s.radar.cursor = toBscope(0, 30, s.radar.rangeScale); },
    2: (s) => { s.radar.elev = -6; },
  }));

test('lock lesson is completable', () =>
  walk(lesson('lock'), {
    0: (s) => lockOn(s, 'T1'),
    2: (s) => { s.held.turn = -1; },
  }));

test('TWS lesson is completable', () =>
  walk(lesson('tws'), {
    0: (s) => pressUntil(s, 5, (x) => x.radar.mode === 'TWS'),
    2: (s) => {
      assert.ok(runUntil(s, (x) => x.radar.tracks.length >= 3));
      aim(s, 'C');
      tdcDepress(s);
    },
    3: (s) => {
      aim(s, 'L');
      tdcDepress(s);
    },
    4: (s) => {
      undesignate(s);
      pushbuttons(s)[14].press!();
    },
    5: (s) => undesignate(s),
    6: (s) => pushbuttons(s)[13].press!(),
  }));

test('identification lesson is completable', () =>
  walk(lesson('ident'), {
    1: (s) => pressUntil(s, 5, (x) => x.radar.mode === 'TWS'),
    2: (s) => {
      assert.ok(runUntil(s, (x) => x.radar.tracks.length >= 2));
      aim(s, 'F');
      castlePress(s);
      aim(s, 'H');
      castlePress(s);
    },
    3: (s) => {
      aim(s, 'H');
      tdcDepress(s);
      aim(s, 'H');
      tdcDepress(s);
    },
  }));

test('ACM lesson is completable', () =>
  walk(lesson('acm'), {
    1: (s) => castle(s, 'fwd'),
    2: (s) => { s.own.hdg = bearing(s.own, s.targets[0]); },
    3: (s) => {
      undesignate(s);
      castle(s, 'fwd');
      castle(s, 'left');
    },
  }));

test('notch lesson is completable', () =>
  walk(lesson('notch'), {
    1: (s) => pressUntil(s, 1, (x) => x.radar.prf === 'HI'),
    2: (s) => lockOn(s, 'T1'),
  }));
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test lib/lessons/lessons.test.ts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lessons.ts`.

- [ ] **Step 3: Write `lib/lessons/lesson.ts`**

```ts
import type { Sim } from '../sim/types.ts';

export type Step = {
  text: string;
  /** `data-tut` ids to spotlight while this step is showing. */
  highlight?: string[];
  /** A point on the B-scope (tactical-region units) to ring, e.g. the brick to lock. */
  mark?: (sim: Sim) => { u: number; v: number } | null;
  /** Action step: advances once this holds. Info steps (no `until`) advance with "Next". */
  until?: (sim: Sim) => boolean;
};

export type Lesson = { id: string; title: string; summary: string; setup: () => Sim; steps: Step[] };

/** Move past the current action step once its condition holds; info steps stay put. */
export function advance(lesson: Lesson, index: number, sim: Sim): number {
  return lesson.steps[index]?.until?.(sim) ? index + 1 : index;
}

export const isComplete = (lesson: Lesson, index: number) => index >= lesson.steps.length;
```

- [ ] **Step 4: Write `lib/lessons/lessons.ts`**

```ts
import type { Ownship, Sim, SimEvent, Target } from '../sim/types.ts';
import { createSim } from '../sim/sim.ts';
import { makeTarget } from '../sim/world.ts';
import { setPower } from '../sim/radar.ts';
import { fromBscope, range, relAz, toBscope } from '../sim/geometry.ts';
import { trackAt } from '../sim/tracks.ts';
import type { Lesson } from './lesson.ts';

type Point = { u: number; v: number };
const onScope = (p: Point) => (p.u >= 0 && p.u <= 1 && p.v >= 0 && p.v <= 1 ? p : null);

function lessonSim(seed: number, targets: Target[], own: Partial<Ownship> = {}, opr = true) {
  const s = createSim({ seed, own: { alt: 20000, hdg: 0, spd: 300, ...own }, targets });
  if (opr) setPower(s, 'OPR');
  return s;
}
const hasBrick = (s: Sim, id: string) => s.radar.bricks.some((b) => b.targetId === id);
const happened = (s: Sim, kind: SimEvent['kind']) => s.events.some((e) => e.kind === kind);
const cursorRange = (s: Sim) => fromBscope(s.radar.cursor.u, s.radar.cursor.v, s.radar.rangeScale).range;
const target = (s: Sim, id: string) => s.targets.find((t) => t.id === id);

/** Ring the newest brick of a target. */
const brickOf = (id: string) => (s: Sim) => {
  const b = s.radar.bricks.findLast((x) => x.targetId === id);
  return b ? onScope(toBscope(b.az, b.range, s.radar.rangeScale)) : null;
};
/** Ring a target's trackfile symbol. */
const trackOf = (id: string) => (s: Sim) => {
  const tr = s.radar.tracks.find((x) => x.targetId === id);
  if (!tr) return null;
  const k = trackAt(tr, s.t);
  return onScope(toBscope(relAz(s.own, k), range(s.own, k), s.radar.rangeScale));
};

export const LESSONS: Lesson[] = [
  {
    id: 'tutorial',
    title: 'Tutorial: your first lock',
    summary: 'Power up, read the B-scope, shape the scan, find a bandit and lock it.',
    setup: () => lessonSim(11, [makeTarget({ id: 'T1', x: -3, y: 40, alt: 35000, hdg: 175, spd: 250 })], { spd: 250 }, false),
    steps: [
      {
        text: "This is the DDI, the Hornet's radar display. The 20 blank buttons around it are pushbuttons (PB1–PB20); what each one does is written on the screen right next to it.",
        highlight: ['ddi'],
      },
      {
        text: "The radar is in STBY: warm, but not transmitting. That's what the cross in the lower-left corner means. Turn the RADAR knob to OPR.",
        highlight: ['radar-knob'],
        until: (s) => s.radar.power === 'OPR',
      },
      {
        text: 'This is a B-scope, not a map. Range runs UP the screen (0 at the bottom, 40 nm at the top); azimuth runs ACROSS (70° left to 70° right of your nose). The instructor map shows the real geometry.',
        highlight: ['ddi', 'map'],
      },
      {
        text: 'The vertical line sweeping side to side is the antenna, scanning at about 80° per second. 140° wide × 4 bars means a fresh picture only every ~7 s. Narrow the scan: press PB19 (bottom row, second from left) until it reads 60°.',
        highlight: ['pb-19'],
        until: (s) => s.radar.azWidth === 60,
      },
      {
        text: 'Each "bar" is one horizontal sweep, stacked 1.2° apart. Press PB6 (top-left) until it reads 2B: 60° × 2 bars refreshes in about 1.5 s, but covers a thinner slice of sky.',
        highlight: ['pb-6'],
        until: (s) => s.radar.bars === 2,
      },
      {
        text: 'Change the range scale to 80 nm: press PB11 (↑, top of the right column), or push the cursor into the top edge of the scope.',
        highlight: ['pb-11', 'tdc'],
        until: (s) => s.radar.rangeScale === 80,
      },
      {
        text: "The numbers beside the cursor are the highest and lowest altitudes (thousands of feet) your scan covers at the cursor's range. AWACS reports a bandit about 40 nm ahead at angels 35, above your scan. Roll the antenna up with R until a brick (a small bar) appears.",
        highlight: ['elevation'],
        until: (s) => hasBrick(s, 'T1'),
      },
      {
        text: 'That brick is a raw radar hit. Slew the cursor onto it with W A S D and press Space (TDC depress) to lock it: Single Target Track (STT).',
        highlight: ['tdc'],
        mark: brickOf('T1'),
        until: (s) => s.radar.mode === 'STT',
      },
      {
        text: "Locked. The antenna now follows only this target. Left of the symbol is its Mach, right its altitude; top-left its heading; the caret on the right edge marks its range, with closure speed beside it. A locked target's warning receiver now knows it is being tracked.",
        highlight: ['ddi'],
      },
      {
        text: 'Press U (undesignate) to break the lock and return to search.',
        highlight: ['undesignate'],
        until: (s) => s.radar.mode === 'RWS',
      },
      {
        text: "That's the core loop: search, find, lock. The lessons below the cockpit go deeper, one skill at a time.",
      },
    ],
  },
  {
    id: 'scan',
    title: 'Scan volume and frame time',
    summary: 'Trade coverage for refresh rate: azimuth width, bars and scan centre.',
    setup: () =>
      lessonSim(21, [
        makeTarget({ id: 'A', x: -18, y: 30, hdg: 150, spd: 250 }),
        makeTarget({ id: 'B', x: 12, y: 32, hdg: 200, spd: 250 }),
      ], { spd: 250 }),
    steps: [
      {
        text: 'Your scan volume is azimuth width × number of bars. A wide, tall scan sees more sky, but the antenna needs longer to cover it: 140° × 4 bars at ~80°/s is a 7-second frame. Watch the bar counter on PB6 step 1-2-3-4.',
        highlight: ['pb-6', 'pb-19'],
      },
      {
        text: 'Press PB19 until the scan is 20° wide.',
        highlight: ['pb-19'],
        until: (s) => s.radar.azWidth === 20,
      },
      {
        text: 'A 20° scan centred on your nose sees neither contact. Put the cursor on an empty spot about halfway between the centre and the left edge of the scope (≈30° left) and press Space: the scan centre moves there.',
        highlight: ['tdc'],
        until: (s) => s.radar.scanCenter <= -20,
      },
      {
        text: 'Now press PB6 until it reads 2B. A 20° × 2-bar scan refreshes twice a second. Wait for the left contact to paint.',
        highlight: ['pb-6'],
        until: (s) => s.radar.bars === 2 && hasBrick(s, 'A'),
      },
      {
        text: 'Small scans are fast but narrow: great once you know where to look (after an AWACS call, say), poor for finding things. Wide scans find; narrow scans follow.',
      },
    ],
  },
  {
    id: 'elevation',
    title: 'Elevation and altitude coverage',
    summary: 'Read the altitude numbers by the cursor and put the scan where the bandit is.',
    setup: () => lessonSim(22, [makeTarget({ id: 'T1', x: 1, y: 30, alt: 5000, spd: 300 })], { alt: 25000 }),
    steps: [
      {
        text: "Your scan is a thin wedge that gets taller with range. The numbers above and below the cursor are the highest and lowest altitudes it covers AT THE CURSOR'S RANGE, in thousands of feet.",
        highlight: ['ddi'],
        mark: (s) => onScope(s.radar.cursor),
      },
      {
        text: 'Slew the cursor up to about 30 nm (three quarters of the way up the scope) and watch the numbers change.',
        highlight: ['tdc'],
        until: (s) => cursorRange(s) >= 26 && cursorRange(s) <= 34,
      },
      {
        text: 'AWACS: single contact, 30 nm, angels 5. Your lower number is far above 5, so the bandit is flying under your scan. Roll the antenna down with F until it paints.',
        highlight: ['elevation', 'map'],
        until: (s) => hasBrick(s, 'T1'),
      },
      {
        text: 'Always check the altitude numbers at the range where you expect the target. Close targets need big elevation changes; far ones only a little.',
      },
    ],
  },
  {
    id: 'lock',
    title: 'Lock-on (STT) and target data',
    summary: 'Lock a contact, read what STT tells you, and find where the lock breaks.',
    setup: () => lessonSim(23, [makeTarget({ id: 'T1', x: 6, y: 28, alt: 22000, hdg: 190, spd: 350 })]),
    steps: [
      {
        text: 'Find the contact and lock it: slew the cursor onto its brick and press Space.',
        highlight: ['tdc'],
        mark: brickOf('T1'),
        until: (s) => s.radar.mode === 'STT',
      },
      {
        text: "In STT the display is all about one target. Mach (left) and altitude (right) sit beside the star; top-left is its heading; the right-edge caret shows its range with closure speed in knots beside it. The range scale now adjusts itself.",
        highlight: ['ddi'],
      },
      {
        text: 'The antenna can only look 70° either side of the nose. Turn hard left (hold ←) and keep turning until the lock breaks.',
        highlight: ['flight'],
        until: (s) => happened(s, 'lockLost'),
      },
      {
        text: 'Locks also break when the target dives into the Doppler notch (the last lesson) or flies out of range. When a lock breaks, the radar goes back to search.',
      },
    ],
  },
  {
    id: 'tws',
    title: 'TWS: trackfiles, L&S and DT2',
    summary: 'Track several contacts at once and build the designation ladder.',
    setup: () =>
      lessonSim(24, [
        makeTarget({ id: 'L', x: -6.2, y: 29.4, spd: 300 }),
        makeTarget({ id: 'C', x: 0, y: 30, spd: 300 }),
        makeTarget({ id: 'R', x: 6.2, y: 29.4, spd: 300 }),
      ]),
    steps: [
      {
        text: 'Press PB5 (top of the left column) to switch from RWS to TWS: Track While Scan.',
        highlight: ['pb-5'],
        until: (s) => s.radar.mode === 'TWS',
      },
      {
        text: "TWS narrowed the scan to 60° × 4 bars so every contact is revisited at least every ~3 s. Each contact is now a trackfile: a symbol with a stem showing where it's heading. The number inside is its rank (1 = closest).",
        highlight: ['pb-19', 'pb-6'],
      },
      {
        text: 'Designate a trackfile: cursor on it, Space. It becomes the Launch & Steering target (★).',
        highlight: ['tdc'],
        until: (s) => s.radar.ls !== null,
      },
      {
        text: 'Designate a second trackfile the same way: it becomes the secondary target, DT2 (◇).',
        highlight: ['tdc'],
        until: (s) => s.radar.dt2 !== null,
      },
      {
        text: 'Press U: with both designated, undesignate swaps ★ and ◇. Then press PB14 (RSET) to clear both.',
        highlight: ['undesignate', 'pb-14'],
        until: (s) => s.radar.ls === null && s.radar.dt2 === null,
      },
      {
        text: 'Press U once more: with nothing designated, undesignate makes the #1-ranked trackfile the L&S.',
        highlight: ['undesignate'],
        until: (s) => s.radar.ls !== null,
      },
      {
        text: 'Press PB13 to switch scan centring from MAN to AUTO: the scan now follows the L&S by itself.',
        highlight: ['pb-13'],
        until: (s) => s.radar.centering === 'AUTO',
      },
      {
        text: 'Space on the ★ would lock it (STT). TWS keeps a picture of everyone; STT gives the best data on one target, and tells that target it is locked.',
      },
    ],
  },
  {
    id: 'ident',
    title: 'IFF, NCTR and HAFU symbols',
    summary: 'Tell friend from foe before you commit.',
    setup: () =>
      lessonSim(25, [
        makeTarget({ id: 'F', type: 'F-16', side: 'friendly', iffReplies: true, x: -5, y: 22, alt: 18000, hdg: 170, spd: 300 }),
        makeTarget({ id: 'H', x: 5, y: 20, alt: 22000, hdg: 190, spd: 300 }),
      ]),
    steps: [
      {
        text: 'Trackfile symbols (HAFU) show identity by shape: open box = unknown; box with a bold top = ambiguous (no IFF reply); arc = friendly; chevron = hostile.',
        highlight: ['ddi'],
      },
      {
        text: 'Switch to TWS (PB5) so both contacts show as trackfiles.',
        highlight: ['pb-5'],
        until: (s) => s.radar.mode === 'TWS',
      },
      {
        text: "Put the cursor on a trackfile and press the castle switch in (O): the radar asks the aircraft's transponder for an IFF reply. Do it for both contacts; they are too far apart for one interrogation.",
        highlight: ['castle'],
        until: (s) => s.targets.every((t) => t.ident !== 'unknown'),
      },
      {
        text: "The friendly replied: arc. The other stayed silent: ambiguous. Silence alone isn't proof. Lock it (Space twice: first ★, then STT) and keep it nose-on: inside 25 nm, NCTR recognises the engines and prints the aircraft type after about 2 s.",
        highlight: ['tdc'],
        mark: trackOf('H'),
        until: (s) => target(s, 'H')?.ident === 'hostile',
      },
      {
        text: "Friendly = IFF reply. Hostile = no reply AND a hostile NCTR print. Anything else stays unknown or ambiguous, and the ID is advice: the decision is the pilot's.",
      },
    ],
  },
  {
    id: 'acm',
    title: 'ACM: close-in auto-acquisition',
    summary: 'Boresight, Wide and Vertical acquisition for the visual fight.',
    setup: () =>
      lessonSim(26, [
        makeTarget({ id: 'T1', x: 1.5, y: 9.5, alt: 20000, hdg: 185, spd: 250 }),
        makeTarget({ id: 'T2', x: -4, y: 12, alt: 20500, hdg: 175, spd: 250 }),
      ], { spd: 250 }),
    steps: [
      {
        text: 'Inside 10 nm there is no time to hunt for bricks. ACM modes scan a small volume in front of you and lock the first thing they find. The HUD window shows the pattern.',
        highlight: ['castle'],
      },
      {
        text: 'Push the castle switch forward (I): ACM Boresight (BST), a 3.3° beam straight down your nose.',
        highlight: ['castle'],
        until: (s) => s.radar.mode === 'ACM',
      },
      {
        text: 'Point your nose at the bandit: turn right (→, hold Shift for fine control) until its diamond sits in the small circle on the HUD. BST locks it automatically.',
        highlight: ['flight', 'hud'],
        until: (s) => s.radar.mode === 'STT',
      },
      {
        text: 'Break the lock (U), go back to ACM (I), then push the castle left (J): Wide Acquisition (WACQ), a 60°-wide box.',
        highlight: ['undesignate', 'castle'],
        until: (s) => s.radar.mode === 'ACM' && s.radar.acm === 'WACQ',
      },
      {
        text: 'WACQ locks the first contact inside the box within 10 nm, with no aiming needed.',
        highlight: ['hud'],
        until: (s) => s.radar.mode === 'STT',
      },
      {
        text: 'The third mode, Vertical Acquisition (castle aft, K), scans a tall, narrow column above your nose: for a bandit you are pulling up into during a turning fight.',
      },
    ],
  },
  {
    id: 'notch',
    title: 'PRF and the Doppler notch',
    summary: 'Why a bandit flying across your nose can vanish from a pulse-Doppler radar.',
    setup: () =>
      lessonSim(27, [
        makeTarget({
          id: 'T1', x: 0, y: 35, spd: 400,
          legs: [
            { kind: 'straight', seconds: 40 }, { kind: 'beam', seconds: 60 }, { kind: 'turnTo', hdg: 180 },
            { kind: 'straight', seconds: 30 }, { kind: 'beam', seconds: 60 }, { kind: 'turnTo', hdg: 180 },
            { kind: 'straight', seconds: 30 }, { kind: 'beam', seconds: 200 },
          ],
        }),
      ]),
    steps: [
      {
        text: 'PRF is how often the radar pulses. HI PRF sees nose-on targets far away but struggles with anything moving away from you; MED PRF sees every aspect at shorter range; INTL alternates the two bar by bar.',
        highlight: ['pb-1'],
      },
      {
        text: 'Select HI PRF: press PB1 (bottom of the left column) until it reads HI.',
        highlight: ['pb-1'],
        until: (s) => s.radar.prf === 'HI',
      },
      {
        text: 'Lock the contact: cursor on its brick, Space.',
        highlight: ['tdc'],
        mark: brickOf('T1'),
        until: (s) => s.radar.mode === 'STT',
      },
      {
        text: 'Keep the lock and watch: the bandit turns 90° to put you on its wing ("beaming"). Its speed toward you drops to almost nothing, the same Doppler as the ground, and the radar filters it out with the clutter. MEM appears for 3 s, then the lock breaks.',
        highlight: ['ddi', 'map'],
        until: (s) => happened(s, 'lockLost'),
      },
      {
        text: 'That is the notch. Beaming defeats pulse-Doppler radars; the counter is geometry. Change your heading so the bandit is no longer at 90° to your line of sight, and it comes back.',
      },
    ],
  },
];
```

- [ ] **Step 5: Run the tests**

Run: `node --test lib/lessons/lessons.test.ts`
Expected: PASS, 10 tests.

If a walkthrough fails, the message names the lesson and step. Fix the lesson's scenario (target placement, legs or timing). Do not change the walkthrough to fit.

The detection margins that matter:
- **Tutorial:** T1 starts 3.53° up, just above the 4-bar scan's top edge at 3.45°. It stays hidden until the antenna is raised.
- **Elevation lesson:** T1 is about 6.3° down, outside the ±3.45° 4-bar scan.
- **Notch lesson:** the beam leg begins at t = 40 s. The target enters the notch roughly 25 s later.

Run: `npm test`
Expected: PASS for all suites.

- [ ] **Step 6: Commit**

```bash
git add lib/lessons
git commit -m "feat(lessons): lesson runner, tutorial and 7 lessons with completability walkthroughs" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 2: Progress storage and start requests

**Files:**
- Create: `lib/progress.ts`, `lib/bus.ts`

**Interfaces:**
- `lib/progress.ts`:
  - `PROGRESS_EVENT = 'apg73:progress'`
  - `lessonsDone(): string[]`
  - `markLessonDone(id: string): void`: dispatches `PROGRESS_EVENT`.
  - `tutorialSeen(): boolean`: returns `true` when storage is unavailable, so a blocked store never nags on every visit.
  - `markTutorialSeen(): void`
  - `subscribeProgress(cb: () => void): () => void`: for `useSyncExternalStore`.
- `lib/bus.ts`:
  - `START_EVENT = 'apg73:start'`
  - `type StartRequest = { kind: 'sandbox' } | { kind: 'lesson'; id: string }`
  - `requestStart(req: StartRequest): void`

These are thin browser wrappers with no logic worth a unit test. Verification is by type-check here and by the browser check in Task 4.

- [ ] **Step 1: Write `lib/progress.ts`**

```ts
const TUTORIAL = 'apg73.tutorialSeen';
const DONE = 'apg73.lessonsDone';
export const PROGRESS_EVENT = 'apg73:progress';

export function lessonsDone(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(DONE) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function markLessonDone(id: string) {
  try {
    localStorage.setItem(DONE, JSON.stringify([...new Set([...lessonsDone(), id])]));
  } catch {
    // storage unavailable (private mode, blocked): progress simply isn't kept
  }
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

/** True when the welcome dialog should stay closed. Unavailable storage counts as seen, so we never nag on every visit. */
export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL) === '1';
  } catch {
    return true;
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL, '1');
  } catch {
    // see markLessonDone
  }
}

/** For useSyncExternalStore: fires on local progress changes and on other tabs' storage writes. */
export function subscribeProgress(cb: () => void) {
  window.addEventListener(PROGRESS_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
```

- [ ] **Step 2: Write `lib/bus.ts`**

```ts
export type StartRequest = { kind: 'sandbox' } | { kind: 'lesson'; id: string };

export const START_EVENT = 'apg73:start';

/** Ask the cockpit to start an activity (lesson cards live outside the cockpit's component tree). */
export function requestStart(req: StartRequest) {
  window.dispatchEvent(new CustomEvent<StartRequest>(START_EVENT, { detail: req }));
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add lib/progress.ts lib/bus.ts
git commit -m "feat: localStorage progress and cross-component start requests" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 3: Lesson UI pieces (spotlight, B-scope ring, coach strip, welcome dialog)

**Files:**
- Create: `components/cockpit/LessonStrip.tsx`, `components/cockpit/WelcomeDialog.tsx`
- Modify: `app/globals.css`, `components/cockpit/Ddi.tsx` (full replacement)

**Interfaces:**
- Consumes (Task 1): `LESSONS`, `isComplete`, `type Lesson`.
- Produces:
  - `LessonStrip({ lesson, index, onNext, onExit, onStartLesson })`
  - `WelcomeDialog({ open, onTutorial, onSkip })`
  - `Ddi({ pbs, canvasRef, onPress, mark })`, where `mark?: { u: number; v: number } | null`
  - CSS: any element with a `data-spot` attribute gets a pulsing outline.

- [ ] **Step 1: Add the spotlight style to `app/globals.css`**

Append:

```css
/* Lesson spotlight: the runner sets data-spot on the elements a step talks about */
[data-spot] {
  outline: 2px solid var(--color-phosphor);
  outline-offset: 4px;
  animation: spot 1.2s ease-in-out infinite;
}
@keyframes spot {
  50% {
    outline-color: transparent;
  }
}
@media (prefers-reduced-motion: reduce) {
  [data-spot] {
    animation: none;
  }
}
```

- [ ] **Step 2: Replace `components/cockpit/Ddi.tsx`**

The only change from the current file is the optional `mark` ring.

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
            className="absolute size-[6%] -translate-x-1/2 -translate-y-1/2 rounded-[18%] border border-black/70 bg-button shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] active:bg-black/60 focus-visible:outline-2 focus-visible:outline-phosphor"
            style={pos}
          />
        );
      })}
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

- [ ] **Step 3: Write `components/cockpit/LessonStrip.tsx`**

```tsx
'use client';

import { isComplete, type Lesson } from '@/lib/lessons/lesson';
import { LESSONS } from '@/lib/lessons/lessons';

const btn = 'rounded-md border border-phosphor/40 px-3 py-1.5 text-xs tracking-widest text-phosphor hover:bg-phosphor/10';

/** Coach strip under the status line: the current step, and how to move on. */
export function LessonStrip({
  lesson,
  index,
  onNext,
  onExit,
  onStartLesson,
}: {
  lesson: Lesson;
  index: number;
  onNext: () => void;
  onExit: () => void;
  onStartLesson: (id: string) => void;
}) {
  const done = isComplete(lesson, index);
  const current = lesson.steps[index];
  const next = LESSONS[LESSONS.findIndex((l) => l.id === lesson.id) + 1];
  return (
    <div
      role="region"
      aria-label="Lesson"
      className="mx-4 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-phosphor/30 bg-black/40 px-4 py-3"
    >
      <span className="text-[11px] tracking-[0.25em] text-phosphor">
        {lesson.title.toUpperCase()} · {done ? 'COMPLETE' : `${index + 1}/${lesson.steps.length}`}
      </span>
      <p aria-live="polite" className="min-w-0 flex-1 basis-80 text-sm leading-relaxed">
        {done ? 'Lesson complete. Nicely done.' : current.text}
      </p>
      <div className="flex flex-wrap gap-2">
        {!done && !current.until && (
          <button type="button" onClick={onNext} className={btn}>
            NEXT
          </button>
        )}
        {!done && current.until && <span className="self-center text-[11px] tracking-widest text-ink/70">DO IT TO CONTINUE</span>}
        {done && next && (
          <button type="button" onClick={() => onStartLesson(next.id)} className={btn}>
            NEXT: {next.title.toUpperCase()}
          </button>
        )}
        <button type="button" onClick={onExit} className={btn}>
          {done ? 'CLOSE' : 'EXIT'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `components/cockpit/WelcomeDialog.tsx`**

```tsx
'use client';

import { useEffect, useRef } from 'react';

/** First-visit welcome: start the tutorial, or skip it (Esc also skips). */
export function WelcomeDialog({ open, onTutorial, onSkip }: { open: boolean; onTutorial: () => void; onSkip: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onSkip}
      aria-labelledby="welcome-title"
      className="m-auto max-w-md rounded-2xl border border-phosphor/30 bg-panel-2 p-6 text-ink backdrop:bg-black/70"
    >
      <h2 id="welcome-title" className="text-sm tracking-[0.3em] text-phosphor">
        WELCOME, PILOT
      </h2>
      <p className="mt-3 text-sm leading-relaxed">
        This is an interactive trainer for the F/A-18C Hornet&apos;s AN/APG-73 radar. The three-minute tutorial walks you
        through the display, the controls and your first lock.
      </p>
      <div className="mt-5 flex gap-3">
        <button type="button" autoFocus onClick={onTutorial} className="rounded-md bg-phosphor px-4 py-2 text-sm font-bold text-black">
          Start tutorial
        </button>
        <button type="button" onClick={onSkip} className="rounded-md border border-white/15 px-4 py-2 text-sm">
          Skip for now
        </button>
      </div>
    </dialog>
  );
}
```

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css components/cockpit/Ddi.tsx components/cockpit/LessonStrip.tsx components/cockpit/WelcomeDialog.tsx
git commit -m "feat(lessons): coach strip, welcome dialog, spotlight and B-scope marker" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

### Task 4: Cockpit activities, Start Here section and browser check

**Files:**
- Create: `components/sections/StartHere.tsx`
- Modify: `components/cockpit/Cockpit.tsx` (full replacement), `app/page.tsx` (full replacement)

**Interfaces:**
- Consumes:
  - Tasks 1–3: `LESSONS`, `advance`, `isComplete`, `LessonStrip`, `WelcomeDialog`, `Ddi` with `mark`
  - from `progress.ts`: `lessonsDone`, `markLessonDone`, `markTutorialSeen`, `subscribeProgress`, `tutorialSeen`
  - from `bus.ts`: `START_EVENT`, `requestStart`
- Produces the Cockpit behaviour:
  - Activities are `sandbox | lesson`, and the start of each is announced.
  - Info steps advance with Next. Action steps are checked at 10 Hz.
  - A completed lesson is saved.
  - While paused, HOTAS, pushbutton and knob inputs are ignored. Only `P` and `M` still work.

- [ ] **Step 1: Replace `components/cockpit/Cockpit.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
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

type Activity = { kind: 'sandbox' } | { kind: 'lesson'; lesson: Lesson; index: number };

type View = {
  pbs: Record<number, Pushbutton>;
  hdg: number;
  alt: number;
  spd: number;
  power: Power;
  mode: Mode;
  mark: { u: number; v: number } | null;
};

const viewOf = (sim: Sim, act: Activity): View => ({
  pbs: pushbuttons(sim),
  hdg: sim.own.hdg,
  alt: sim.own.alt,
  spd: sim.own.spd,
  power: sim.radar.power,
  mode: sim.radar.mode,
  mark: act.kind === 'lesson' ? (act.lesson.steps[act.index]?.mark?.(sim) ?? null) : null,
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
    return { sim, act, view: viewOf(sim, act) };
  });
  const simRef = useRef(initial.sim);
  const activityRef = useRef<Activity>(initial.act);
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

  const refresh = useCallback(() => setView(viewOf(simRef.current, activityRef.current)), []);
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
      const lesson = req.kind === 'lesson' ? LESSONS.find((l) => l.id === req.id) : undefined;
      const sim = lesson ? lesson.setup() : sandbox();
      simRef.current = sim;
      seenRef.current = 0;
      releaseAll();
      pausedRef.current = false;
      setPaused(false);
      setShowMap(true);
      if (lesson?.id === 'tutorial') markTutorialSeen();
      goTo(lesson ? { kind: 'lesson', lesson, index: 0 } : { kind: 'sandbox' });
      setView(viewOf(sim, activityRef.current));
      setAnnouncement((a) => ({ text: lesson ? `Lesson: ${lesson.title}` : 'Sandbox', n: a.n + 1 }));
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

  // Lesson cards and other page sections ask the cockpit to start things
  useEffect(() => {
    const onStart = (e: Event) => {
      start((e as CustomEvent<StartRequest>).detail);
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
  }, [start]);

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

  // Fixed-step simulation + drawing; React chrome and lesson checks run at 10 Hz.
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
        const act = activityRef.current;
        if (act.kind === 'lesson') {
          const i = advance(act.lesson, act.index, sim);
          if (i !== act.index) goTo({ ...act, index: i });
        }
        setView(viewOf(sim, activityRef.current));
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
  const label = activity.kind === 'lesson' ? `LESSON · ${activity.lesson.title.toUpperCase()}` : 'SANDBOX';

  return (
    <section ref={sectionRef} aria-label="Cockpit" className="flex min-h-dvh scroll-mt-0 flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-2 text-xs tracking-widest">
        <span className="truncate text-phosphor">APG-73 TRAINER · {label}</span>
        <span aria-live="polite" className="truncate text-ink/80">
          {announcement.text}
          {announcement.n % 2 ? '​' : ''}
        </span>
        <div className="flex shrink-0 gap-2">
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
        }}
      />
    </section>
  );
}
```

- [ ] **Step 2: Write `components/sections/StartHere.tsx`**

```tsx
'use client';

import { useSyncExternalStore } from 'react';
import { LESSONS } from '@/lib/lessons/lessons';
import { requestStart } from '@/lib/bus';
import { lessonsDone, subscribeProgress } from '@/lib/progress';

const btn = 'rounded-md border border-phosphor/40 px-4 py-2 text-sm text-phosphor hover:bg-phosphor/10';

export function StartHere() {
  const done = useSyncExternalStore(subscribeProgress, () => lessonsDone().join(','), () => '');
  const doneSet = new Set(done ? done.split(',') : []);
  return (
    <section id="start" aria-labelledby="start-h" className="mx-auto max-w-5xl px-4 py-16">
      <h2 id="start-h" className="text-xs tracking-[0.35em] text-phosphor">
        START HERE
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/80">
        New to the Hornet&apos;s radar? Take the tutorial first. Each lesson then drills one skill in its own short scenario.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => requestStart({ kind: 'lesson', id: 'tutorial' })} className={btn}>
          {doneSet.has('tutorial') ? 'Replay the tutorial ✓' : 'Start the tutorial'}
        </button>
        <button type="button" onClick={() => requestStart({ kind: 'sandbox' })} className={btn}>
          Open the sandbox
        </button>
      </div>
      <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </section>
  );
}
```

- [ ] **Step 3: Replace `app/page.tsx`**

```tsx
import { Cockpit } from '@/components/cockpit/Cockpit';
import { StartHere } from '@/components/sections/StartHere';

export default function Home() {
  return (
    <main>
      <h1 className="sr-only">Hornet Radar Trainer — learn the AN/APG-73 radar</h1>
      <Cockpit />
      <StartHere />
      <section className="mx-auto max-w-3xl space-y-6 px-4 pb-16 text-sm leading-relaxed">
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
          <li>
            Fly with the arrow keys; hold Shift for fine turns. <kbd>+</kbd> / <kbd>−</kbd> change speed. <kbd>M</kbd> toggles the
            instructor map, <kbd>P</kbd> pauses.
          </li>
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

- [ ] **Step 4: Build, lint, test**

Run: `npm test`
Expected: all PASS.

Run: `npx tsc --noEmit`
Expected: no output.

Run: `npm run lint`
Expected: no errors. If `react-hooks` flags something, fix it rather than disable the rule. Render must never read `ref.current`; the welcome dialog state uses `useSyncExternalStore`, not a set-state-in-effect.

Run: `npm run build`
Expected: `/` is static, and the exported HTML contains no dialog open attribute.

- [ ] **Step 5: Browser check**

Clear site data first, or run `localStorage.clear()` in the console. Then `npm run dev`. Check each item with a screenshot:

1. **Welcome dialog**
   - A first visit shows the welcome dialog.
   - `Skip for now` closes it, and a reload does not show it again.
   - `localStorage.clear()` followed by a reload shows it again.
2. **Tutorial run-through**
   - `Start tutorial` shows the coach strip, `TUTORIAL: YOUR FIRST LOCK · 1/11`, and the DDI spotlighted.
   - `NEXT` advances. Turning the knob to OPR auto-advances.
   - Each action step pulses the right control: `pb-19`, `pb-6`, `pb-11`, `elevation`.
   - The lock step rings the brick on the scope.
3. **Tutorial completion**
   - The strip reads `COMPLETE`, with a `NEXT: SCAN VOLUME…` button.
   - Scrolling down, the Start Here section shows `Replay the tutorial ✓`.
4. **Every lesson card** (scan, elevation, lock, tws, ident, acm, notch)
   - The card scrolls to the cockpit and starts the lesson.
   - Playing it through to `COMPLETE` gives the card a `✓ DONE`.
5. **Exit and pause**
   - `EXIT` returns to the sandbox.
   - While paused (`P`), Space, U, pushbuttons and the knob do nothing, while `P` and `M` still work.
6. **Console:** no errors, including no hydration warnings.

- [ ] **Step 6: Commit**

```bash
git add components/cockpit/Cockpit.tsx components/sections/StartHere.tsx app/page.tsx
git commit -m "feat(lessons): first-visit tutorial, lesson strip and Start Here lesson cards" -m "Co-Authored-By: <your model> <noreply@anthropic.com>"
```

---

## Spec coverage for this plan

| Spec item | Task |
|---|---|
| One lesson runner: seed + scenario + steps `{text, highlight, until}`; Next for info steps, auto-advance for action steps | 1, 4 |
| Spotlight `data-tut` elements; highlight on-scope symbols via the shared projection (`mark`) | 3, 4 |
| First visit: welcome dialog (start tutorial / skip); `localStorage` flag; tutorial replayable | 2, 3, 4 |
| Tutorial (~11 steps: DDI, knob, B-scope, AZ, bars, range, elevation & altitude coverage, lock, STT reading, undesignate, what's next) | 1 |
| Lessons 1–7: scan volume, elevation, lock-on, TWS, IFF/NCTR/HAFU, ACM, PRF & notch; completion stored | 1, 2, 4 |
| Instructor map on by default in the tutorial and lessons | 4 (`start` sets `showMap(true)`) |
| Below-the-fold "Start here": replay tutorial, lesson cards with ✓ | 4 (free-play buttons arrive in Plan 5) |
| Inputs ignored while paused (from the Plan 1 final review) | 4 |
