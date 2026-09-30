'use client';

import type { RefObject } from 'react';

export function InstructorMap({ canvasRef }: { canvasRef: RefObject<HTMLCanvasElement | null> }) {
  return (
    <div data-tut="map" className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-3">
      <h2 className="mb-2 text-[11px] tracking-[0.3em] text-ink/75">INSTRUCTOR MAP · TRUTH</h2>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Instructor map: true aircraft positions, the radar scan wedge and a side view of the scanned altitudes"
        className="block aspect-[2/3] w-full rounded-md bg-black"
      />
    </div>
  );
}
