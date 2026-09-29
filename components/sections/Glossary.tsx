const TERMS: [string, string][] = [
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
  ['MEM', 'Memory: the radar coasting on its last estimate after losing the target for a moment in STT.'],
  ['NCTR', 'Non-Cooperative Target Recognition: identifying an aircraft type from its engines, nose-on and in STT.'],
  ['Notch', 'The Doppler blind spot: targets moving across your line of sight look like ground clutter and are filtered out.'],
  ['PRF', 'Pulse Repetition Frequency: HI for long range nose-on, MED for all aspects, INTL for both.'],
  ['RWS', 'Range While Search: the basic search mode, showing bricks.'],
  ['STT', 'Single Target Track: a lock on one target. Best data; the target knows.'],
  ['TDC', 'Throttle Designator Controller: the thumb control that moves the cursor and designates.'],
  ['TWS', 'Track While Scan: search that keeps trackfiles on several targets at once.'],
];

export function Glossary() {
  return (
    <section id="glossary" aria-labelledby="glossary-h" className="mx-auto max-w-5xl px-4 py-16">
      <h2 id="glossary-h" className="text-xs tracking-[0.35em] text-phosphor">
        GLOSSARY
      </h2>
      <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {TERMS.map(([term, def]) => (
          <div key={term}>
            <dt className="text-sm font-bold text-phosphor">{term}</dt>
            <dd className="mt-1 text-sm leading-relaxed text-ink/80">{def}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
