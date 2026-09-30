'use client';

import type { RefObject } from 'react';
import type { Pushbutton } from '@/lib/sim/pushbuttons';
import { REGION, pbPlace } from '@/lib/ddi/layout';

const EDGE = 9; // bezel margin, % of the DDI width

/** Screen fraction (0..1 of the canvas) → % of the whole DDI (bezel included). */
const pct = (f: number) => `${EDGE + (100 - 2 * EDGE) * f}%`;

export function Ddi({
  pbs,
  canvasRef,
  onPress,
  mark = null,
}: {
  pbs: Record<number, Pushbutton>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onPress: (n: number) => void;
  mark?: { u: number; v: number } | null;
}) {
  return (
    <div
      data-tut="ddi"
      className="relative aspect-square w-full rounded-[7%] border border-black/70 bg-bezel shadow-[inset_0_2px_0_rgba(255,255,255,0.06),0_16px_48px_rgba(0,0,0,0.6)]"
      style={{ padding: `${EDGE}%` }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="block size-full rounded-[2%] bg-black" />
      {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
        const { side, t } = pbPlace(n);
        const along = pct(t);
        const near = `${EDGE / 2}%`;
        const far = `${100 - EDGE / 2}%`;
        const pos =
          side === 'left' ? { left: near, top: along }
          : side === 'right' ? { left: far, top: along }
          : side === 'top' ? { left: along, top: near }
          : { left: along, top: far };
        const pb = pbs[n];
        return (
          <button
            key={n}
            type="button"
            data-tut={`pb-${n}`}
            aria-label={`PB ${n}${pb ? ` – ${pb.label.replace('\n', ' ')}` : ' (blank)'}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPress(n)}
            className="absolute size-[6%] min-h-6 min-w-6 -translate-x-1/2 -translate-y-1/2 rounded-[18%] border border-black/70 bg-button shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] active:bg-black/60 focus-visible:outline-2 focus-visible:outline-phosphor"
            style={pos}
          />
        );
      })}
      {/* Decorative brightness and contrast knobs in the lower corners (not functional) */}
      {(['BRT', 'CONT'] as const).map((name, i) => (
        <span
          key={name}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[1.2%] flex w-[8%] flex-col items-center gap-0.5"
          style={i === 0 ? { left: '0.8%' } : { right: '0.8%' }}
        >
          <span className="text-[8px] leading-none tracking-wider text-ink/75">{name}</span>
          <span className="aspect-square w-3/4 rounded-full border border-black/70 bg-[radial-gradient(circle_at_35%_30%,#5a605b,#1d201e)]" />
        </span>
      ))}
      {mark && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-[8%] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-2 border-phosphor"
          style={{
            left: pct(REGION.x0 + mark.u * (REGION.x1 - REGION.x0)),
            top: pct(REGION.y0 + mark.v * (REGION.y1 - REGION.y0)),
          }}
        />
      )}
    </div>
  );
}
