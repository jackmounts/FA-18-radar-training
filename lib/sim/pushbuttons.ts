import type { Sim } from './types.ts';
import { AGE_OPTIONS, PRFS, RANGE_SCALES } from './constants.ts';
import { barPrf } from './detection.ts';
import { azOptions, barOptions, breakLock, clipScan, cycle, rset, setSearchMode, sttToTws } from './radar.ts';

export type Pushbutton = { label: string; boxed?: boolean; press?: () => void };

/** DDI pushbutton labels and actions for the current radar state (A/A radar attack format). */
export function pushbuttons(sim: Sim): Record<number, Pushbutton> {
  const r = sim.radar;
  const pbs: Record<number, Pushbutton> = { 18: { label: 'MENU' } };
  if (r.dataPage) {
    pbs[10] = { label: `AGE\n${r.age}`, press: () => { r.age = cycle(AGE_OPTIONS, r.age); } };
    pbs[15] = { label: 'LTWS', boxed: r.ltws, press: () => { r.ltws = !r.ltws; } };
    pbs[16] = { label: 'DATA', boxed: true, press: () => { r.dataPage = false; } };
    return pbs;
  }
  if (r.mode === 'ACM') {
    pbs[5] = { label: r.acm ?? 'ACM' };
    pbs[7] = { label: 'SIL', boxed: r.sil, press: () => { r.sil = !r.sil; } };
    return pbs;
  }
  const stt = r.mode === 'STT';
  pbs[1] = {
    label: r.prf === 'INTL' ? `${barPrf(r.prf, r.antenna.bar, r.antenna.frame)}\nINTL` : r.prf,
    press: () => { r.prf = cycle(PRFS, r.prf); },
  };
  pbs[5] = stt
    ? { label: `RTS\n${r.searchMode}`, press: () => breakLock(sim, 'rts') }
    : { label: r.mode, press: () => setSearchMode(sim, r.mode === 'RWS' ? 'TWS' : 'RWS') };
  pbs[6] = {
    label: `${r.bars}B ${r.antenna.bar + 1}`,
    press: stt ? undefined : () => { r.bars = cycle(barOptions(r), r.bars); clipScan(r); },
  };
  pbs[7] = { label: 'SIL', boxed: r.sil, press: () => { r.sil = !r.sil; } };
  pbs[14] = { label: 'RSET', press: () => rset(sim) };
  pbs[15] = { label: 'NCTR', boxed: r.nctr, press: () => { r.nctr = !r.nctr; } };
  pbs[16] = { label: 'DATA', press: () => { r.dataPage = true; } };
  if (stt) {
    pbs[10] = { label: 'TWS', press: () => sttToTws(sim) };
    return pbs;
  }
  if (r.mode === 'RWS') pbs[8] = { label: 'ERASE', press: () => { r.bricks = []; } };
  else pbs[13] = { label: r.centering, press: () => { r.centering = r.centering === 'AUTO' ? 'MAN' : 'AUTO'; } };
  pbs[11] = { label: '↑', press: () => { r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, 1); } };
  pbs[12] = { label: '↓', press: () => { r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, -1); } };
  pbs[19] = { label: `${r.azWidth}°`, press: () => { r.azWidth = cycle(azOptions(r), r.azWidth); } };
  return pbs;
}
