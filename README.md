# Hornet Radar Trainer

An unofficial, sim-agnostic trainer for the F/A-18 AN/APG-73 radar, aimed at newbies. Learn what the radar
is doing (scan, PRF, Doppler notch, TWS, TDC, STT, IFF/NCTR, ACM) in a small playable sandbox, with no simulator required.

**New here? Read the [User Guide](docs/USER_GUIDE.md)** for the controls, how to read the display and what each lesson teaches.

## Status

Playable today: the radar display with RWS, TWS, STT and ACM (BST / VACQ / WACQ), IFF and NCTR identification, a
tutorial plus seven lessons, a fixed sandbox scenario and a toggleable instructor map. Progress is kept in `localStorage`.
Not built yet: random free-play encounters (plan 5).

## Development

Requires a recent Node (tests rely on native TypeScript support).

```bash
npm install
npm run dev     # dev server
npm test        # unit tests: node --test "lib/**/*.test.ts"
npm run lint
npm run build   # static export to out/
```

The site is a static export and can be hosted anywhere. `CLAUDE.md` describes the architecture (framework-free simulation
in `lib/`, React cockpit in `components/`).

## Docs

- [User Guide](docs/USER_GUIDE.md)
- Radar research: [`docs/research/apg-73.md`](docs/research/apg-73.md)
- Specs: `docs/superpowers/specs/`
- Plans: `docs/superpowers/plans/`

## Disclaimer

Built from public sources with simplified numbers for training. Not affiliated with, or endorsed by, the US Navy,
Boeing, RTX or Eagle Dynamics.
