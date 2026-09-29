# Hornet Radar Trainer: User Guide

A playable sandbox for the F/A-18C Hornet's AN/APG-73 radar. No flight simulator needed, and no prior radar knowledge: the
lessons start from zero. Everything here is a simplified training model built from public sources, not a
faithful simulation.

## Contents

1. [Getting started](#getting-started)
2. [The cockpit screen](#the-cockpit-screen)
3. [Controls](#controls)
4. [Reading the display](#reading-the-display)
5. [Lessons](#lessons)
6. [Sandbox](#sandbox)
7. [Progress and privacy](#progress-and-privacy)
8. [Troubleshooting](#troubleshooting)

## Getting started

On your first visit a welcome dialog offers the tutorial. Take it: it walks you through powering up the radar, reading the
display, shaping the scan and locking your first bandit. **Esc** (or "skip") dismisses it; you can start the tutorial any
time from **Start here** below the cockpit.

Keyboard input goes to the cockpit only while it is at least half on screen. Scroll away and the sim and keys stop
(the sim does not run in the background); scroll back and they resume.

## The cockpit screen

| Area | What it is |
| --- | --- |
| **Status bar** (top) | Current activity, the latest radar callout (lock, ID, and so on), and the **MAP** and **PAUSE** toggles. |
| **Coach strip** | Appears in a lesson: the current step, plus **NEXT** (info steps) or "do it to continue" (action steps). **EXIT** returns to the sandbox. |
| **DDI** (centre) | The radar display with its 20 pushbuttons (PB1-20) around the bezel. Click a button to press it. What each does is printed on the screen beside it, and changes with the mode. |
| **Throttle grip** (left) | Cursor (TDC) arrows, **DESIG** (designate), antenna elevation up/down, and the **RADAR** knob (OFF / STBY / OPR). |
| **Stick grip** (right) | The castle switch (**SCS**): forward = ACM, left = WACQ, aft = VACQ, press = IFF. Plus **UNDESIGNATE**. |
| **Flight strip** | Your heading, altitude and speed, with turn / climb / speed buttons. |
| **HUD window** | Appears in ACM and STT: a simple view out of the canopy. |
| **Instructor map** | A top-down "truth" view of where everyone really is. Toggle with **M**. On by default; turn it off to practise from the radar alone. |

## Controls

Every keyboard control has an on-screen button, and the buttons light up as you press keys.

| Action | Key |
| --- | --- |
| Move the cursor (TDC) | `W` `A` `S` `D` |
| Designate (lock / select) | `Space` |
| Undesignate (break lock / swap targets) | `U` |
| Antenna elevation up / down | `R` / `F` |
| Castle switch: forward (ACM Boresight) | `I` |
| Castle switch: left (ACM Wide) | `J` |
| Castle switch: aft (ACM Vertical) | `K` |
| Castle switch: press (IFF interrogation) | `O` |
| Turn left / right | `←` / `→` (hold `Shift` for fine turns) |
| Nose down / up | `↑` / `↓` |
| Faster / slower | `+` / `-` |
| Toggle instructor map | `M` |
| Pause | `P` |

Modifier combinations such as `Ctrl+…` are left to the browser.

## Reading the display

- **It is a B-scope, not a map.** Range runs *up* the screen (0 at the bottom); azimuth runs *across* (from 70° left to 70°
  right of your nose). Use the instructor map to see the real geometry.
- **Radar states.** *STBY* (a cross in the lower-left corner) means warm but not transmitting. *OPR* transmits and scans.
  **SIL** silences transmission without changing the power state.
- **The scan.** The vertical line is the antenna sweeping. A wider scan (PB19) and more bars (PB6) cover more sky but take
  longer to refresh. Range scale is PB11 / PB12, or push the cursor into the top or bottom edge.
- **Bricks** are raw radar hits in RWS (Range While Search). **PB8 ERASE** clears them.
- **Altitude coverage.** The two numbers beside the cursor are the highest and lowest altitudes (thousands of feet) your
  scan covers *at the cursor's range*. Roll the antenna (`R` / `F`) to move the scan up or down.
- **PRF (PB1).** MED sees every aspect at shorter range. HI sees nose-on targets far away but struggles with targets moving
  away. INTL alternates by bar. A target flying at 90° to your line of sight (beaming) can fall into the *Doppler notch* and vanish.
- **TWS (PB5).** Track While Scan turns contacts into trackfiles. `Space` on a trackfile designates it as the **L&S** target (★);
  a second designation is **DT2** (◇). `U` swaps them, **RSET (PB14)** clears both. **PB13** toggles AUTO / MAN scan centring.
- **STT (single target track).** Lock a target with `Space` on its brick or trackfile. The display centres on that target: Mach
  on the left, altitude on the right, heading top-left, a range caret with closure speed on the right edge. **RTS (PB5)** or
  `U` returns to search. If a lock is lost you get about 3 seconds of memory (MEM) before it breaks.
- **Identification.** HAFU symbol shapes: open box = unknown, box with bold top = ambiguous (no IFF reply), arc = friendly,
  chevron = hostile. Press the castle switch in (`O`) with the cursor over a contact to interrogate IFF; **NCTR (PB15)**
  identifies the aircraft type from a nose-on view inside about 25 nm.
- **ACM.** Inside about 10 nm, the castle switch selects an auto-acquisition scan and locks the first contact it finds:
  Boresight (`I`), Wide (`J`) or Vertical (`K`).
- **DATA (PB16)** opens a page with the track-age setting.

## Lessons

Each lesson is a short scenario with its own aircraft, guided step by step. Steps that tell you to do something advance
by themselves once you have; info steps advance with **NEXT**. Where a step points at a control, it is highlighted, and the
scope may show a ring where to look.

| # | Lesson | Teaches |
| --- | --- | --- |
| - | **Tutorial: your first lock** | Power up, the B-scope, scan width and bars, range scale, antenna elevation, STT. |
| 1 | **Scan volume and frame time** | Trading coverage for refresh rate; moving the scan centre. |
| 2 | **Elevation and altitude coverage** | Reading the altitude numbers; putting the scan where the target is. |
| 3 | **Lock-on (STT) and target data** | Locking, reading STT data, and what breaks a lock. |
| 4 | **TWS: trackfiles, L&S and DT2** | Tracking several contacts and the designation ladder. |
| 5 | **IFF, NCTR and HAFU symbols** | Telling friend from foe before committing. |
| 6 | **ACM: close-in auto-acquisition** | Boresight, Wide and Vertical acquisition. |
| 7 | **PRF and the Doppler notch** | Why a beaming bandit can vanish from a pulse-Doppler radar. |

Finishing a lesson gets a checkmark on its card and offers the next one. You can do lessons in any order; the
tutorial is the best starting point.

## Sandbox

The sandbox is a fixed three-aircraft scenario (a bandit ahead, an F-16 that turns on the radar's IFF, and a high SU-27) with
the radar in STBY. Use it to practise. **Open the sandbox** in Start here, or press **EXIT** in a lesson, to reset it. Random encounters are
not built yet.

## Progress and privacy

Which lessons you have finished, and whether you have seen the welcome dialog, are stored in your browser's
`localStorage`. There are no accounts and nothing is sent anywhere. Clearing site data resets your progress. If your browser
blocks storage the trainer works normally but does not remember progress.

## Troubleshooting

- **Keys do nothing.** Scroll so the cockpit fills most of the screen, and make sure focus is not in a text field. Check the
  status bar is not showing **PAUSED**.
- **Nothing on the scope.** The radar starts in STBY: turn the RADAR knob to OPR. Then check the antenna elevation numbers cover the target's altitude.
- **A lock keeps breaking.** Check the target is within 70° of your nose, in range, and not beaming at 90° (see PRF above).
- **Stuck keys after switching windows.** Focus loss releases all held keys; press a key again to resume.
