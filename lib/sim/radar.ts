import type { AcmMode, Power, Radar, SearchMode, Sim, Target } from './types.ts';
import {
  ACM_PATTERNS, AZ_WIDTHS, BAR_COUNTS, ELEV_RATE_DPS, GIMBAL_AZ_DEG, GIMBAL_EL_DEG, MAX_BRICKS, MAX_RANGE_NM,
  RANGE_SCALES, STT_MEMORY_S, TDC_HIT, TDC_RATE, TWS_BARS, TWS_MAX_AZ,
} from './constants.ts';
import { clamp, elevation, fromBscope, radialSpeed, range, relAz, toBscope } from './geometry.ts';
import { stepAntenna } from './antenna.ts';
import { stepAcmAntenna } from './acm.ts';
import { barPrf, inBeam, inNotch, probability, r50 } from './detection.ts';
import { pruneTracks, rankTracks, trackAt, updateTrack } from './tracks.ts';
import { iff, interrogate, stepNctr } from './ident.ts';

export function defaultRadar(): Radar {
  return {
    power: 'STBY', sil: false, mode: 'RWS', searchMode: 'RWS', acm: null, prf: 'INTL',
    azWidth: 140, bars: 4, rangeScale: 40, age: 8, scanCenter: 0, elev: 0, centering: 'MAN', nctr: true,
    antenna: { az: -70, el: 0, bar: 0, dir: 1, frame: 0 },
    tdc: true, ltws: true, cursor: { u: 0.5, v: 0.5 }, bumpLatched: false,
    bricks: [], tracks: [], looks: {}, ls: null, dt2: null, stt: null, dataPage: false,
  };
}

/** Next value in a list, wrapping at both ends (the real radar wraps on cursor bumps too). */
export function cycle<T>(list: readonly T[], cur: T, d = 1): T {
  const n = list.length;
  return list[(((list.indexOf(cur) + d) % n) + n) % n];
}

export const transmitting = (r: Radar) => r.power === 'OPR' && !r.sil;

export function lookAt(sim: Sim, t: Target) {
  const rng = range(sim.own, t);
  return { range: rng, az: relAz(sim.own, t), el: elevation(sim.own.alt, t.alt, rng) };
}

export function setPower(sim: Sim, power: Power) {
  sim.radar.power = power;
}

/** Bar settings available now: TWS never runs a 1-bar scan. */
export const barOptions = (r: Radar) => (r.mode === 'TWS' ? TWS_BARS : BAR_COUNTS);

/** Azimuth widths available now: TWS never scans wider than 80°. */
export const azOptions = (r: Radar) => (r.mode === 'TWS' ? AZ_WIDTHS.filter((a) => a <= TWS_MAX_AZ[2]) : AZ_WIDTHS);

/** Keep a TWS scan inside its limits (2B ≤ 80°, 4B ≤ 40°, 6B ≤ 20°). The setting just changed wins and the other gives way;
 *  entering TWS keeps the bars (1B becomes 2B) and narrows the azimuth. */
export function clipScan(r: Radar, keep: 'bars' | 'az' = 'bars') {
  if (r.mode !== 'TWS') return;
  if (!TWS_BARS.includes(r.bars)) r.bars = TWS_BARS[0];
  if (keep === 'az') r.bars = Math.min(r.bars, TWS_BARS.findLast((b) => TWS_MAX_AZ[b] >= r.azWidth)!);
  r.azWidth = Math.min(r.azWidth, TWS_MAX_AZ[r.bars]);
}

export function setSearchMode(sim: Sim, mode: SearchMode) {
  const r = sim.radar;
  r.mode = mode;
  r.searchMode = mode;
  r.acm = null;
  r.looks = {};
  clipScan(r);
}

export function lock(sim: Sim, targetId: string) {
  const t = sim.targets.find((x) => x.id === targetId);
  if (!t) return;
  const r = sim.radar;
  r.mode = 'STT';
  r.acm = null;
  r.stt = { targetId, memory: 0, nctrTime: 0, print: null };
  r.bricks = [];
  r.looks = {};
  r.tracks = r.tracks.filter((tr) => tr.targetId === targetId); // STT drops the other trackfiles
  updateTrack(r, t, sim.t);
  r.ls = targetId;
  r.dt2 = null;
  sim.events.push({ kind: 'lock', targetId, text: `Locked: ${Math.round(lookAt(sim, t).range)} nm, angels ${Math.round(t.alt / 1000)}` });
  iff(sim, t); // STT interrogates the L&S automatically
}

export function breakLock(sim: Sim, kind: 'lockLost' | 'rts') {
  const r = sim.radar;
  r.mode = r.searchMode;
  r.stt = null;
  r.looks = {};
  sim.events.push(kind === 'rts' ? { kind, text: 'Returned to search' } : { kind, text: 'Lock lost' });
}

/** PB10 in STT: drop to TWS with the locked target as L&S and AUTO scan centring. */
export function sttToTws(sim: Sim) {
  const id = sim.radar.stt?.targetId ?? null;
  sim.radar.stt = null;
  setSearchMode(sim, 'TWS');
  sim.radar.centering = 'AUTO';
  sim.radar.ls = id;
}

/** RSET: clear the designations (the STT target stays L&S). */
export function rset(sim: Sim) {
  const r = sim.radar;
  r.dt2 = null;
  if (r.mode !== 'STT') r.ls = null;
}

/** Is a B-scope point under the cursor? */
function underCursor(sim: Sim, az: number, rng: number) {
  const r = sim.radar;
  const p = toBscope(az, rng, r.rangeScale);
  return Math.abs(p.u - r.cursor.u) <= TDC_HIT && Math.abs(p.v - r.cursor.v) <= TDC_HIT;
}

const brickUnderCursor = (sim: Sim) =>
  sim.radar.bricks.findLast((b) => underCursor(sim, b.az, b.range))?.targetId ?? null;

/** Trackfiles drawn as symbols: all of them in TWS; in RWS the L&S, the DT2 and (LTWS) the one under the cursor. */
export function shownTracks(sim: Sim) {
  const r = sim.radar;
  if (r.mode === 'TWS') return r.tracks;
  const peek = r.mode === 'RWS' && r.ltws ? brickUnderCursor(sim) : null;
  return r.tracks.filter((tr) => tr.targetId === r.ls || tr.targetId === r.dt2 || tr.targetId === peek);
}

/** The target whose symbol sits under the cursor: trackfile symbols first, then (RWS) bricks. */
export function pickTarget(sim: Sim): string | null {
  const r = sim.radar;
  for (const tr of shownTracks(sim)) {
    const k = trackAt(tr, sim.t);
    if (underCursor(sim, relAz(sim.own, k), range(sim.own, k))) return tr.targetId;
  }
  return r.mode === 'RWS' ? brickUnderCursor(sim) : null;
}

/** TDC depress (needs the TDC).
 *  RWS: a brick → STT, unless LTWS shows its trackfile: then it designates like TWS.
 *  TWS ladder: trackfile → L&S (DT2 if an L&S exists); DT2 → L&S; L&S → STT.
 *  Empty space → move the scan centre (RWS, and TWS in MAN). */
export function tdcDepress(sim: Sim) {
  const r = sim.radar;
  if ((r.mode !== 'RWS' && r.mode !== 'TWS') || !transmitting(r) || !r.tdc) return;
  const id = pickTarget(sim);
  if (!id) {
    if (r.mode === 'RWS' || r.centering === 'MAN') r.scanCenter = fromBscope(r.cursor.u, r.cursor.v, r.rangeScale).az;
    return;
  }
  const latent = r.ltws && r.tracks.some((tr) => tr.targetId === id);
  if (id === r.ls || (r.mode === 'RWS' && !latent)) return lock(sim, id);
  if (id === r.dt2) {
    r.dt2 = r.ls;
    r.ls = id;
  } else if (r.ls) r.dt2 = id;
  else r.ls = id;
}

/** Undesignate.
 *  ACM → back to search.
 *  STT → back to search.
 *  RWS / TWS (needs the TDC): nothing designated → #1-ranked becomes L&S; L&S + DT2 → swap; L&S alone → step through the ranks. */
export function undesignate(sim: Sim) {
  const r = sim.radar;
  if (r.mode === 'ACM') {
    r.mode = r.searchMode;
    r.acm = null;
    r.looks = {};
    sim.events.push({ kind: 'rts', text: 'Returned to search' });
    return;
  }
  if (r.mode === 'STT') return breakLock(sim, 'rts');
  if ((r.mode !== 'RWS' && r.mode !== 'TWS') || !r.tdc || r.tracks.length === 0) return;
  const ranked = [...r.tracks].sort((a, b) => a.rank - b.rank);
  if (!r.ls) r.ls = ranked[0].targetId;
  else if (r.dt2) [r.ls, r.dt2] = [r.dt2, r.ls];
  else r.ls = ranked[(ranked.findIndex((tr) => tr.targetId === r.ls) + 1) % ranked.length].targetId;
}

/** Castle switch press: IFF-interrogate the target under the cursor (in STT: the locked target). */
export function castlePress(sim: Sim) {
  const r = sim.radar;
  if (!transmitting(r) || (!r.tdc && r.mode !== 'STT')) return;
  const id = r.mode === 'STT' ? (r.stt?.targetId ?? null) : pickTarget(sim);
  if (id) interrogate(sim, id);
}

function enterAcm(sim: Sim, acm: AcmMode) {
  const r = sim.radar;
  if (r.mode === 'ACM' && r.acm === acm) return;
  r.mode = 'ACM';
  r.acm = acm;
  r.stt = null; // entering ACM breaks any lock
  r.looks = {};
  r.antenna.bar = 0;
  r.tdc = true; // ACM assigns the TDC to the Attack format
  sim.events.push({ kind: 'acm', acm, text: `ACM ${acm}` });
}

/** Castle right, toward the radar display (the right DDI in the jet). The first press takes the TDC.
 *  With the TDC, in search: Automatic Acquisition. The symbol under the cursor (Fast Acq), else the L&S,
 *  else the #1-ranked trackfile goes to STT. */
function towardRadar(sim: Sim) {
  const r = sim.radar;
  if (!r.tdc) {
    r.tdc = true;
    return;
  }
  if ((r.mode !== 'RWS' && r.mode !== 'TWS') || !transmitting(r)) return;
  const id = pickTarget(sim) ?? r.ls ?? [...r.tracks].sort((a, b) => a.rank - b.rank)[0]?.targetId;
  if (id) lock(sim, id);
}

/** Sensor Control Switch (castle).
 *  Forward: ACM Boresight.
 *  Right (outside ACM): take the TDC, then Automatic Acquisition.
 *  Inside ACM: aft = Vertical acquisition, left = Wide acquisition.
 *  Outside ACM, left and aft hand the TDC to other displays, which are not simulated. */
export function castle(sim: Sim, dir: 'fwd' | 'aft' | 'left' | 'right') {
  if (dir === 'fwd') return enterAcm(sim, 'BST');
  if (dir === 'right' && sim.radar.mode !== 'ACM') return towardRadar(sim);
  if (sim.radar.mode !== 'ACM') return;
  if (dir === 'aft') enterAcm(sim, 'VACQ');
  else if (dir === 'left') enterAcm(sim, 'WACQ');
}

function bump(r: Radar, edge: 'top' | 'bottom' | 'left' | 'right') {
  r.bumpLatched = true;
  if (edge === 'top') r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, 1);
  if (edge === 'bottom') r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, -1);
  if (edge === 'left') r.azWidth = cycle(azOptions(r), r.azWidth, -1);
  if (edge === 'right') r.azWidth = cycle(azOptions(r), r.azWidth, 1);
  if (edge === 'left' || edge === 'right') clipScan(r, 'az');
}

/** Slew the cursor; pushing it into an edge "bumps" range (top/bottom) or azimuth (left/right) once per push. */
export function stepCursor(sim: Sim, dt: number) {
  const r = sim.radar;
  const h = sim.held;
  if ((!h.tdcX && !h.tdcY) || !r.tdc) {
    r.bumpLatched = false;
    return;
  }
  const u = r.cursor.u + h.tdcX * TDC_RATE * dt;
  const v = r.cursor.v - h.tdcY * TDC_RATE * dt;
  if (!r.bumpLatched && (r.mode === 'RWS' || r.mode === 'TWS')) {
    if (v < 0) bump(r, 'top');
    else if (v > 1) bump(r, 'bottom');
    else if (u < 0) bump(r, 'left');
    else if (u > 1) bump(r, 'right');
  }
  r.cursor = { u: clamp(u, 0, 1), v: clamp(v, 0, 1) };
}

function search(sim: Sim, dt: number) {
  const r = sim.radar;
  stepAntenna(r.antenna, r, dt);
  const look = `${r.antenna.frame}:${r.antenna.bar}`;
  const prf = barPrf(r.prf, r.antenna.bar, r.antenna.frame);
  for (const t of sim.targets) {
    const g = lookAt(sim, t);
    if (g.range > MAX_RANGE_NM || r.looks[t.id] === look || !inBeam(g.az, g.el, r.antenna)) continue;
    r.looks[t.id] = look; // one detection roll per bar pass
    if (inNotch(radialSpeed(sim.own, t))) continue;
    if (sim.rand() < probability(g.range, r50(prf, t.rcs, -radialSpeed(sim.own, t)))) {
      r.bricks.push({ targetId: t.id, az: g.az, range: g.range, t: sim.t });
      if (r.bricks.length > MAX_BRICKS) r.bricks.shift();
      updateTrack(r, t, sim.t);
    }
  }
}

/** ACM: sweep the pattern in MPRF and lock the first target detected inside the range gate. */
function acmSearch(sim: Sim, dt: number) {
  const r = sim.radar;
  if (!r.acm) return;
  const p = ACM_PATTERNS[r.acm];
  stepAcmAntenna(r.antenna, p, dt);
  const look = `${r.antenna.frame}:${r.antenna.bar}`;
  for (const t of sim.targets) {
    const g = lookAt(sim, t);
    if (g.range > p.gate || r.looks[t.id] === look || !inBeam(g.az, g.el, r.antenna)) continue;
    r.looks[t.id] = look;
    if (inNotch(radialSpeed(sim.own, t))) continue;
    if (sim.rand() < probability(g.range, r50('MED', t.rcs, -radialSpeed(sim.own, t)))) return lock(sim, t.id);
  }
}

function track(sim: Sim, dt: number) {
  const r = sim.radar;
  const stt = r.stt!;
  const t = sim.targets.find((x) => x.id === stt.targetId);
  const g = t && lookAt(sim, t);
  if (!t || !g || Math.abs(g.az) > GIMBAL_AZ_DEG || Math.abs(g.el) > GIMBAL_EL_DEG || g.range > MAX_RANGE_NM) {
    return breakLock(sim, 'lockLost');
  }
  r.antenna.az = g.az;
  r.antenna.el = g.el;
  updateTrack(r, t, sim.t);
  stt.memory = inNotch(radialSpeed(sim.own, t)) ? stt.memory + dt : 0;
  if (stt.memory > STT_MEMORY_S) return breakLock(sim, 'lockLost');
  stepNctr(sim, dt);
  // automatic range scale keeps the target at 45-90% of the scale
  r.rangeScale = RANGE_SCALES.find((s) => g.range <= 0.9 * s) ?? MAX_RANGE_NM;
}

/** TWS AUTO: scan centre and elevation follow the L&S trackfile. Returns false when there is no L&S to follow. */
function autoCenter(sim: Sim) {
  const r = sim.radar;
  const tr = r.tracks.find((x) => x.targetId === r.ls);
  if (!tr) return false;
  const k = trackAt(tr, sim.t);
  r.scanCenter = relAz(sim.own, k);
  r.elev = clamp(elevation(sim.own.alt, k.alt, range(sim.own, k)), -GIMBAL_EL_DEG, GIMBAL_EL_DEG);
  return true;
}

export function stepRadar(sim: Sim, dt: number) {
  const r = sim.radar;
  r.bricks = r.bricks.filter((b) => sim.t - b.t <= r.age);
  pruneTracks(sim);
  rankTracks(sim);
  const auto = r.mode === 'TWS' && r.centering === 'AUTO' && autoCenter(sim);
  if (r.mode === 'TWS' && r.centering === 'AUTO' && !auto) r.centering = 'MAN'; // the L&S is gone: DCS falls back to MAN
  if ((r.mode === 'RWS' || r.mode === 'TWS') && !auto) {
    r.elev = clamp(r.elev + sim.held.elev * ELEV_RATE_DPS * dt, -GIMBAL_EL_DEG, GIMBAL_EL_DEG);
  }
  if (!transmitting(r)) {
    if (r.mode === 'STT') breakLock(sim, 'lockLost');
    return;
  }
  if (r.mode === 'STT') track(sim, dt);
  else if (r.mode === 'ACM') acmSearch(sim, dt);
  else search(sim, dt);
}
