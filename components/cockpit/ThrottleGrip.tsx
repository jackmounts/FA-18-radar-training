'use client';

import { KEYS } from '@/lib/keys';
import { HoldButton, type GripProps } from './HoldButton';

export function ThrottleGrip({ lit, press, release }: GripProps) {
  const b = (code: string, label: string, disabled = false) => (
    <HoldButton code={code} label={label} lit={lit.has(code)} press={press} release={release} disabled={disabled} />
  );
  return (
    <div data-tut="throttle" className="w-60 rounded-2xl border border-white/5 bg-panel-2 p-4">
      <h2 className="mb-3 text-[11px] tracking-[0.3em] text-ink/60">THROTTLE · LEFT HAND</h2>
      <div data-tut="tdc" className="grid grid-cols-3 gap-1.5">
        <span />
        {b(KEYS.tdcUp, 'TDC ▲')}
        <span />
        {b(KEYS.tdcLeft, 'TDC ◀')}
        {b(KEYS.designate, 'DESIG')}
        {b(KEYS.tdcRight, 'TDC ▶')}
        <span />
        {b(KEYS.tdcDown, 'TDC ▼')}
        <span />
      </div>
      <div data-tut="elevation" className="mt-3 grid grid-cols-2 gap-1.5">
        {b(KEYS.elevUp, 'ANT EL ▲')}
        {b(KEYS.elevDown, 'ANT EL ▼')}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {b('', 'CAGE', true)}
        {b('', 'RAID', true)}
      </div>
    </div>
  );
}
