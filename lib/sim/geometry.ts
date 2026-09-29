import { BAR_SPACING_DEG, BEAMWIDTH_DEG, GIMBAL_AZ_DEG, NM_FT } from './constants.ts';

type Point = { x: number; y: number };
type Mover = Point & { hdg: number; spd: number };

export const rad = (d: number) => (d * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const wrap360 = (a: number) => ((a % 360) + 360) % 360;
export const wrap180 = (a: number) => wrap360(a + 180) - 180;
/** Heading as three digits, 001..360. */
export const hdg3 = (h: number) => String(Math.round(wrap360(h)) % 360 || 360).padStart(3, '0');

/** True bearing from one point to another: 0 = north, clockwise. */
export const bearing = (from: Point, to: Point) => wrap360(deg(Math.atan2(to.x - from.x, to.y - from.y)));
export const range = (from: Point, to: Point) => Math.hypot(to.x - from.x, to.y - from.y);
/** Azimuth of `to` off the nose of `own`, -180..180, right positive. */
export const relAz = (own: Point & { hdg: number }, to: Point) => wrap180(bearing(own, to) - own.hdg);
/** Elevation angle to a target in degrees (flat earth). */
export const elevation = (ownAlt: number, tgtAlt: number, rangeNm: number) =>
  deg(Math.atan2(tgtAlt - ownAlt, rangeNm * NM_FT));

export function velocity(m: Mover) {
  return { vx: m.spd * Math.sin(rad(m.hdg)), vy: m.spd * Math.cos(rad(m.hdg)) };
}

function los(from: Point, to: Point) {
  const r = range(from, to) || 1e-9;
  return { ux: (to.x - from.x) / r, uy: (to.y - from.y) / r };
}

/** Target ground speed along the line of sight, kt (+ = moving away). This is what the Doppler notch sees. */
export function radialSpeed(own: Point, tgt: Mover) {
  const { ux, uy } = los(own, tgt);
  const v = velocity(tgt);
  return v.vx * ux + v.vy * uy;
}

/** Closure rate, kt (+ = closing). */
export function closure(own: Mover, tgt: Mover) {
  const { ux, uy } = los(own, tgt);
  const o = velocity(own);
  const t = velocity(tgt);
  return (o.vx - t.vx) * ux + (o.vy - t.vy) * uy;
}

/** Angle between the target's nose and the line back to us: 0 = hot (nose-on), 180 = cold. */
export const aspect = (own: Point, tgt: Mover) => Math.abs(wrap180(bearing(tgt, own) - tgt.hdg));

/** B-scope: u 0..1 = azimuth -70..+70 deg; v 0..1 = top (full scale) .. bottom (zero range). */
export const toBscope = (az: number, rangeNm: number, scaleNm: number) => ({
  u: (az + GIMBAL_AZ_DEG) / (2 * GIMBAL_AZ_DEG),
  v: 1 - rangeNm / scaleNm,
});
export const fromBscope = (u: number, v: number, scaleNm: number) => ({
  az: u * 2 * GIMBAL_AZ_DEG - GIMBAL_AZ_DEG,
  range: (1 - v) * scaleNm,
});

/** Altitudes (thousands of ft) the scan covers at a given range: the numbers beside the cursor. */
export function altitudeCoverage(ownAlt: number, rangeNm: number, elev: number, bars: number) {
  const half = ((bars - 1) / 2) * BAR_SPACING_DEG + BEAMWIDTH_DEG / 2;
  const at = (a: number) => clamp(Math.round((ownAlt + rangeNm * NM_FT * Math.sin(rad(a))) / 1000), -99, 99);
  return { hi: at(elev + half), lo: at(elev - half) };
}

/** Mach number from true airspeed (kt), using the ISA temperature at altitude. */
export function mach(spdKt: number, altFt: number) {
  const tempK = Math.max(216.65, 288.15 - 0.0019812 * altFt);
  return spdKt / (661.47 * Math.sqrt(tempK / 288.15));
}
