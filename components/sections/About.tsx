import { SectionHeading } from './SectionHeading';

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

export function About() {
  return (
    <footer id="about" aria-labelledby="about-h" className="mx-auto max-w-5xl border-t border-white/5 px-4 py-16 font-sans text-base leading-relaxed">
      <SectionHeading id="about-h" label="SOURCES AND DISCLAIMER">
        Where the numbers come from
      </SectionHeading>
      <p className="mt-4 max-w-[65ch] text-ink/85">
        This is an unofficial training aid built from public sources, with simplified and partly estimated numbers. It is
        not affiliated with or endorsed by the US Navy, Boeing, RTX (Raytheon) or Eagle Dynamics, and it is not for
        real-world training. Much public detail about how the display and controls behave comes from flight-simulator
        documentation, because the real tactical manual is not public.
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        {SOURCES.map(([name, url]) => (
          <li key={url}>
            <a href={url} target="_blank" rel="noreferrer" className="text-phosphor underline decoration-phosphor/40 underline-offset-4 hover:decoration-phosphor">
              {name}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-ink/75">
        Fonts: B612 and B612 Mono, designed for cockpit screens by Airbus with Intactile Design (SIL Open Font License).
      </p>
    </footer>
  );
}
