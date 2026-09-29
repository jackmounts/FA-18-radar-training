'use client';

import { KEYS } from '@/lib/keys';
import { HoldButton, type GripProps } from './HoldButton';

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-md bg-black/40 px-2 py-1 text-center">
      <div className="text-[10px] text-ink/50">{label}</div>
      <div className="text-phosphor">{value}</div>
    </div>
  );
}

export function FlightStrip({ hdg, alt, spd, lit, press, release }: GripProps & { hdg: number; alt: number; spd: number }) {
  const b = (code: string, label: string) => (
    <HoldButton code={code} label={label} lit={lit.has(code)} press={press} release={release} />
  );
  return (
    <div data-tut="flight" className="flex flex-wrap items-center justify-center gap-2 text-xs">
      {b(KEYS.turnLeft, 'TURN ◀')}
      <Readout label="HDG" value={String(Math.round(hdg) % 360 || 360).padStart(3, '0')} />
      {b(KEYS.turnRight, 'TURN ▶')}
      {b(KEYS.noseDown, 'NOSE ▼')}
      <Readout label="ALT" value={Math.round(alt).toLocaleString('en-US')} />
      {b(KEYS.noseUp, 'NOSE ▲')}
      {b(KEYS.slower, 'SPD −')}
      <Readout label="SPD" value={`${Math.round(spd)} KT`} />
      {b(KEYS.faster, 'SPD +')}
    </div>
  );
}
