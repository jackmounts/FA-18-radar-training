'use client';

import type { RefObject } from 'react';
import type { Pushbutton } from '@/lib/sim/pushbuttons';
import { pbPlace } from '@/lib/ddi/layout';

const EDGE = 9; // bezel margin, % of the DDI width

export function Ddi({
  pbs,
  canvasRef,
  onChange,
}: {
  pbs: Record<number, Pushbutton>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onChange: () => void;
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
        const along = `${EDGE + (100 - 2 * EDGE) * t}%`;
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
            onClick={() => {
              pb?.press?.();
              onChange();
            }}
            className="absolute size-[6%] -translate-x-1/2 -translate-y-1/2 rounded-[18%] border border-black/70 bg-button shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] active:bg-black/60 focus-visible:outline-2 focus-visible:outline-phosphor"
            style={pos}
          />
        );
      })}
    </div>
  );
}
