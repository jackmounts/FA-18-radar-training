'use client';

import { KEYS } from '@/lib/keys';
import { HoldButton, type GripProps } from './HoldButton';

export function StickGrip({ lit, press, release }: GripProps) {
  const b = (code: string, label: string, disabled = false) => (
    <HoldButton code={code} label={label} lit={lit.has(code)} press={press} release={release} disabled={disabled} />
  );
  return (
    <div data-tut="stick" className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-4">
      <h2 className="mb-3 text-[11px] tracking-[0.3em] text-ink/60">STICK · RIGHT HAND</h2>
      <p className="mb-1.5 text-[10px] tracking-widest text-ink/50">SENSOR CONTROL SWITCH</p>
      <div data-tut="castle" className="grid grid-cols-3 gap-1.5">
        <span />
        {b(KEYS.castleFwd, 'SCS ▲ ACM')}
        <span />
        {b(KEYS.castleLeft, 'SCS ◀ WACQ')}
        {b(KEYS.castlePress, 'SCS ● IFF')}
        {b(KEYS.castleRight, 'SCS ▶', true)}
        <span />
        {b(KEYS.castleAft, 'SCS ▼ VACQ')}
        <span />
      </div>
      <div data-tut="undesignate" className="mt-3 grid grid-cols-1">
        {b(KEYS.undesignate, 'UNDESIGNATE')}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {b('', 'WPN SEL', true)}
        {b('', 'TRIGGER', true)}
      </div>
    </div>
  );
}
