import type { Sim } from '../sim/types.ts';
import { ACM_PATTERNS, BEAMWIDTH_DEG, VISUAL_RANGE_NM } from '../sim/constants.ts';
import { lookAt } from '../sim/radar.ts';

const GREEN = '#6dff8a';

/** HUD window field of view, degrees off the nose (square: 64° × 64°). */
export const HUD_FOV = { az: 32, elLo: -16, elHi: 48 };

/** Forward view for close-in work: boresight cross, the ACM scan pattern, aircraft visible within 10 nm, the STT lock box. */
export function drawHud(ctx: CanvasRenderingContext2D, sim: Sim, size: number, font: string) {
  const r = sim.radar;
  const px = size / (HUD_FOV.elHi - HUD_FOV.elLo); // pixels per degree
  const X = (az: number) => size / 2 + az * px;
  const Y = (el: number) => (HUD_FOV.elHi - el) * px;
  const inView = (az: number, el: number) => Math.abs(az) <= HUD_FOV.az && el >= HUD_FOV.elLo && el <= HUD_FOV.elHi;

  ctx.save();
  ctx.fillStyle = '#030a05';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = GREEN;
  ctx.fillStyle = GREEN;
  ctx.lineWidth = Math.max(1, size / 250);
  ctx.font = `${size * 0.05}px ${font}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // Boresight cross: where the nose points
  const c = size * 0.03;
  ctx.beginPath();
  ctx.moveTo(X(0) - c, Y(0));
  ctx.lineTo(X(0) + c, Y(0));
  ctx.moveTo(X(0), Y(0) - c);
  ctx.lineTo(X(0), Y(0) + c);
  ctx.stroke();

  // ACM scan pattern (dashed)
  if (r.mode === 'ACM' && r.acm) {
    const p = ACM_PATTERNS[r.acm];
    const half = (BEAMWIDTH_DEG / 2) * px;
    ctx.setLineDash([size * 0.02, size * 0.015]);
    ctx.beginPath();
    if (r.acm === 'BST') {
      ctx.arc(X(0), Y(0), Math.max(half, size * 0.04), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(X(p.az[0]) - half, Y(p.el[1]) - half, (p.az[1] - p.az[0]) * px + 2 * half, (p.el[1] - p.el[0]) * px + 2 * half);
    }
    ctx.setLineDash([]);
  }

  // Aircraft you could see out of the canopy
  for (const t of sim.targets) {
    const g = lookAt(sim, t);
    if (g.range > VISUAL_RANGE_NM || !inView(g.az, g.el)) continue;
    const x = X(g.az);
    const y = Y(g.el);
    const d = size * 0.02;
    ctx.beginPath();
    ctx.moveTo(x, y - d);
    ctx.lineTo(x + d, y);
    ctx.lineTo(x, y + d);
    ctx.lineTo(x - d, y);
    ctx.closePath();
    ctx.stroke();
    ctx.fillText(g.range.toFixed(1), x, y + d * 2.2);
  }

  // STT lock box
  const stt = r.stt;
  const locked = r.mode === 'STT' && stt ? sim.targets.find((x) => x.id === stt.targetId) : undefined;
  if (locked) {
    const g = lookAt(sim, locked);
    if (inView(g.az, g.el)) {
      // target designator: a diamond on a hostile, a square otherwise
      const b = size * 0.05;
      const x = X(g.az);
      const y = Y(g.el);
      ctx.beginPath();
      if (locked.ident === 'hostile') {
        ctx.moveTo(x, y - b * 1.4);
        ctx.lineTo(x + b * 1.4, y);
        ctx.lineTo(x, y + b * 1.4);
        ctx.lineTo(x - b * 1.4, y);
        ctx.closePath();
      } else ctx.rect(x - b, y - b, 2 * b, 2 * b);
      ctx.stroke();
    }
    ctx.fillText('LOCK', size / 2, size * 0.94);
  }

  ctx.textAlign = 'left';
  ctx.fillText(r.mode === 'ACM' ? (r.acm ?? 'ACM') : r.mode, size * 0.05, size * 0.06);
  ctx.restore();
}
