import type { ReactNode } from 'react';
import { frameTime } from '@/lib/sim/antenna';
import { SCAN_RATE_DPS } from '@/lib/sim/constants';

const h3 = 'mt-10 text-sm font-bold tracking-wide text-phosphor';
const p = 'mt-3 text-sm leading-relaxed text-ink/85';
const SCANS: [number, number][] = [[140, 4], [140, 6], [80, 2], [60, 4], [20, 2]];

/** The same three aircraft drawn as a real top-down picture and as a B-scope. */
function BscopeDiagram() {
  const wedge = 'M150 190 L40 60 A150 150 0 0 1 260 60 Z';
  return (
    <svg viewBox="0 0 520 210" role="img" aria-labelledby="bscope-title" className="mt-4 w-full max-w-xl">
      <title id="bscope-title">
        The same three aircraft in a top-down view (left) and on the B-scope (right): the close ones spread out along the bottom edge.
      </title>
      <path d={wedge} fill="rgba(109,255,138,0.08)" stroke="#2f7a42" />
      <polygon points="150,182 144,196 156,196" fill="#c7cfc8" />
      <circle cx="120" cy="70" r="5" fill="#ff7a6b" />
      <circle cx="200" cy="95" r="5" fill="#ff7a6b" />
      <circle cx="170" cy="160" r="5" fill="#ff7a6b" />
      <text x="150" y="207" fill="#c7cfc8" fontSize="11" textAnchor="middle">
        top-down (real)
      </text>
      <rect x="320" y="20" width="180" height="170" fill="#030a05" stroke="#6dff8a" />
      <rect x="378" y="44" width="12" height="5" fill="#6dff8a" />
      <rect x="447" y="80" width="12" height="5" fill="#6dff8a" />
      <rect x="478" y="163" width="12" height="5" fill="#6dff8a" />
      <text x="410" y="207" fill="#c7cfc8" fontSize="11" textAnchor="middle">
        B-scope (azimuth →, range ↑)
      </text>
    </svg>
  );
}

/** The four HAFU identity shapes (top half of the symbol). */
function HafuDiagram() {
  const items: [string, ReactNode][] = [
    ['Unknown', <path key="u" d="M10 30 V14 H40 V30" fill="none" stroke="#6dff8a" strokeWidth="2" />],
    ['Ambiguous', <g key="a"><path d="M10 30 V14 H40 V30" fill="none" stroke="#6dff8a" strokeWidth="2" /><rect x="10" y="11" width="30" height="5" fill="#6dff8a" /></g>],
    ['Friendly', <path key="f" d="M10 30 A15 15 0 0 1 40 30" fill="none" stroke="#6dff8a" strokeWidth="2" />],
    ['Hostile', <path key="h" d="M10 30 L25 10 L40 30" fill="none" stroke="#6dff8a" strokeWidth="2" />],
  ];
  return (
    <ul className="mt-4 flex flex-wrap gap-6">
      {items.map(([name, shape]) => (
        <li key={name} className="flex flex-col items-center gap-1 text-xs text-ink/80">
          <svg viewBox="0 0 50 36" aria-hidden="true" className="h-9 w-12">
            {shape}
          </svg>
          {name}
        </li>
      ))}
    </ul>
  );
}

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-h" className="mx-auto max-w-3xl px-4 py-16">
      <h2 id="how-h" className="text-xs tracking-[0.35em] text-phosphor">
        HOW THE APG-73 WORKS
      </h2>
      <p className={p}>
        The AN/APG-73 is the F/A-18C/D Hornet&apos;s X-band pulse-Doppler radar, an upgrade of the earlier APG-65 with much
        faster processing. Its antenna is a flat plate that the radar physically swings around to scan the sky. Everything
        below is how this trainer models it, from public sources and with simplified numbers.
      </p>

      <h3 className={h3}>The B-scope is not a map</h3>
      <p className={p}>
        The display plots azimuth (left–right of your nose, ±70°) across and range (0 at the bottom) up. Because every
        range gets the full width, contacts close to you are stretched along the bottom edge and the picture no longer
        matches the real geometry. A target on a collision course keeps the same azimuth and slides straight down. The
        instructor map shows the true picture beside the scope.
      </p>
      <BscopeDiagram />

      <h3 className={h3}>Scan volume and frame time</h3>
      <p className={p}>
        The antenna sweeps one horizontal line, a <em>bar</em>, then steps down and sweeps back. Azimuth width × bars is
        the volume searched, and the time to cover it all is the frame time. At about {SCAN_RATE_DPS}°/s (an estimate):
      </p>
      <table className="mt-4 w-full max-w-sm text-left text-sm">
        <thead className="text-xs text-ink/70">
          <tr>
            <th className="py-1 font-normal">Scan</th>
            <th className="py-1 font-normal">Frame time</th>
          </tr>
        </thead>
        <tbody>
          {SCANS.map(([az, bars]) => (
            <tr key={`${az}-${bars}`} className="border-t border-white/5">
              <td className="py-1">
                {az}° × {bars} bars
              </td>
              <td className="py-1">{frameTime(az, bars).toFixed(1)} s</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={p}>
        A bigger scan means an older picture: between looks the radar only knows where a target <em>was</em>. Search wide
        to find, then narrow the scan (or move its centre with the TDC) to follow.
      </p>

      <h3 className={h3}>Elevation and altitude coverage</h3>
      <p className={p}>
        The bars are stacked 1.2° apart around the antenna elevation you set with the wheel. That thin wedge gets taller
        with distance: the two numbers beside the cursor are the highest and lowest altitudes (thousands of feet) it covers
        at the cursor&apos;s range. A target at long range can easily fly above or below it. Check the numbers where you
        expect the bandit and roll the antenna until it paints.
      </p>

      <h3 className={h3}>PRF and the Doppler notch</h3>
      <p className={p}>
        A pulse-Doppler radar separates aircraft from the ground by their speed toward you. HI pulse-repetition frequency
        sees nose-on targets far away but struggles with anything moving away; MED sees every aspect at shorter range;
        INTL alternates the two bar by bar. Anything whose speed along your line of sight matches the ground&apos;s is
        thrown away with the clutter. A bandit flying 90° across your line of sight (&quot;beaming&quot;) drops into that
        notch and disappears.
      </p>

      <h3 className={h3}>RWS, TWS and STT</h3>
      <p className={p}>
        <strong>RWS</strong> (Range While Search) paints raw hits, or <em>bricks</em>, that fade with age: good for finding
        things. <strong>TWS</strong> (Track While Scan) limits the scan so every contact is revisited within about 3 s and
        keeps a <em>trackfile</em> on each. You designate a primary target (L&amp;S, ★) and a secondary (DT2, ◇).{' '}
        <strong>STT</strong> (Single Target Track) points the antenna at one target continuously: the best data, but that
        target&apos;s warning receiver knows it is locked, and the lock breaks if the target leaves the ±70° gimbal limit
        or stays in the notch for more than 3 s.
      </p>
      <p className={p}>
        RWS keeps trackfiles too, just hidden. With <strong>Latent TWS</strong> (on by default, as in DCS) the cursor on a
        brick shows its trackfile, so the first TDC press designates it (★) and the second one locks. Pushing the castle
        switch toward the radar display (<strong>Fast Acquisition</strong>) locks whatever is under the cursor in one press.
      </p>

      <h3 className={h3}>ACM: close-in auto-acquisition</h3>
      <p className={p}>
        Inside 10 nm there is no time to hunt for bricks. Push the castle switch forward for <strong>Boresight</strong> (a
        3.3° beam down the nose). Inside ACM, castle left gives <strong>Wide</strong> acquisition (a 60°-wide box) and aft
        gives <strong>Vertical</strong> acquisition (a tall column above the nose, for turning fights). Each mode locks the
        first aircraft it finds in its box.
      </p>

      <h3 className={h3}>Which mode, and when</h3>
      <ul className={`${p} list-disc space-y-2 pl-5`}>
        <li>
          <strong>RWS: searching.</strong> Wide scan, long range, nobody knows you are looking yet. Use it to find contacts
          and to check a wide piece of sky. Bricks are only raw hits, so you get little data on them.
        </li>
        <li>
          <strong>TWS: building the picture.</strong> Once there are several contacts, or you want to watch where they are
          going without committing. You get heading and speed on each, at the price of a narrower scan. Designate L&amp;S
          for the one you care about and DT2 for the next.
        </li>
        <li>
          <strong>STT: committing.</strong> You have decided on one target and want the best data, for example to shoot or to
          run NCTR. It is also the loudest choice: the target&apos;s warning receiver sees the lock, and the rest of the
          picture stops updating while you stare at one aircraft.
        </li>
        <li>
          <strong>ACM: the visual fight.</strong> Inside about 10 nm, when hunting for a contact is too slow. Pick Boresight
          if the target is on the nose, Wide if it is off to the side, Vertical in a turning fight.
        </li>
      </ul>
      <p className={p}>
        A typical flow: RWS to find, TWS to sort, STT to shoot. Drop to ACM only if the merge happens.
      </p>

      <h3 className={h3}>IFF, NCTR and HAFU symbols</h3>
      <p className={p}>
        Pressing the castle switch interrogates the aircraft under the cursor. A friendly&apos;s transponder replies; silence
        makes a contact <em>ambiguous</em>, not hostile. In STT, NCTR (non-cooperative target recognition) can identify the
        engine type of a nose-on target inside about 25 nm; an ambiguous contact with a hostile type becomes{' '}
        <em>hostile</em>. The symbols show identity by shape:
      </p>
      <HafuDiagram />
      <p className="mt-6 text-xs leading-relaxed text-ink/60">
        Scan rate, detection ranges, the NCTR limits and some timings are estimates: the real figures are not public. See
        Sources below.
      </p>
    </section>
  );
}
