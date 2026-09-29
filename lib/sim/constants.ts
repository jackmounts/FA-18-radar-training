// Every tunable lives here. ESTIMATE = not public; see docs/research/apg-73.md.
import type { Prf } from './types.ts';

export const SIM_DT = 1 / 60;
export const NM_FT = 6076.12;

// Antenna
export const SCAN_RATE_DPS = 80; // ESTIMATE: fits the TWS <= 3 s frame limits
export const BAR_SPACING_DEG = 1.2;
export const BEAMWIDTH_DEG = 3.3;
export const GIMBAL_AZ_DEG = 70;
export const GIMBAL_EL_DEG = 60;
export const ELEV_RATE_DPS = 10; // ESTIMATE: antenna elevation wheel slew rate
export const AZ_WIDTHS: readonly number[] = [20, 40, 60, 80, 140];
export const BAR_COUNTS: readonly number[] = [1, 2, 4, 6];
export const RANGE_SCALES: readonly number[] = [5, 10, 20, 40, 80, 160];
export const AGE_OPTIONS: readonly number[] = [2, 4, 8, 16, 32];
export const PRFS: readonly Prf[] = ['MED', 'HI', 'INTL'];

// TWS keeps the frame near 3 s: no 1-bar scan, and azimuth capped per bar count
export const TWS_BARS: readonly number[] = [2, 4, 6];
export const TWS_MAX_AZ: Readonly<Record<number, number>> = { 2: 80, 4: 60, 6: 40 };

// Detection — ESTIMATE, from Eagle Dynamics' radar white paper
export const R50_HPRF_NM = 65;
export const R50_MPRF_NM = 30;
export const HPRF_NONCLOSING_FACTOR = 0.25;
export const REF_RCS_M2 = 5;
export const PD_EXPONENT = 6;
export const NOTCH_KT = 90;
export const MAX_RANGE_NM = 160;
export const MAX_BRICKS = 64;

// Tracking
export const STT_MEMORY_S = 3;
export const MAX_TRACKS = 10; // the real radar maintains 10 trackfiles
export const TRACK_MIN_COAST_S = 8; // ESTIMATE: shortest time a trackfile survives without a detection

// Cursor (display units: the tactical region is 1 x 1)
export const TDC_RATE = 0.5;
export const TDC_HIT = 0.03;

// Flight
export const TURN_RATE_DPS = 6;
export const FINE_TURN_RATE_DPS = 1.5;
export const CLIMB_FPS = 100;
export const ACCEL_KTPS = 10;
export const MIN_ALT_FT = 500;
export const MAX_ALT_FT = 50000;
export const MIN_SPD_KT = 200;
export const MAX_SPD_KT = 750;
export const TARGET_TURN_DPS = 3;
export const TARGET_CLIMB_FPS = 50;

// Identification
export const IFF_HALF_WIDTH_DEG = 11; // one IFF interrogation scan is 22° wide
export const NCTR_MAX_ASPECT_DEG = 30; // ESTIMATE: NCTR needs a nose-on view of the engines
export const NCTR_MAX_RANGE_NM = 25; // ESTIMATE
export const NCTR_TIME_S = 2; // ESTIMATE: time on target before a print appears
