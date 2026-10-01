import type { Ident, Kinematics, Sim } from '../sim/types.ts';
import { GIMBAL_EL_DEG } from '../sim/constants.ts';
import { altitudeCoverage, closure, fromBscope, hdg3, mach, rad, range, relAz, toBscope } from '../sim/geometry.ts';
import { shownTracks, transmitting } from '../sim/radar.ts';
import { trackAt } from '../sim/tracks.ts';
import { pushbuttons } from '../sim/pushbuttons.ts';
import { REGION, pbPlace } from './layout.ts';

const GREEN = '#6dff8a';
const BG = '#030a05';

const hdgText = (h: number) => `${hdg3(h)}°`;

/** Top half of a HAFU symbol (expects the caller to have set stroke/fill style, font and textBaseline, as drawDdi does): chevron = hostile, arc = friendly, box = unknown. */
export function hafu(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ident: Ident, center: string) {
  ctx.beginPath();
  if (ident === 'hostile') {
    ctx.moveTo(x - s, y);
    ctx.lineTo(x, y - s * 1.3);
    ctx.lineTo(x + s, y);
  } else if (ident === 'friendly') {
    ctx.arc(x, y, s, Math.PI, 0);
  } else {
    ctx.moveTo(x - s, y);
    ctx.lineTo(x - s, y - s);
    ctx.lineTo(x + s, y - s);
    ctx.lineTo(x + s, y);
  }
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillText(center, x, y - s * 0.5);
}

/** "Iron Cross": the radar is not transmitting. */
function ironCross(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.lineTo(x + s, y);
  ctx.moveTo(x, y - s);
  ctx.lineTo(x, y + s);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.moveTo(x + dx * s - dy * s * 0.35, y + dy * s - dx * s * 0.35);
    ctx.lineTo(x + dx * s + dy * s * 0.35, y + dy * s + dx * s * 0.35);
  }
  ctx.stroke();
}

/** Draws the A/A radar attack format (B-scope). `size` is the canvas edge in device pixels. */
export function drawDdi(ctx: CanvasRenderingContext2D, sim: Sim, size: number, font: string) {
  const r = sim.radar;
  const own = sim.own;
  const fs = size * 0.03;
  const tick = size * 0.015;
  const X = (u: number) => (REGION.x0 + u * (REGION.x1 - REGION.x0)) * size;
  const Y = (v: number) => (REGION.y0 + v * (REGION.y1 - REGION.y0)) * size;
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  };
  const text = (s: string, x: number, y: number, align: CanvasTextAlign = 'left') => {
    ctx.textAlign = align;
    const lines = s.split('\n');
    lines.forEach((l, i) => ctx.fillText(l, x, y + (i - (lines.length - 1) / 2) * fs * 1.15));
  };

  ctx.save();
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = GREEN;
  ctx.fillStyle = GREEN;
  ctx.lineWidth = Math.max(1, size / 400);
  ctx.shadowColor = GREEN;
  ctx.shadowBlur = size / 120;
  ctx.font = `${fs}px ${font}`;
  ctx.textBaseline = 'middle';

  // Tactical region with azimuth ticks (0, ±30, ±60°) and range ticks (25/50/75 %)
  ctx.strokeRect(X(0), Y(0), X(1) - X(0), Y(1) - Y(0));
  ctx.beginPath();
  for (const az of [-60, -30, 0, 30, 60]) {
    const x = X(toBscope(az, 0, 1).u);
    line(x, Y(0), x, Y(0) + tick);
    line(x, Y(1), x, Y(1) - tick);
  }
  for (const f of [0.25, 0.5, 0.75]) {
    line(X(0), Y(f), X(0) + tick, Y(f));
    line(X(1), Y(f), X(1) - tick, Y(f));
  }
  for (const e of [-30, -20, -10, 0, 10, 20, 30]) {
    const y = Y(0.5 - e / (2 * GIMBAL_EL_DEG)); // elevation scale, same mapping as the caret
    line(X(0), y, X(0) + tick * 0.6, y);
  }
  ctx.stroke();

  // Legends around the region
  const top = Y(0) - fs * 1.2;
  const bottom = Y(1) + fs * 1.6;
  text(r.power === 'OPR' && r.sil ? 'SIL' : r.power, X(0), top);
  if (r.aacq) text('AACQ', X(0) + fs * 3.5, top);
  text(hdgText(own.hdg), size / 2, top, 'center');
  text(String(r.rangeScale), size * 0.98, top, 'right');
  // TDC-ownership diamond: shown while this display owns the TDC
  if (r.tdc) {
    const dx = size * 0.98 - fs * 2.2;
    const dh = fs * 0.35;
    ctx.beginPath();
    ctx.moveTo(dx, top - dh);
    ctx.lineTo(dx + dh, top);
    ctx.lineTo(dx, top + dh);
    ctx.lineTo(dx - dh, top);
    ctx.closePath();
    ctx.stroke();
  }
  text(`M ${mach(own.spd, own.alt).toFixed(2)}\n${Math.round(own.spd)}`, X(0), bottom);
  text(String(Math.round(own.alt)), X(1), bottom, 'right');

  // Pushbutton labels next to their buttons
  for (const [n, pb] of Object.entries(pushbuttons(sim))) {
    const { side, t } = pbPlace(Number(n));
    const align: CanvasTextAlign = side === 'left' ? 'left' : side === 'right' ? 'right' : 'center';
    const x = (side === 'left' ? 0.02 : side === 'right' ? 0.98 : t) * size;
    const y = (side === 'top' ? 0.045 : side === 'bottom' ? 0.955 : t) * size;
    text(pb.label, x, y, align);
    if (pb.boxed) {
      const lines = pb.label.split('\n');
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + fs * 0.5;
      const h = lines.length * fs * 1.15 + fs * 0.2;
      const bx = align === 'left' ? x - fs * 0.25 : align === 'right' ? x - w + fs * 0.25 : x - w / 2;
      ctx.strokeRect(bx, y - h / 2, w, h);
    }
  }

  // Horizon line and velocity vector (static: the flight model has no pitch or roll)
  const hx = size / 2;
  const hy = size * 0.39;
  const hr = size * 0.012;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  line(size * 0.33, hy, hx - hr * 1.6, hy);
  line(hx + hr * 1.6, hy, size * 0.67, hy);
  line(hx, hy - hr, hx, hy - hr * 2.2);
  ctx.stroke();

  // Elevation caret "<" on the left edge (±60° over the full height)
  const el = r.mode === 'STT' || r.mode === 'ACM' ? r.antenna.el : r.elev;
  const cy = Y(0.5 - el / (2 * GIMBAL_EL_DEG));
  ctx.beginPath();
  line(X(0) + tick * 1.6, cy - tick * 0.6, X(0) + tick * 0.5, cy);
  line(X(0) + tick * 0.5, cy, X(0) + tick * 1.6, cy + tick * 0.6);
  ctx.stroke();

  if (!transmitting(r)) {
    ironCross(ctx, X(0) + size * 0.04, Y(1) - size * 0.04, size * 0.022);
  } else {
    // B-sweep: the antenna's azimuth
    const sx = X(toBscope(r.antenna.az, 0, 1).u);
    ctx.beginPath();
    line(sx, Y(0), sx, Y(1));
    ctx.stroke();
  }

  if (r.mode === 'RWS') {
    // Raw hits ("bricks") fade with age
    for (const b of r.bricks) {
      const p = toBscope(b.az, b.range, r.rangeScale);
      if (p.v < 0) continue;
      ctx.globalAlpha = Math.max(0.15, 1 - (sim.t - b.t) / r.age);
      ctx.fillRect(X(p.u) - size * 0.009, Y(p.v) - size * 0.005, size * 0.018, size * 0.01);
    }
    ctx.globalAlpha = 1;
  }
  if (r.mode === 'RWS' || r.mode === 'TWS') {
    // Acquisition cursor with the altitude coverage at its range
    const cx = X(r.cursor.u);
    const cyc = Y(r.cursor.v);
    const gap = size * 0.01;
    const half = size * 0.012;
    ctx.beginPath();
    line(cx - gap, cyc - half, cx - gap, cyc + half);
    line(cx + gap, cyc - half, cx + gap, cyc + half);
    ctx.stroke();
    const cov = altitudeCoverage(own.alt, fromBscope(r.cursor.u, r.cursor.v, r.rangeScale).range, r.elev, r.bars);
    text(String(cov.hi), cx, cyc - half - fs * 0.7, 'center');
    text(String(cov.lo), cx, cyc + half + fs * 0.7, 'center');
  }

  /** A HAFU symbol with its stem (direction of travel, up = same way as us); Mach and altitude beside it with `data`. Returns its y, or null if off-scope. */
  const symbol = (k: Kinematics, ident: Ident, center: string, data: boolean) => {
    const p = toBscope(relAz(own, k), range(own, k), r.rangeScale);
    if (p.u < 0 || p.u > 1 || p.v < 0 || p.v > 1) return null;
    const x = X(p.u);
    const y = Y(p.v);
    const s = size * 0.022;
    hafu(ctx, x, y, s, ident, center);
    const rel = rad(k.hdg - own.hdg);
    ctx.beginPath();
    line(x, y, x + Math.sin(rel) * s * 2.2, y - Math.cos(rel) * s * 2.2);
    ctx.stroke();
    if (data) {
      text(mach(k.spd, k.alt).toFixed(1), x - s * 1.4, y - s * 0.5, 'right');
      text(String(Math.round(k.alt / 1000)), x + s * 1.4, y - s * 0.5);
    }
    return y;
  };
  /** L&S cues: target ground track, altitude difference by the caret, range caret with closure. */
  const lsCues = (k: Kinematics, y: number) => {
    text(hdgText(k.hdg), X(0) + fs * 0.4, Y(0) + fs);
    text(String(Math.round((k.alt - own.alt) / 1000)), X(0) + tick * 2.2, cy);
    ctx.beginPath();
    line(X(1) - tick * 1.6, y - tick * 0.6, X(1) - tick * 0.5, y);
    line(X(1) - tick * 0.5, y, X(1) - tick * 1.6, y + tick * 0.6);
    ctx.stroke();
    text(String(Math.round(closure(own, k))), X(1) - tick * 2.2, y, 'right');
  };
  const targetOf = (id: string) => sim.targets.find((x) => x.id === id);

  const stt = r.stt;
  if (r.mode === 'STT' && stt) {
    const t = targetOf(stt.targetId);
    if (t) {
      const y = symbol(t, t.ident, '★', true);
      if (y !== null) lsCues(t, y);
    }
    if (stt.memory > 0) text('MEM', size / 2, Y(1) - fs, 'center');
    if (stt.print) text(`NCTR ${stt.print}`, size / 2, Y(1) - fs * 2.3, 'center');
  } else if (r.mode === 'RWS' || r.mode === 'TWS') {
    for (const tr of shownTracks(sim)) {
      const t = targetOf(tr.targetId);
      if (!t) continue;
      const k = trackAt(tr, sim.t);
      const center = tr.targetId === r.ls ? '★' : tr.targetId === r.dt2 ? '◇' : String(tr.rank);
      // RWS only shows designated or LTWS-previewed trackfiles, all with their data
      const y = symbol(k, t.ident, center, r.mode === 'RWS' || tr.targetId === r.ls || tr.targetId === r.dt2);
      if (y !== null && tr.targetId === r.ls) lsCues(k, y);
    }
  }
  ctx.restore();
}
