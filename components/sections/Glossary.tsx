import { SectionHeading } from './SectionHeading';

const TERMS = [
  ['AACQ', 'Automatic Acquisition: castle toward the radar display locks the contact under the cursor (Fast Acq), else the L&S, else the closest trackfile; with none yet it arms ("AACQ") and locks the first contact the scan finds.'],
  ['ACM', 'Air Combat Maneuvering modes: automatic lock-on inside 10 nm (Boresight, Vertical, Wide acquisition).'],
  ['Bar', 'One horizontal sweep of the antenna. Several bars stacked 1.2° apart make up the scan.'],
  ['B-scope', 'The display format: azimuth across, range up. Not a map: close contacts are stretched sideways.'],
  ['BRAA', 'Bearing, Range, Altitude, Aspect: how a controller (AWACS) calls where a contact is.'],
  ['Brick', 'A raw radar hit in RWS: where a target was when the beam passed it. Fades with age.'],
  ['DDI', 'Digital Display Indicator: the Hornet cockpit screen with 20 pushbuttons around it.'],
  ['DT2', 'Secondary designated target (◇) in TWS.'],
  ['Frame', 'One complete pass over the whole scan volume. Frame time = how old the picture can get.'],
  ['HAFU', 'Hostile / Ambiguous / Friendly / Unknown: the trackfile symbol whose shape shows identity.'],
  ['HOTAS', 'Hands On Throttle And Stick: flying the radar without letting go of the controls.'],
  ['IFF', 'Identification Friend or Foe: an interrogation that a friendly transponder answers.'],
  ['L&S', 'Launch & Steering target (★): the primary designated target.'],
  ['LTWS', 'Latent TWS: in RWS, putting the cursor on a brick shows its trackfile, which you can then designate. On by default in DCS.'],
  ['MEM', 'Memory: the radar coasting on its last estimate after losing the target for a moment in STT.'],
  ['NCTR', 'Non-Cooperative Target Recognition: identifying an aircraft type from its engines, nose-on and in STT.'],
  ['Notch', 'The Doppler blind spot: targets moving across your line of sight look like ground clutter and are filtered out.'],
  ['PRF', 'Pulse Repetition Frequency: HI for long range nose-on, MED for all aspects, INTL for both.'],
  ['RWS', 'Range While Search: the basic search mode, showing bricks.'],
  ['STT', 'Single Target Track: a lock on one target. Best data; the target knows.'],
  ['TDC', 'Throttle Designator Controller: the thumb control that moves the cursor and designates.'],
  ['TDC priority', 'Which display the TDC is working on, marked by a diamond in its corner. The castle switch hands it over.'],
  ['TWS', 'Track While Scan: search that keeps trackfiles on several targets at once.'],
] as const satisfies readonly (readonly [string, string])[];

export type GlossaryTerm = (typeof TERMS)[number][0];
/** Anchor of a glossary entry, for links from the text. */
export const termId = (term: GlossaryTerm) => `g-${term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export function Glossary() {
  return (
    <section id="glossary" aria-labelledby="glossary-h" className="mx-auto max-w-5xl px-4 py-16 font-sans">
      <SectionHeading id="glossary-h" label="GLOSSARY">
        Terms and acronyms
      </SectionHeading>
      <dl className="mt-8 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {TERMS.map(([term, def]) => (
          <div key={term} id={termId(term)} className="term -mx-2 rounded-md px-2 py-1.5">
            <dt className="font-mono text-sm font-bold text-phosphor">{term}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-ink/85">{def}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
