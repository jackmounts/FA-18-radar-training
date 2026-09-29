import type { Sim } from './types.ts';
import { AGE_OPTIONS, AZ_WIDTHS, BAR_COUNTS, PRFS, RANGE_SCALES } from './constants.ts';
import { barPrf } from './detection.ts';
import { breakLock, cycle } from './radar.ts';

export type Pushbutton = { label: string; boxed?: boolean; press?: () => void };

/** DDI pushbutton labels and actions for the current radar state (A/A radar attack format). */
export function pushbuttons(sim: Sim): Record<number, Pushbutton> {
  const r = sim.radar;
  const pbs: Record<number, Pushbutton> = { 18: { label: 'MENU' } };
  if (r.dataPage) {
    pbs[10] = { label: `AGE\n${r.age}`, press: () => { r.age = cycle(AGE_OPTIONS, r.age); } };
    pbs[16] = { label: 'DATA', boxed: true, press: () => { r.dataPage = false; } };
    return pbs;
  }
  const stt = r.mode === 'STT';
  pbs[1] = {
    label: r.prf === 'INTL' ? `${barPrf(r.prf, r.antenna.bar, r.antenna.frame)}\nINTL` : r.prf,
    press: () => { r.prf = cycle(PRFS, r.prf); },
  };
  pbs[5] = stt ? { label: 'RTS\nRWS', press: () => breakLock(sim, 'Returned to search') } : { label: 'RWS' };
  pbs[6] = { label: `${r.bars}B ${r.antenna.bar + 1}`, press: stt ? undefined : () => { r.bars = cycle(BAR_COUNTS, r.bars); } };
  pbs[7] = { label: 'SIL', boxed: r.sil, press: () => { r.sil = !r.sil; } };
  pbs[16] = { label: 'DATA', press: () => { r.dataPage = true; } };
  if (stt) return pbs;
  pbs[8] = { label: 'ERASE', press: () => { r.bricks = []; } };
  pbs[11] = { label: '↑', press: () => { r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, 1); } };
  pbs[12] = { label: '↓', press: () => { r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, -1); } };
  pbs[19] = { label: `${r.azWidth}°`, press: () => { r.azWidth = cycle(AZ_WIDTHS, r.azWidth); } };
  return pbs;
}
