import { eyebrow, SectionHeading } from './SectionHeading';

const th = 'px-2 py-1.5 text-left text-xs font-normal text-ink/75';
const td = 'border-t border-white/5 px-2 py-1.5 align-top';

// Verified against lib/sim/pushbuttons.ts: which PBs exist on which page.
const PB_ROWS: [string, string, string, string, string, string][] = [
  ['PB1', 'PRF (MED / HI / INTL)', 'PRF', 'PRF', '—', '—'],
  ['PB5', 'RWS → TWS', 'TWS → RWS', 'RTS (back to search)', 'Shows the ACM sub-mode', '—'],
  ['PB6', 'Bars 1/2/4/6', 'Bars 2/4/6', 'Bar number only', '—', '—'],
  ['PB7', 'SIL (silent)', 'SIL', 'SIL', 'SIL', '—'],
  ['PB8', 'ERASE bricks', '—', '—', '—', '—'],
  ['PB10', '—', '—', 'TWS (keep target as ★)', '—', 'AGE 2–32 s'],
  ['PB11 / 12', 'Range ↑ / ↓', 'Range ↑ / ↓', '—', '—', '—'],
  ['PB13', '—', 'AUTO / MAN centring', '—', '—', '—'],
  ['PB14', 'RSET (clear ★ ◇)', 'RSET', 'RSET', '—', '—'],
  ['PB15', 'NCTR on/off', 'NCTR', 'NCTR', '—', 'LTWS on/off'],
  ['PB16', 'DATA page', 'DATA', 'DATA', '—', 'DATA (back)'],
  ['PB18', 'MENU', 'MENU', 'MENU', 'MENU', 'MENU'],
  ['PB19', 'Azimuth 20–140°', 'Azimuth (TWS limits)', '—', '—', '—'],
];

export function ControlsReference() {
  return (
    <section id="controls" aria-labelledby="controls-h" className="mx-auto max-w-5xl px-4 py-16 font-sans">
      <SectionHeading id="controls-h" label="CONTROLS REFERENCE">
        The pushbuttons, page by page
      </SectionHeading>
      <p className="mt-3 max-w-[65ch] text-base leading-relaxed text-ink/85">
        Pushbuttons are numbered clockwise from the bottom of the left column: PB1–5 up the left side, PB6–10 across the top,
        PB11–15 down the right side, PB16–20 back along the bottom (PB18 is the middle one). To see or change the keyboard
        and joystick bindings, use the CONTROLS button at the top of the cockpit.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <caption className={`mb-2 text-left ${eyebrow}`}>PUSHBUTTONS BY PAGE</caption>
          <thead>
            <tr>
              {['PB', 'RWS', 'TWS', 'STT', 'ACM', 'DATA'].map((c) => (
                <th key={c} scope="col" className={th}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PB_ROWS.map(([pb, ...cells]) => (
              <tr key={pb}>
                <th scope="row" className={`${td} text-left font-mono font-normal text-phosphor`}>
                  {pb}
                </th>
                {cells.map((c, i) => (
                  <td key={i} className={td}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
