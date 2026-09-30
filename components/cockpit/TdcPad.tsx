'use client';

import { useRef, type PointerEvent } from 'react';
import { KEYS } from '@/lib/keys';

const DEAD = 0.25; // fraction of the pad radius that does nothing

/** Drag pad for the TDC: drag the knob to slew the cursor. It presses the same keys as W A S D. */
export function TdcPad({
  lit,
  press,
  release,
}: {
  lit: ReadonlySet<string>;
  press: (code: string) => void;
  release: (code: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const axis = (neg: string, pos: string, v: number) => {
    if (v > DEAD) {
      release(neg);
      press(pos);
    } else if (v < -DEAD) {
      release(pos);
      press(neg);
    } else {
      release(neg);
      release(pos);
    }
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    axis(KEYS.tdcLeft, KEYS.tdcRight, ((e.clientX - box.left) / box.width) * 2 - 1);
    axis(KEYS.tdcUp, KEYS.tdcDown, ((e.clientY - box.top) / box.height) * 2 - 1);
  };
  const end = () => [KEYS.tdcLeft, KEYS.tdcRight, KEYS.tdcUp, KEYS.tdcDown].forEach(release);
  const dx = (lit.has(KEYS.tdcRight) ? 1 : 0) - (lit.has(KEYS.tdcLeft) ? 1 : 0);
  const dy = (lit.has(KEYS.tdcDown) ? 1 : 0) - (lit.has(KEYS.tdcUp) ? 1 : 0);
  return (
    <div
      ref={ref}
      role="group"
      aria-label="TDC drag pad (or keys W A S D)"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      className="relative mx-auto aspect-square w-28 touch-none select-none rounded-full border border-black/60 bg-black/30"
    >
      <span
        aria-hidden="true"
        className={`absolute left-1/2 top-1/2 size-10 rounded-full border transition-transform ${
          dx || dy ? 'border-phosphor/70 bg-phosphor/25' : 'border-black/60 bg-button'
        }`}
        style={{ transform: `translate(calc(-50% + ${dx * 28}px), calc(-50% + ${dy * 28}px))` }}
      />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-1.5 text-center text-[10px] text-ink/70">
        W A S D
      </span>
    </div>
  );
}
