import type { Power, Radar, Sim, Target } from './types.ts';
import {
  AZ_WIDTHS, ELEV_RATE_DPS, GIMBAL_AZ_DEG, GIMBAL_EL_DEG, MAX_BRICKS, MAX_RANGE_NM, RANGE_SCALES,
  STT_MEMORY_S, TDC_HIT, TDC_RATE,
} from './constants.ts';
import { clamp, closure, elevation, fromBscope, radialSpeed, range, relAz, toBscope } from './geometry.ts';
import { stepAntenna } from './antenna.ts';
import { barPrf, inBeam, inNotch, probability, r50 } from './detection.ts';

export function defaultRadar(): Radar {
  return {
    power: 'STBY', sil: false, mode: 'RWS', prf: 'INTL',
    azWidth: 140, bars: 4, rangeScale: 40, age: 8, scanCenter: 0, elev: 0,
    antenna: { az: -70, el: 0, bar: 0, dir: 1, frame: 0 },
    cursor: { u: 0.5, v: 0.5 }, bumpLatched: false,
    bricks: [], looks: {}, stt: null, dataPage: false,
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

export function lock(sim: Sim, targetId: string) {
  const r = sim.radar;
  r.mode = 'STT';
  r.stt = { targetId, memory: 0 };
  r.bricks = [];
  const t = sim.targets.find((x) => x.id === targetId);
  if (t) sim.events.push(`Locked: ${Math.round(lookAt(sim, t).range)} nm, angels ${Math.round(t.alt / 1000)}`);
}

export function breakLock(sim: Sim, reason: string) {
  sim.radar.mode = 'RWS';
  sim.radar.stt = null;
  sim.events.push(reason);
}

/** TDC depress: on a brick -> STT (LTWS off behaviour); on empty space -> move the scan centre. */
export function tdcDepress(sim: Sim) {
  const r = sim.radar;
  if (r.mode !== 'RWS' || !transmitting(r)) return;
  const hit = r.bricks.findLast((b) => {
    const p = toBscope(b.az, b.range, r.rangeScale);
    return Math.abs(p.u - r.cursor.u) <= TDC_HIT && Math.abs(p.v - r.cursor.v) <= TDC_HIT;
  });
  if (hit) lock(sim, hit.targetId);
  else r.scanCenter = fromBscope(r.cursor.u, r.cursor.v, r.rangeScale).az;
}

export function undesignate(sim: Sim) {
  if (sim.radar.mode === 'STT') breakLock(sim, 'Returned to search');
}

function bump(r: Radar, edge: 'top' | 'bottom' | 'left' | 'right') {
  r.bumpLatched = true;
  if (edge === 'top') r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, 1);
  if (edge === 'bottom') r.rangeScale = cycle(RANGE_SCALES, r.rangeScale, -1);
  if (edge === 'left') r.azWidth = cycle(AZ_WIDTHS, r.azWidth, -1);
  if (edge === 'right') r.azWidth = cycle(AZ_WIDTHS, r.azWidth, 1);
}

/** Slew the cursor; pushing it into an edge "bumps" range (top/bottom) or azimuth (left/right) once per push. */
export function stepCursor(sim: Sim, dt: number) {
  const r = sim.radar;
  const h = sim.held;
  if (!h.tdcX && !h.tdcY) {
    r.bumpLatched = false;
    return;
  }
  const u = r.cursor.u + h.tdcX * TDC_RATE * dt;
  const v = r.cursor.v - h.tdcY * TDC_RATE * dt;
  if (!r.bumpLatched && r.mode === 'RWS') {
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
    if (sim.rand() < probability(g.range, r50(prf, t.rcs, closure(sim.own, t)))) {
      r.bricks.push({ targetId: t.id, az: g.az, range: g.range, t: sim.t });
      if (r.bricks.length > MAX_BRICKS) r.bricks.shift();
    }
  }
}

function track(sim: Sim, dt: number) {
  const r = sim.radar;
  const stt = r.stt!;
  const t = sim.targets.find((x) => x.id === stt.targetId);
  const g = t && lookAt(sim, t);
  if (!t || !g || Math.abs(g.az) > GIMBAL_AZ_DEG || Math.abs(g.el) > GIMBAL_EL_DEG || g.range > MAX_RANGE_NM) {
    return breakLock(sim, 'Lock lost');
  }
  r.antenna.az = g.az;
  r.antenna.el = g.el;
  stt.memory = inNotch(radialSpeed(sim.own, t)) ? stt.memory + dt : 0;
  if (stt.memory > STT_MEMORY_S) return breakLock(sim, 'Lock lost');
  // automatic range scale keeps the target at 45-90% of the scale
  r.rangeScale = RANGE_SCALES.find((s) => g.range <= 0.9 * s) ?? MAX_RANGE_NM;
}

export function stepRadar(sim: Sim, dt: number) {
  const r = sim.radar;
  r.bricks = r.bricks.filter((b) => sim.t - b.t <= r.age);
  if (r.mode !== 'STT') r.elev = clamp(r.elev + sim.held.elev * ELEV_RATE_DPS * dt, -GIMBAL_EL_DEG, GIMBAL_EL_DEG);
  if (!transmitting(r)) {
    if (r.mode === 'STT') breakLock(sim, 'Lock lost');
    return;
  }
  if (r.mode === 'STT') track(sim, dt);
  else search(sim, dt);
}
