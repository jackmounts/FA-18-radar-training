# Hornet Radar Trainer

An unofficial, interactive trainer for the F/A-18C Hornet's **AN/APG-73** radar, for newcomers. It does not depend on any particular flight sim.

**New here? Read the [User Guide](docs/USER_GUIDE.md)** for controls, how to read the display and what each lesson teaches.

What the site includes:
- **Radar display (DDI):** a simplified B-scope display with its 20 pushbuttons.
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
npm test         # simulation, renderer and lesson tests (node:test, needs a recent Node with type stripping)
npm run lint     # eslint
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

## Deploy

The site is a static export, served by nginx in a container on `127.0.0.1:3100`. Put your own reverse proxy in front of it (e.g. Caddy: `reverse_proxy 127.0.0.1:3100`).

```bash
docker compose up -d --build
```

To ship a new version, `git pull` and run the same command again.

## Disclaimer

- Unofficial.
- Built from public sources, with simplified and partly estimated numbers.
- Not affiliated with the US Navy, Boeing, RTX or Eagle Dynamics.
- Not for real-world training.
