import type { Prf } from './types.ts';
import {
  BEAMWIDTH_DEG, HPRF_NONCLOSING_FACTOR, NOTCH_KT, PD_EXPONENT, R50_HPRF_NM, R50_MPRF_NM, REF_RCS_M2,
} from './constants.ts';

/** PRF actually used on this bar: INTL alternates bar by bar and reverses every frame. */
export const barPrf = (prf: Prf, bar: number, frame: number): 'HI' | 'MED' =>
  prf !== 'INTL' ? prf : (bar + frame) % 2 === 0 ? 'HI' : 'MED';

/** Range (nm) with a 50% chance of detection per look. Scales with the fourth root of RCS.
 *  approachKt = target speed toward us, kt; + = approaching. */
export function r50(prf: 'HI' | 'MED', rcs: number, approachKt: number) {
  const base = prf === 'MED' ? R50_MPRF_NM : approachKt > 0 ? R50_HPRF_NM : R50_HPRF_NM * HPRF_NONCLOSING_FACTOR;
  return base * (rcs / REF_RCS_M2) ** 0.25;
}

export const probability = (rangeNm: number, r50Nm: number) => 1 / (1 + (rangeNm / r50Nm) ** PD_EXPONENT);

export const inNotch = (radialKt: number) => Math.abs(radialKt) < NOTCH_KT;

export const inBeam = (az: number, el: number, ant: { az: number; el: number }) =>
  Math.abs(az - ant.az) <= BEAMWIDTH_DEG / 2 && Math.abs(el - ant.el) <= BEAMWIDTH_DEG / 2;
