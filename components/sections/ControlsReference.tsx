const th = 'px-2 py-1.5 text-left text-xs font-normal text-ink/70';
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
  ['PB15', 'NCTR on/off', 'NCTR', 'NCTR', '—', '—'],
  ['PB16', 'DATA page', 'DATA', 'DATA', '—', 'DATA (back)'],
  ['PB18', 'MENU', 'MENU', 'MENU', 'MENU', 'MENU'],
  ['PB19', 'Azimuth 20–140°', 'Azimuth (TWS limits)', '—', '—', '—'],
];

const HOTAS: [string, string, string][] = [
  ['TDC (throttle)', 'W A S D, or drag the pad', 'Move the cursor; push it into an edge to change range (top/bottom) or azimuth (left/right)'],
  ['TDC depress', 'Space', 'Designate: brick → lock (RWS); trackfile → ★, then ◇; ★ → lock (TWS); empty space → move the scan centre'],
  ['Antenna elevation', 'R / F', 'Raise / lower all bars together'],
  ['Castle forward', 'I', 'ACM Boresight'],
  ['Castle aft', 'K', 'In ACM: Vertical acquisition'],
  ['Castle left', 'J', 'In ACM: Wide acquisition'],
  ['Castle right', 'L', 'Reserved (no function yet)'],
  ['Castle press', 'O', 'IFF interrogation of the contact under the cursor'],
  ['Undesignate', 'U', 'Break lock / leave ACM; in TWS: make #1 the ★, swap ★ ◇, or step ★ through the ranks'],
];

const FLIGHT: [string, string][] = [
  ['← / →', 'Turn (hold Shift for fine turns)'],
  ['↑ / ↓', 'Nose down / nose up (descend / climb)'],
  ['+ / −', 'Speed up / slow down'],
  ['P', 'Pause'],
  ['M', 'Instructor map on/off'],
];

export function ControlsReference() {
  return (
    <section id="controls" aria-labelledby="controls-h" className="mx-auto max-w-5xl px-4 py-16">
      <h2 id="controls-h" className="text-xs tracking-[0.35em] text-phosphor">
        CONTROLS REFERENCE
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/80">
        Pushbuttons are numbered clockwise from the bottom of the left column: PB1–5 up the left side, PB6–10 across the top,
        PB11–15 down the right side, PB16–20 back along the bottom (PB18 is the middle one).
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <caption className="mb-2 text-left text-[11px] tracking-[0.3em] text-ink/75">PUSHBUTTONS BY PAGE</caption>
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
                <th scope="row" className={`${td} text-left font-normal text-phosphor`}>
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

      <div className="mt-10 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <caption className="mb-2 text-left text-[11px] tracking-[0.3em] text-ink/75">HOTAS</caption>
            <thead>
              <tr>
                <th scope="col" className={th}>Control</th>
                <th scope="col" className={th}>Key</th>
                <th scope="col" className={th}>What it does</th>
              </tr>
            </thead>
            <tbody>
              {HOTAS.map(([control, key, what]) => (
                <tr key={control}>
                  <th scope="row" className={`${td} text-left font-normal`}>
                    {control}
                  </th>
                  <td className={`${td} text-phosphor`}>
                    <kbd>{key}</kbd>
                  </td>
                  <td className={td}>{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="mb-2 text-left text-[11px] tracking-[0.3em] text-ink/75">FLYING AND THE PAGE</caption>
            <tbody>
              {FLIGHT.map(([key, what]) => (
                <tr key={key}>
                  <th scope="row" className={`${td} text-left font-normal text-phosphor`}>
                    <kbd>{key}</kbd>
                  </th>
                  <td className={td}>{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-ink/60">
        Keys work while the cockpit fills at least half the screen, so Space still scrolls the page down here. Every
        on-screen control can also be clicked or tapped.
      </p>
    </section>
  );
}
