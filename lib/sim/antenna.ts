import type { Antenna } from './types.ts';
import { BAR_SPACING_DEG, GIMBAL_AZ_DEG, SCAN_RATE_DPS } from './constants.ts';
import { clamp } from './geometry.ts';

export type Scan = { azWidth: number; bars: number; scanCenter: number; elev: number };

export const frameTime = (azWidth: number, bars: number) => (azWidth * bars) / SCAN_RATE_DPS;

export function scanEdges(s: Scan): [number, number] {
  const half = s.azWidth / 2;
  const c = clamp(s.scanCenter, -GIMBAL_AZ_DEG + half, GIMBAL_AZ_DEG - half);
  return [c - half, c + half];
}

export const barElevation = (s: Scan, bar: number) => s.elev + ((s.bars - 1) / 2 - bar) * BAR_SPACING_DEG;

/** Raster scan: sweep one bar, reverse at the edge and step down a bar; after the last bar jump back to bar 1. */
export function stepAntenna(ant: Antenna, s: Scan, dt: number) {
  const [lo, hi] = scanEdges(s);
  if (ant.bar >= s.bars) ant.bar = 0;
  ant.az = clamp(ant.az, lo, hi) + ant.dir * SCAN_RATE_DPS * dt;
  if (ant.az > hi || ant.az < lo) {
    ant.az = clamp(ant.az, lo, hi);
    ant.dir = ant.dir === 1 ? -1 : 1;
    ant.bar += 1;
    if (ant.bar >= s.bars) {
      ant.bar = 0;
      ant.frame += 1;
    }
  }
  ant.el = barElevation(s, ant.bar);
}
