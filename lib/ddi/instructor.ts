import type { Sim, Target } from '../sim/types.ts';
import { ACM_PATTERNS, MAX_ALT_FT } from '../sim/constants.ts';
import { scanEdges } from '../sim/antenna.ts';
import { altitudeCoverage, rad } from '../sim/geometry.ts';
import { lookAt } from '../sim/radar.ts';

const INK = '#c7cfc8';
const FAINT = 'rgba(199,207,200,0.25)';
const SCAN = 'rgba(109,255,138,0.16)';
const GREEN = '#6dff8a';
const HOSTILE = '#ff7a6b';
const FRIENDLY = '#6db8ff';

/** Instructor ("truth") view on a w × 1.5w canvas. Top w × w: heading-up plan view. Bottom w × 0.5w: side profile.
 *  Unlike the DDI it shows where aircraft really are, coloured by side (hostile = red triangle, friendly = blue circle). */
export function drawInstructor(ctx: CanvasRenderingContext2D, sim: Sim, w: number, font: string) {
  const r = sim.radar;
  const own = sim.own;
  const R = r.rangeScale;
  const stt = r.stt;
  const locked = stt ? sim.targets.find((t) => t.id === stt.targetId) : undefined;
  const visible = sim.targets.filter((t) => {
    const g = lookAt(sim, t);
    return g.range <= R && Math.abs(g.az) <= 90;
  });
  const mark = (t: Target | null, x: number, y: number) => {
    const s = w * 0.018;
    ctx.fillStyle = t === null ? INK : t.side === 'hostile' ? HOSTILE : FRIENDLY;
    ctx.beginPath();
    if (t === null || t.side === 'hostile') {
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s, y + s);
      ctx.lineTo(x - s, y + s);
      ctx.closePath();
    } else ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.save();
  ctx.fillStyle = '#0b0d0c';
  ctx.fillRect(0, 0, w, w * 1.5);
  ctx.font = `${w * 0.04}px ${font}`;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(1, w / 300);

  // ---- Plan view: ownship bottom-centre, nose up; range rings at 25/50/75/100 % of the radar scale
  const cx = w / 2;
  const cy = w * 0.94;
  const rr = w * 0.86;
  const P = (az: number, d: number) => ({
    x: cx + (d / R) * rr * Math.sin(rad(az)),
    y: cy - (d / R) * rr * Math.cos(rad(az)),
  });
  const wedge = (lo: number, hi: number, d: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, Math.min(d / R, 1) * rr, rad(lo) - Math.PI / 2, rad(hi) - Math.PI / 2);
    ctx.closePath();
    ctx.fill();
  };
  ctx.strokeStyle = FAINT;
  for (const f of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath();
    ctx.arc(cx, cy, f * rr, Math.PI, 2 * Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = SCAN;
  if (r.mode === 'ACM' && r.acm) {
    const p = ACM_PATTERNS[r.acm];
    wedge(p.az[0] - 1.65, p.az[1] + 1.65, p.gate);
  } else if (r.mode !== 'STT') {
    const [lo, hi] = scanEdges(r);
    wedge(lo, hi, R);
  }
  if (r.power === 'OPR' && !r.sil) {
    // the beam: at the locked target in STT, otherwise the antenna azimuth
    const g = locked ? lookAt(sim, locked) : { az: r.antenna.az, range: R };
    const e = P(g.az, Math.min(g.range, R));
    ctx.strokeStyle = GREEN;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
  }
  for (const t of visible) {
    const g = lookAt(sim, t);
    const p = P(g.az, g.range);
    mark(t, p.x, p.y);
    // 1-minute velocity vector, relative to our nose
    const rel = rad(t.hdg - own.hdg);
    const len = (t.spd / 60 / R) * rr;
    ctx.strokeStyle = t.side === 'hostile' ? HOSTILE : FRIENDLY;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.sin(rel) * len, p.y - Math.cos(rel) * len);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(String(Math.round(t.alt / 1000)), p.x + w * 0.025, p.y);
  }
  mark(null, cx, cy);
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.fillText(`TRUTH · ${R} NM`, w * 0.03, w * 0.04);

  // ---- Side profile: range across, altitude up (0–50,000 ft); the slice of sky the scan covers
  const top = w;
  const h = w * 0.5;
  const PX = (d: number) => w * 0.05 + (d / R) * w * 0.9;
  const PY = (alt: number) => top + h * 0.92 - (alt / MAX_ALT_FT) * h * 0.8;
  ctx.strokeStyle = FAINT;
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(w, top);
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, w, h);
  ctx.clip();
  if (r.mode === 'RWS' || r.mode === 'TWS') {
    const cov = altitudeCoverage(own.alt, R, r.elev, r.bars);
    ctx.fillStyle = SCAN;
    ctx.beginPath();
    ctx.moveTo(PX(0), PY(own.alt));
    ctx.lineTo(PX(R), PY(cov.hi * 1000));
    ctx.lineTo(PX(R), PY(cov.lo * 1000));
    ctx.closePath();
    ctx.fill();
  }
  if (locked) {
    ctx.strokeStyle = GREEN;
    ctx.beginPath();
    ctx.moveTo(PX(0), PY(own.alt));
    ctx.lineTo(PX(lookAt(sim, locked).range), PY(locked.alt));
    ctx.stroke();
  }
  for (const t of visible) mark(t, PX(lookAt(sim, t).range), PY(t.alt));
  mark(null, PX(0), PY(own.alt));
  ctx.restore();
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.fillText('SIDE VIEW · 0–50K FT', w * 0.03, top + h * 0.08);
  ctx.restore();
}
