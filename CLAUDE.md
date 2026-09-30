# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Hornet Radar Trainer: a static Next.js site (`output: 'export'`, no backend) that teaches the F/A-18C AN/APG-73 radar through a playable sandbox and guided lessons. Simplified public-source numbers; not a faithful simulation of classified performance. Design spec: `docs/superpowers/specs/`, radar research: `docs/research/apg-73.md`, per-plan task lists: `docs/superpowers/plans/` (all five plans are built: free-play encounters in `lib/sim/`, reference sections and cockpit polish in `components/`). User-facing docs: `docs/USER_GUIDE.md`.

## Commands

```bash
npm run dev      # dev server (.claude/launch.json runs it on port 3100)
npm run build    # static export to out/
npm run lint     # eslint
npm test         # node --test "lib/**/*.test.ts"
node --test lib/sim/tws.test.ts   # a single test file
```

Tests use Node's built-in runner with native TypeScript type stripping (no Jest/Vitest, no transpile step). Only `lib/` has tests; there are none for `components/`.

## Architecture

Two layers with a hard boundary:

- **`lib/` is framework-free TypeScript** (no React, no DOM except `lib/bus.ts`/`lib/progress.ts` and the canvas painters). Files inside `lib/` import each other with explicit `.ts` extensions (`from './radar.ts'`) so `node --test` can run them; `components/` and `app/` use the `@/` alias instead. Keep this split when adding files.
- **`components/cockpit/` is the React shell**: it owns one mutable `Sim` in a ref and drives it; React state is only chrome.

### Simulation (`lib/sim/`)

`Sim` (`types.ts`) is one plain mutable object: ownship, scripted `targets`, `radar` state, `held` controls, a seeded PRNG (`rand`, `mulberry32`) and an append-only `events` log. `step(sim, dt)` advances the world at a fixed `SIM_DT` (1/60 s). Radar behaviour is split by concern: `radar.ts` (modes, cursor/TDC, lock, designation, castle switch), `antenna.ts` (scan pattern), `detection.ts` (PRF/Doppler-notch probability), `tracks.ts` (TWS trackfiles), `ident.ts` (IFF/NCTR), `acm.ts`, `pushbuttons.ts` (the DDI's 20 PB labels and actions, derived from state each frame), `geometry.ts` (B-scope ↔ world mapping). All tunables live in `constants.ts`; values marked `ESTIMATE` are not public. Randomness must go through `sim.rand` so lessons and tests stay repeatable.

### Rendering (`lib/ddi/`)

Pure canvas painters that take a `CanvasRenderingContext2D` plus a `Sim`: `draw.ts` (the B-scope DDI), `hud.ts` (HUD window for ACM/STT), `instructor.ts` (top-down truth map). `layout.ts` is the shared pushbutton/screen geometry, also used by the HTML overlay in `Ddi.tsx`.

### Cockpit loop (`components/cockpit/Cockpit.tsx`)

A single `requestAnimationFrame` loop steps the sim with a fixed-timestep accumulator, paints the three canvases, and every 100 ms pushes a `View` snapshot into React state, checks lesson progress and feeds `sim.events` to an `aria-live` announcer. The sim and keys run only while ≥half of the cockpit is on screen (IntersectionObserver → `activeRef`). Input: `lib/keys.ts` is the single keyboard map (by `KeyboardEvent.code`); edge-triggered actions go through the `ACTIONS` table, continuous ones through `applyHeld` writing `sim.held`. On-screen grips/buttons call the same `press`/`release` as the keyboard.

### Lessons (`lib/lessons/`)

A `Lesson` is a `setup()` that builds a fresh `Sim` plus ordered `Step`s. A step without `until` is an info step (advances via NEXT); a step with `until(sim)` is an action step that advances when the predicate holds. `highlight` lists `data-tut` ids that Cockpit spotlights by setting `data-spot` on matching DOM elements (so new spotlightable UI needs a `data-tut` attribute), and `mark` rings a B-scope point. `lessons.test.ts` contains completability walkthroughs; when you edit a lesson's setup or steps, update its walkthrough.

### Cross-component wiring

The lesson cards in `components/sections/StartHere.tsx` live outside the cockpit's tree, so they talk to it through a `window` CustomEvent (`lib/bus.ts`: `requestStart`). Progress is in `localStorage` (`lib/progress.ts`, every access wrapped in try/catch) and read via `useSyncExternalStore`. The first-visit welcome dialog keys off the same store; its server snapshot is `false` so the static HTML never contains the dialog.

## Conventions

- Next.js here is a newer major with breaking changes: read the matching guide in `node_modules/next/dist/docs/` before touching routing, config or `next/*` APIs (see AGENTS.md).
- Tailwind v4 via `@tailwindcss/postcss`; theme tokens (`phosphor`, `panel`, `bezel`, `ink`…) are defined in `app/globals.css`.
- Load-bearing shortcuts are marked with `ponytail:` comments (e.g. the fixed sandbox scenario in `Cockpit.tsx`); read them before "fixing" them.
