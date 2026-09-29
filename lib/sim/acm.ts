import type { AcmPattern, Antenna } from './types.ts';
import { BEAMWIDTH_DEG, SCAN_RATE_DPS } from './constants.ts';
import { clamp } from './geometry.ts';

/** Beam positions across the pattern's short axis, one beamwidth apart; the beam sweeps along the long axis. */
export function acmLanes(p: AcmPattern): { long: 'az' | 'el'; lanes: number[] } {
  const long = p.el[1] - p.el[0] > p.az[1] - p.az[0] ? 'el' : 'az';
  const [s0, s1] = long === 'el' ? p.az : p.el;
  const n = Math.max(1, Math.ceil((s1 - s0) / BEAMWIDTH_DEG));
  const lanes =
    n === 1
      ? [(s0 + s1) / 2]
      : Array.from({ length: n }, (_, i) => s0 + BEAMWIDTH_DEG / 2 + (i * (s1 - s0 - BEAMWIDTH_DEG)) / (n - 1));
  return { long, lanes };
}

/** ACM scan: sweep the long axis at the scan rate, stepping one lane per pass; a frame is one pass per lane. */
export function stepAcmAntenna(ant: Antenna, p: AcmPattern, dt: number) {
  const { long, lanes } = acmLanes(p);
  const [l0, l1] = long === 'el' ? p.el : p.az;
  if (ant.bar >= lanes.length) ant.bar = 0;
  let pos = clamp(long === 'el' ? ant.el : ant.az, l0, l1) + ant.dir * SCAN_RATE_DPS * dt;
  if (pos > l1 || pos < l0) {
    pos = clamp(pos, l0, l1);
    ant.dir = ant.dir === 1 ? -1 : 1;
    ant.bar = (ant.bar + 1) % lanes.length;
    if (ant.bar === 0) ant.frame += 1;
  }
  if (long === 'el') {
    ant.el = pos;
    ant.az = lanes[ant.bar];
  } else {
    ant.az = pos;
    ant.el = lanes[ant.bar];
  }
}
