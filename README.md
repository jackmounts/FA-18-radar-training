# Hornet Radar Trainer

An unofficial, sim-agnostic trainer for the F/A-18 AN/APG-73 radar, aimed at newbies. Learn what the radar is
doing (scan, PRF, Doppler notch, TDC, STT) in a small playable sandbox, with no simulator required.

**Status:** Plan 1 - playable RWS/STT sandbox (search, cursor/TDC, designate, lock, fly the ownship).

## Scripts

- `npm run dev` - dev server
- `npm test` - unit tests (`node --test "lib/**/*.test.ts"`)
- `npm run build` - static export to `out/`

## Controls

| Action | Keys |
| --- | --- |
| TDC | `W A S D` |
| Designate / undesignate | `Space` / `U` |
| Antenna elevation | `R` / `F` |
| Castle (fwd/left/aft/right, press) | `I J K L`, `O` |
| Fly | `←`/`→` turn, `↑` nose down, `↓` nose up |
| Speed | `+` / `-` |
| Pause | `P` |

The DDI pushbuttons (PB1-20) are clickable on screen.

## Docs

- Radar research: `docs/research/apg-73.md`
- Specs: `docs/superpowers/specs/`
- Plans: `docs/superpowers/plans/`

## Disclaimer

Built from public sources with simplified numbers for training. Not affiliated with, or endorsed by, the US Navy,
Boeing, RTX or Eagle Dynamics.
