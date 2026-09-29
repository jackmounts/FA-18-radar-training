'use client';

import type { Power } from '@/lib/sim/types';

const POSITIONS: Power[] = ['OFF', 'STBY', 'OPR'];

export function RadarKnob({ power, onChange }: { power: Power; onChange: (p: Power) => void }) {
  return (
    <div
      data-tut="radar-knob"
      role="radiogroup"
      aria-label="RADAR knob"
      className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-4"
    >
      <h2 className="mb-3 text-[11px] tracking-[0.3em] text-ink/60">RADAR</h2>
      <div className="grid grid-cols-3 gap-1.5">
        {POSITIONS.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={power === p}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(p)}
            className={`min-h-11 rounded-md border text-xs ${
              power === p ? 'border-phosphor/70 bg-phosphor/20 text-phosphor' : 'border-black/60 bg-button text-ink'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
