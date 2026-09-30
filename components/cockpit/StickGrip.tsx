'use client';

import { ACT } from '@/lib/keys';
import { HoldButton, type GripProps } from './HoldButton';

export function StickGrip({ lit, press, release }: GripProps) {
  const b = (code: string, label: string, disabled = false) => (
    <HoldButton code={code} label={label} lit={lit.has(code)} press={press} release={release} disabled={disabled} />
  );
  return (
    <div data-tut="stick" className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-4">
      <h2 className="mb-3 text-xs tracking-[0.2em] text-ink/75">STICK · RIGHT HAND</h2>
      <p className="mb-1.5 text-xs tracking-widest text-ink/75">SENSOR CONTROL SWITCH</p>
      <div data-tut="castle" className="grid grid-cols-3 gap-1.5">
        <span />
        {b(ACT.castleFwd, 'SCS ▲ ACM')}
        <span />
        {b(ACT.castleLeft, 'SCS ◀ WACQ')}
        {b(ACT.castlePress, 'SCS ● IFF')}
        {b(ACT.castleRight, 'SCS ▶ TDC/ACQ')}
        <span />
        {b(ACT.castleAft, 'SCS ▼ VACQ')}
        <span />
      </div>
      <div data-tut="undesignate" className="mt-3 grid grid-cols-1">
        {b(ACT.undesignate, 'UNDESIGNATE')}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {b('', 'WPN SEL', true)}
        {b('', 'TRIGGER', true)}
      </div>
    </div>
  );
}
