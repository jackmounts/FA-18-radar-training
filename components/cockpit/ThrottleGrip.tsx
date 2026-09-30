'use client';

import { ACT } from '@/lib/keys';
import { HoldButton, type GripProps } from './HoldButton';
import { TdcPad } from './TdcPad';

export function ThrottleGrip({ lit, press, release }: GripProps) {
  const b = (code: string, label: string, disabled = false) => (
    <HoldButton code={code} label={label} lit={lit.has(code)} press={press} release={release} disabled={disabled} />
  );
  return (
    <div data-tut="throttle" className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-4">
      <h2 className="mb-3 text-xs tracking-[0.2em] text-ink/75">THROTTLE · LEFT HAND</h2>
      <div data-tut="tdc">
        <p className="mb-1.5 text-xs tracking-widest text-ink/75">TDC · DRAG TO SLEW</p>
        <TdcPad lit={lit} press={press} release={release} />
        <div className="mt-2 grid grid-cols-1">{b(ACT.designate, 'TDC DEPRESS · DESIGNATE')}</div>
      </div>
      <div data-tut="elevation" className="mt-3 grid grid-cols-2 gap-1.5">
        {b(ACT.elevUp, 'ANT EL ▲')}
        {b(ACT.elevDown, 'ANT EL ▼')}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {b('', 'CAGE', true)}
        {b('', 'RAID', true)}
      </div>
    </div>
  );
}
