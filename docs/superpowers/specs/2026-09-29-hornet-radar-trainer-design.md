# Hornet Radar Trainer — design (AN/APG-73 simulator for newbies)

_Status: approved 2026-09-29. Research: [`docs/research/apg-73.md`](../../research/apg-73.md)._

## Context

The workspace (`radar training/`) started empty. The goal is a website that teaches newbies the F/A-18C Hornet's **AN/APG-73** radar. It has four parts:
- a faithful, interactive simulation of the radar display (DDI) and its controls;
- random air-to-air encounters for practice;
- an interactive tutorial on the first visit;
- lessons and reference material further down the page, below the simulator.

### Decisions taken with the user
| Topic | Decision |
|---|---|
| Audience | Sim players and enthusiasts alike, **sim-agnostic**. It behaves like the real APG-73 as publicly documented (largely via DCS), explains everything from zero, and never references DCS keybinds |
| Ownship | **Simple flight controls**: heading, altitude and speed, with no flight physics |
| Encounters | **Find, lock, identify**: radar-only objectives, scored. Targets fly scripted paths. **No weapons** |
| Modes | **Core air-to-air**: RWS, TWS, STT and ACM (BST / VACQ / WACQ), plus STBY/SIL and all scan controls (AZ, BAR, elevation, range, PRF) |
| Layout | **Cockpit split**: throttle grip on the left, DDI in the center at full viewport height, stick grip on the right, flight strip below. Content sits below the fold |
| Instructor view | **Yes, toggleable** "truth" map. On by default in the tutorial and lessons, off in free play |
| Rendering | **Canvas scope + HTML controls**; the simulation core is framework-free TypeScript |

### Defaults (not raised with the user; open to change)
- **Language and storage:** English only. No accounts or backend; progress lives in `localStorage`.
- **Devices:** desktop-first (keyboard + mouse). On narrow screens the panels stack under the DDI, and every control stays tappable.
- **Hosting:** static export (`output: 'export'`), deployable to Vercel or any static host.
- **shadcn/ui:** not needed for the baseline. Native `<dialog>` / `<details>` cover it; add a component only if one falls short.
- **Display color:** monochrome green, as on the legacy C/D DDIs. HAFU (target identity) symbols differ by shape, not color; DCS's 3-color DDI is not copied.
- **Radar warm-up:** not simulated. The jet air-starts with the radar warm and in STBY.
- **Originality:** all copy and drawings are original, with sources cited. No screenshots from manuals or DCS.
- **Disclaimer:** unofficial, public sources, simplified numbers. Not affiliated with the US Navy, Boeing, RTX or Eagle Dynamics.

### Out of scope (future sub-projects)
- Air-to-ground modes.
- Weapons and launch zones.
- Reactive bandits and the RWR.
- The VS, RAID, GACQ, Spotlight, EXP and HITS modes. (LTWS, AACQ and TDC priority were added later, for players coming from DCS.)
- Datalink (the bottom half of the HAFU symbol).
- The WIDE speed gate.
- Sound, i18n, accounts and leaderboards.

---

## 1. Page & UX

### Cockpit section
Fills the viewport (`min-h-dvh`) on a dark-grey panel.

**Status line (top):**
- Current activity: `TUTORIAL 3/11`, `LESSON 4 · LOCK-ON` or `FREE PLAY · NORMAL`.
- In free play, an AWACS-style tasking such as `BRAA 030 / 42 / ANGELS 25 / HOT`.
- Score and timer.
- Toggles: instructor map (`M`), key legend (`?`) and pause (`P`).

**Left column — throttle grip:**
- TDC: a drag pad plus keys; pressing it designates.
- Antenna-elevation wheel.
- Cage/Uncage and RAID: drawn but disabled ("not simulated yet").
- **RADAR knob** below the grip: OFF / STBY / OPR.

**Center — DDI:**
- A square bezel with 5 blank pushbuttons per side, numbered clockwise from the bottom of the left column:

  | Buttons | Position |
  |---|---|
  | PB1–5 | Left column, bottom to top |
  | PB6–10 | Top row, left to right |
  | PB11–15 | Right column, top to bottom |
  | PB16–20 | Bottom row, right to left (PB18 = MENU) |

- A `<canvas>` screen, sized to the largest square that fits the viewport height.
- Labels are drawn on the screen next to each button, as in the jet. Each button has an `aria-label` such as `"PB 19 – AZ 140"`.
- The BRT, CONT and brightness knobs are decorative only.

**Right column:**
- Stick grip: the Sensor Control Switch (4-way castle that also presses) and Undesignate. Weapon select and trigger are drawn but disabled.
- **Instructor map** below the grip:
  - top-down, heading-up view with the scan wedge, the true targets, and range rings matching the radar scale;
  - side profile (range × altitude) showing the slice of sky being scanned.
- **HUD window**, shown in ACM only: the ACM scan pattern plus any targets you can see visually within 10 nm. It stays available even with the map off.

**Flight strip (under the DDI):** HDG, ALT and SPD, actual and commanded, with ± buttons.

**Keys:** every on-screen switch shows its key and lights up when that key is pressed.

| Group | Keys |
|---|---|
| Left hand = throttle | TDC `W A S D`; designate `Space`; antenna elevation `R` / `F` |
| Right hand = stick | castle `I` / `K` / `J` / `L` (fwd / aft / left / right); castle press `O`; undesignate `U` |
| Flying | ←/→ turn (Shift = fine); ↑/↓ nose down/up; `+` / `-` speed |

- Keys work only while the cockpit is at least half on screen and no text field has focus. That way `Space` still scrolls the page further down.

**Pausing and accessibility:**
- The sim pauses automatically when the cockpit scrolls out of view or the tab is hidden, and the frame step is clamped.
- An `aria-live` region announces key events, e.g. "Locked: 24 nm, angels 20, hostile".

### Below the fold
Static, server-rendered content:
1. **Start here:** replay the tutorial, start free play (Easy / Normal / Hard), and lesson cards with a ✓ once done.
2. **How the APG-73 works:**
   - the B-scope vs real geometry;
   - scan volume and frame time;
   - elevation and altitude coverage;
   - PRF and the Doppler notch;
   - RWS vs TWS vs STT;
   - ACM;
   - IFF, NCTR and the HAFU identity symbols.
3. **Controls reference:** pushbutton map per mode, HOTAS functions, keyboard map.
4. **Glossary, sources and disclaimer.**

### Look
- Page greys around `#1f2220`.
- A near-black screen in phosphor green, with a canvas glow (`shadowBlur`) and raw hits that fade out.
- **B612 Mono** (Airbus's open-licence cockpit-display font) via `next/font/google`.
- Colors defined as Tailwind v4 `@theme` tokens.

## 2. Radar behaviour simulated (from research)

### DDI symbology
The display is a B-scope, with your own jet at the bottom center.
- **Axes:** azimuth runs linearly from −70° to +70° across; range runs linearly upward from 0 to the selected scale.
- **Ticks:** azimuth at 0 / ±30 / ±60°; range at 25 / 50 / 75%; an elevation scale on the left edge.
- **Antenna position:** a full-height B-sweep line at the antenna's azimuth, and a "<" elevation caret (±60°) on the left edge.
- **Cursor:** two short bars, with the **altitude coverage** above and below (upper and lower limits, in thousands of ft).
- **Raw hits:** bricks that fade after AGE seconds.
- **HAFU (Hostile/Ambiguous/Friendly/Unknown) symbols:** the top half shows identity:

  | Shape | Identity |
  |---|---|
  | Chevron | Hostile |
  | Arc | Friendly |
  | Open box | Unknown |
  | Box with bold top | Ambiguous |

  The trainer never produces the ambiguous shape: it means the own ID and a datalink donor's ID conflict, and there is no datalink here.

  The centre shows a rank (1–8), ★ for the L&S or ◇ for the DT2. A stem shows the direction of travel. For the L&S/DT2, Mach is shown to the left and altitude to the right.
- **Around the scope:**
  - radar status top-left (OPR / STBY / OFF);
  - own heading top-center;
  - range scale number next to PB11;
  - TDC-ownership diamond top-right;
  - speed and Mach bottom-left;
  - own altitude bottom-right;
  - a static horizon line and velocity vector.
- **Iron Cross** (radar not transmitting): lower-left, in OFF, STBY and SIL.
- **L&S cues:** the target's ground track top-left; the altitude difference next to the elevation caret; a ">" range caret on the right edge with the closure rate.

### Pushbutton map (baseline)
Labels sit at their real positions; positions not listed stay blank.

| PB | RWS | TWS | STT | DATA sub-level |
|---|---|---|---|---|
| 1 | PRF MED/HI/INTL (active PRF shown above) | same | same | — |
| 5 | `RWS` → press cycles to TWS | `TWS` → RWS | `RTS` + the mode to return to | — |
| 6 | Bars `4B 2` (1/2/4/6; current bar shown) | 2/4/6 within TWS limits | display only | — |
| 7 | SIL toggle | same | same | — |
| 8 | ERASE (clear bricks) | — | — | — |
| 10 | — | — | `TWS` (go to TWS, AUTO centering) | AGE 2/4/8/16/32 s |
| 11 / 12 | Range ↑ / ↓ (5–160 nm) | same | removed (auto range keeps the target at 40–90% of scale) | — |
| 13 | — | AUTO / MAN centering | — | — |
| 14 | RSET (clear L&S / DT2) | same | same | — |
| 15 | NCTR toggle (boxed = on, default) | same | same; the print shows when conditions are met | — |
| 16 | DATA | DATA | DATA | DATA boxed = exit |
| 18 | MENU (inert) | same | same | same |
| 19 | AZ 20/40/60/80/140° | within TWS limits | — | — |

### HOTAS logic

**TDC press (designate):**
- On empty space: sets the scan center (RWS, and TWS in MAN).
- On a brick in RWS: goes to STT (same as with LTWS off).
- On a trackfile in TWS: makes it the L&S if there is none, otherwise the DT2.
- On the DT2: makes it the L&S.
- On the L&S: goes to STT.

**Cursor bump** against the edge of the scope: top = range up, bottom = range down, left = narrower azimuth, right = wider azimuth.

**Antenna elevation wheel:** moves all bars together. No effect in TWS AUTO.

**Undesignate:**
- With no L&S: the #1-ranked track becomes the L&S.
- With an L&S only: steps it through the ranks.
- With an L&S and a DT2: swaps them.
- In STT: breaks lock and returns to search.
- In ACM: exits ACM.

**Castle switch:**
- **Forward:** ACM in BST.
- **Inside ACM:** **aft** = VACQ, **left** = WACQ.
- **Press:** IFF interrogation of the track under the cursor, covering every track within ±11° of it. It also fires automatically when STT locks.
- **Other directions:** in the jet these hand the TDC to other displays, which aren't simulated. Here they do nothing and show a tooltip.

**ACM:** auto-locks the first target inside the pattern and range gate, then goes to STT. The DDI shows the sub-mode legend and the sweep; the HUD window shows the pattern.

### Identification (used by the encounters)

| Evidence | Result |
|---|---|
| None yet | Unknown (every trackfile starts here) |
| Positive IFF reply | Friendly |
| Negative IFF reply | Unknown (the no-reply is remembered) |
| No IFF reply + hostile NCTR print | Hostile |

- **NCTR print:** needs STT, NCTR on, a nose-on aspect within ±30° and range ≤ 25 nm (ESTIMATE). After about 2 s it shows a type, e.g. `MIG-29`.
- **Where identity lives:** on the target, not the trackfile. It therefore survives STT, which deletes the other trackfiles as the real radar does, and new trackfiles inherit it. `ponytail:` simpler than modelling identity per track; revisit if datalink is added.

## 3. Simulation model (framework-free TypeScript)

**Frame and units:** flat-earth local frame; x east and y north in nm, altitude in ft, speed in kt, angles in degrees. Fixed 60 Hz step with a clamped accumulator.

**Tuning:** every tunable lives in `constants.ts`, the calibration knob. Values marked ESTIMATE are flagged there.

### World
- **Ownship** `{x, y, alt, hdg, spd}` follows held inputs, rate-limited:

  | Motion | Rate |
  |---|---|
  | Turn | 6°/s (fine: 1.5°/s) |
  | Climb / descend | ±6,000 fpm |
  | Speed change | ±10 kt/s |

- **Targets** `{id, type, rcs, side, iffReplies, x, y, alt, hdg, spd, legs[]}`. Legs are `straight | turnTo | climbTo | beam`.

### Antenna
- **Raster scan:** `bars` passes of width `az` around the scan center. Bars step down 1.2° each, and the scan jumps back to bar 1 after the last.
- **Scan rate:** **80°/s** (ESTIMATE, consistent with the DCS TWS frame limit of ≤ 2 s).
- **Beamwidth:** 3.3°.
- **Gimbal limits:** ±70° azimuth / ±60° elevation.
- **Frame time:** bars × az ÷ rate, e.g. 140° × 4 bars = 7.0 s; 60° × 2 bars = 1.5 s.
- **TWS limits:** 2 bars ≤ 80°, 4 bars ≤ 40°, 6 bars ≤ 20°, minimum 20°. Wider settings are clipped on entering TWS.

### Detection
One roll each time the beam crosses a target: `Pd = 1 / (1 + (R / R50)^6)`.

`R50` (the range with a 50% chance) is an ESTIMATE from ED's radar white paper. It scales with `(rcs/5)^¼`.

| PRF / target | R50 |
|---|---|
| HPRF, closing target | 65 nm |
| HPRF, non-closing target | 65 × 0.25 nm |
| MPRF | 30 nm |

- **INTL** alternates HI and MED bar by bar, and reverses each frame.
- **Notch:** a target whose ground-relative radial speed is under 90 kt is never detected.
- **Randomness:** a seeded PRNG, so tests and lessons are deterministic.

### Bricks and trackfiles
- Each detection adds a brick, which ages out after AGE (default 8 s).
- Detections also update trackfiles: at most 10, ranked by range.
- A trackfile is a snapshot of the target's true state at detection, extrapolated for display. It is dropped after `max(8 s, 2.5 × frame time)` without an update. `ponytail:` no Kalman filter; add one only if tracks look wrong.

### Mode machine
RWS / TWS / STT / ACM (BST, VACQ, WACQ), as described in section 2.

- **STT:** slaves the antenna to the target.
  - Lock is lost outside the gimbal limits, beyond 160 nm, or after more than **3 s in the notch** (the radar coasts for up to 3 s on memory, showing `MEM`).
  - On loss it returns to the previous search mode.
- **ACM patterns (DCS values):**

  | Pattern | Coverage | Range gate |
  |---|---|---|
  | BST | 3.3° circle at boresight | 10 nm |
  | VACQ | 6° wide, −13° to +46° elevation | 5 nm |
  | WACQ | 60° wide, −9° to +6° elevation | 10 nm |

- **STBY / SIL / OFF:** no transmission; trackfiles age out.

### Shared pure functions
Used by the renderer, the lesson highlighter and the tests alike.
- **B-scope projection.**
- **Altitude coverage:** `h = ownAlt + R·sin(elev ± ((bars−1)/2·1.2° + 1.65°))`, displayed in thousands of ft and clamped to ±99.

## 4. Learning layer

**One lesson runner** drives both the tutorial and the lessons.
- A lesson is a seed, a scripted scenario and a list of steps `{text, highlight?: string[], until?: (sim) => boolean}`.
- Info steps advance with "Next". Action steps advance once `until` returns true.
- The overlay spotlights elements tagged `data-tut="…"`. For symbols on the scope, it spotlights a rectangle computed with the shared projection.

**First visit:** a welcome dialog offers [Start tutorial] or [Skip → free play Easy]. A `localStorage` flag stops it reappearing; the tutorial can be replayed.

**Tutorial (about 11 steps):**
1. The DDI and its pushbuttons.
2. RADAR knob from STBY to OPR.
3. Reading the B-scope, with the instructor map alongside.
4. The B-sweep and scan rate; set AZ to 60° (PB19).
5. Set 2 bars (PB6): the frame time drops from 7 s to 1.5 s.
6. Change range scale: bump the cursor against the top edge, or press PB11.
7. The altitude-coverage numbers: the target flies at "angels 32", above the scan. Roll the elevation wheel until a brick appears.
8. Slew the TDC onto the brick and press Space to lock (STT).
9. Reading STT: Mach, altitude, closure, target heading, and why the target now knows it's locked (its warning receiver).
10. Undesignate to return to RWS.
11. What's next.

**Lessons** (completion stored in `localStorage`):
1. Scan volume and frame time.
2. Elevation and altitude coverage.
3. Lock-on (STT) and reading target data.
4. TWS: trackfiles, L&S, DT2, AUTO/MAN.
5. IFF, NCTR and HAFU symbols.
6. ACM auto-acquisition (BST / VACQ / WACQ).
7. PRF and the notch: a target beams and vanishes.

**Free play:**
- Continuous flight. Encounters spawn one at a time, announced with an AWACS BRAA tasking.
- Objectives: `LOCK` the bandit, `ID_ALL` contacts, or `ID_AND_LOCK`.
- An encounter fails on timeout (3–5 min), or if a hostile closes within 5 nm before the objective is done.
- Scoring: 100 − ⌊elapsed s ÷ 3⌋, floor 20. Spiking a friendly with STT costs 50.
- After each encounter, a one-line debrief, then the next encounter after a short delay.

| Difficulty | Contacts | Geometry |
|---|---|---|
| Easy | 1 hostile | hot (flying toward you), co-altitude, within ±20° |
| Normal | 1 hostile + 1–2 friendlies | 30–50 nm, within ±40°, some turns |
| Hard | hostile 2-ship + friendlies | within ±60°, altitudes 2–40k ft, beaming |

## 5. Code structure

```
app/layout.tsx, app/page.tsx, app/globals.css            shell, fonts, @theme tokens, below-fold sections
components/cockpit/Cockpit.tsx                          client: owns sim + rAF loop + keyboard + layout
components/cockpit/{Ddi,ThrottleGrip,StickGrip,RadarKnob,FlightStrip,InstructorMap,HudWindow,LessonOverlay}.tsx
components/sections/*.tsx                                below-fold content
lib/sim/{constants,geometry,world,antenna,detection,tracks,radar,encounters,sim}.ts   pure logic
lib/sim/*.test.ts                                        node:test
lib/ddi/{pushbuttons,draw,instructor}.ts                 OSB label maps (data) + canvas renderers
lib/lessons/{tutorial,lessons}.ts                        lessons as data
```

**Data flow:**
- `Cockpit` holds the sim in a ref.
- A `requestAnimationFrame` loop runs the fixed steps, then draws the DDI, the instructor map and the HUD window.
- Inputs become `dispatch(sim, action)` calls.
- React chrome (labels, panel lights, lesson text, score) re-renders through `useSyncExternalStore`, on a tiny subscribe/notify at ≤ 10 Hz.

**Build order** (each step can be played or tested on its own):
1. Scaffold, design tokens and a static cockpit skeleton.
2. Sim core: world, antenna, detection, bricks, RWS ↔ STT, with tests.
3. DDI renderer, pushbutton map, HOTAS panels and keys → RWS/STT is playable.
4. TWS, trackfiles, L&S/DT2, IFF/NCTR and HAFU symbols.
5. ACM with the HUD window, and the instructor map.
6. Lesson runner, tutorial and lessons.
7. Free-play encounters and scoring.
8. Below-fold content, accessibility and responsive polish.

## 6. Tooling

- **Stack:** Next.js 16 (App Router, TypeScript, Turbopack, `@/*` alias), Tailwind v4, npm. Node 25 is already installed.
- **Scaffolding:** create-next-app rejects the folder name because it contains a space. Scaffold into a temp dir named `radar-training`, then move the files to the workspace root.
- **Tests:** run with `node --test "lib/**/*.test.ts"`. Node 25 strips TypeScript types natively (`process.features.typescript === 'strip'`), so no test-framework dependency is needed.
- **Config that makes the tests work:**
  - sim files use relative `.ts` imports, with `allowImportingTsExtensions` enabled in tsconfig;
  - package.json sets `"type": "module"`.

## 7. Verification

**`node --test` passes, covering:**
- Frame time and TWS clipping.
- B-scope projection.
- Altitude coverage. The formula reproduces a DCS reference case: 4 bars, cursor at 33 nm, own altitude 14,760 ft, antenna elevation 0° → 27 / 3.
- Notch filtering.
- RWS → STT → RWS, and the TWS L&S / DT2 / undesignate ladder.
- ACM auto-lock.
- The IFF/NCTR identity matrix.
- Deterministic encounter generation.

**`npm run build`** (static export) passes type-check and lint.

**In the browser pane / Playwright MCP:**
- A first visit shows the tutorial and it completes end to end; a reload skips it.
- Every lesson completes.
- Free play spawns, scores and chains encounters.
- Keys and clicks drive every control.
- The instructor map toggles.
- The layout holds at 375, 768 and 1440 px.

## Appendix — research highlights

Full report, with every source, in [`docs/research/apg-73.md`](../../research/apg-73.md).

**Confidence tags:**
- **[V]** official or analyst source;
- **[D]** DCS documentation (DCS models a USN Lot 20 F/A-18C, and its docs are the only complete public description of the display and HOTAS);
- **[S]** secondary source;
- **ESTIMATE** derived by us.

### Hardware
- **Lineage [V]:** APG-65 → APG-73 "Radar Upgrade Phase I" (first production unit July 1993, in the fleet 1994) → APG-79 AESA. 932 APG-73s were built; the last was delivered in 2006.
- **What changed from the APG-65:** same antenna and TWT transmitter; new data processor (60 MOPS); MMIC receiver/exciter.
- **Type and antenna:** X-band pulse-Doppler, mechanically scanned planar array, beamwidth about 3.3°.
- **TWS capacity:** maintains 10 tracks, displays 8.

### Modes and scan [D]
- **Power:** OFF / STBY / OPR / PULL EMERG. The warm-up duration is unpublished.
- **Scan settings:** azimuth 20/40/60/80/140°; bars 1/2/4/6 with 1.2° spacing; range 5–160 nm; PRF HI/MED/INTL; speed gate NORM ≈ 90 kt; aging 2–32 s.
- **Scan rate:** not public. 65°/s (APG-65, unconfirmed) to 80°/s (implied by the DCS TWS limits).
- **Detection range:** not public. ED estimates about 65 nm (HPRF) and 30 nm (MPRF) against a 5 m² target.

### Pushbuttons
Full RWS map, checked against a DCS screenshot: PB1 PRF · PB2 RDR PRI · PB5 mode · PB6 bars · PB7 SIL · PB8 ERASE · PB10 weapon · PB11/12 range · PB13 SET · PB14 RSET · PB15 NCTR · PB16 DATA · PB17 CHAN · PB18 MENU · PB19 AZ · PB20 MODE. What PB20 MODE does is unverified, so it is left out of the baseline.

### HOTAS
- TDC: slew and press.
- Elevation wheel.
- Castle switch: fwd = ACM, press = IFF; the other directions assign the TDC to other displays.
- Undesignate ladder.
- Cage/Uncage and RAID.
- Weapon select.

### Identification
- Friendly = IFF reply.
- Unknown = no reply (the no-reply is remembered). Ambiguous (own ID and a datalink donor's ID conflict) needs datalink, which is not simulated.
- Hostile = no reply + hostile NCTR print (or a hostile datalink ID).
