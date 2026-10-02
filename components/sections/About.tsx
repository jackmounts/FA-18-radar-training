const SOURCES: [string, string][] = [
  ['US Navy NATOPS pocket checklist, F/A-18A/B/C/D (public copy)', 'https://www.docdroid.net/file/download/uQCJuVs/f-18abcd-hornet-pocket-checklist-pdf.pdf'],
  ['DOT&E FY97 report: F/A-18C/D and the APG-73', 'https://www.globalsecurity.org/military/library/budget/fy1997/dot-e/navy/97fa18cd.html'],
  ['IDA 1983 case study of the APG-65 (DTIC)', 'https://archive.org/stream/DTIC_ADA142103/DTIC_ADA142103_djvu.txt'],
  ['Forecast International: AN/APG-73', 'https://www.forecastinternational.com/archive/disp_pdf.cfm?DACH_RECNO=730'],
  ['Raytheon news release on the last APG-73 (2006)', 'https://raytheon.mediaroom.com/index.php?s=43&item=471'],
  ['Eagle Dynamics radar white paper (detection-range estimates)', 'https://www.digitalcombatsimulator.com/upload/medialibrary/751/420tvzzkl8vyxzukcdzamjf7gcrhwzmo/Eagle_Dynamics_Radar_White_Paper_v1.pdf'],
  ['Hoggit wiki: F/A-18C display and HOTAS reference', 'https://wiki.hoggitworld.com/view/F/A-18C'],
  ['BAE Systems AN/APX-111 datasheet (IFF)', 'https://www.baesystems.com/en-us/dam/jcr:44b079f8-55e6-4f0f-8bac-49e3f8943088/20-A90-05-AN-APX-111V-CIT-FA-18-datasheet-2025-web.pdf'],
];

const heading = 'mb-3 font-mono text-xs tracking-[0.35em] text-phosphor';
const link = 'text-phosphor underline decoration-phosphor/40 underline-offset-4 hover:decoration-phosphor';

/** The closing sheet: rounded top, overlapping the last section, sliding up as it scrolls in (globals.css). */
export function About() {
  return (
    <footer
      id="about"
      aria-labelledby="about-h"
      className="footer-sheet relative z-10 -mt-6 rounded-t-3xl bg-linear-to-b from-[#1d5e31] via-[#123d20] to-[#08140c] font-sans text-base leading-relaxed text-[#e8f3ea] shadow-[0_-16px_40px_rgb(0_0_0/0.55)]"
    >
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-12">
        <div aria-hidden className="mx-auto -mt-8 mb-10 h-1 w-12 rounded-full bg-white/25" />
        <h2 id="about-h" className="text-2xl font-bold leading-tight">
          <span className="mb-2 block font-mono text-xs font-normal tracking-[0.35em] text-phosphor">ABOUT THIS TRAINER</span>
          Sources, disclaimer and privacy
        </h2>

        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <section aria-labelledby="disclaimer-h">
            <h3 id="disclaimer-h" className={heading}>DISCLAIMER</h3>
            <p className="max-w-[65ch]">
              An unofficial training aid built from public sources, with simplified and partly estimated numbers. It is
              not affiliated with or endorsed by the US Navy, Boeing, RTX (Raytheon) or Eagle Dynamics, and it is not for
              real-world training. Much public detail about how the display and controls behave comes from
              flight-simulator documentation, because the real tactical manual is not public. It is not a DCS companion
              either: behaviour follows public sources and may differ from DCS.
            </p>
          </section>

          <section id="privacy" aria-labelledby="privacy-h">
            <h3 id="privacy-h" className={heading}>PRIVACY</h3>
            <p className="max-w-[65ch]">
              No cookies, no analytics, no third-party requests. Your key bindings and lesson progress are saved in your
              browser&apos;s local storage and never leave your device. The web server keeps no logs.
            </p>
          </section>

          <section aria-labelledby="sources-h" className="md:col-span-2">
            <h3 id="sources-h" className={heading}>WHERE THE NUMBERS COME FROM</h3>
            <ul className="grid gap-x-10 gap-y-2 text-sm md:grid-cols-2">
              {SOURCES.map(([name, url]) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer" className={link}>
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-[#e8f3ea]/75">
          <p>
            Fonts: B612 and B612 Mono by Airbus with Intactile Design (SIL Open Font License). Code: MIT License.
          </p>
          <a href="#cockpit" className={link}>
            ▲ Back to the cockpit
          </a>
        </div>
      </div>
    </footer>
  );
}
