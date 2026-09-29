'use client';

import type { RefObject } from 'react';

export function HudWindow({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  return (
    <div data-tut="hud" className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-3">
      <h2 className="mb-2 text-[11px] tracking-[0.3em] text-ink/60">HUD · FORWARD VIEW</h2>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="HUD view: ACM scan pattern and aircraft within visual range"
        className="block aspect-square w-full rounded-md bg-black"
      />
    </div>
  );
}
