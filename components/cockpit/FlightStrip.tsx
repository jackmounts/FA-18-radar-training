'use client';

import { ACT } from '@/lib/keys';
import { hdg3 } from '@/lib/sim/geometry';
import { HoldButton, type GripProps } from './HoldButton';

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-20 rounded-md bg-black/40 px-2 py-1 text-center">
      <div className="text-xs text-ink/75">{label}</div>
      <div className="text-phosphor">{value}</div>
    </div>
  );
}

export function FlightStrip({ hdg, alt, spd, lit, press, release }: GripProps & { hdg: number; alt: number; spd: number }) {
  const b = (code: string, label: string) => (
    <HoldButton code={code} label={label} lit={lit.has(code)} press={press} release={release} />
  );
  return (
    // Each axis is one unbreakable group (decrease, readout, increase), so narrow screens wrap between axes, not inside one
    <div data-tut="flight" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
      <div className="flex items-center gap-2">
        {b(ACT.turnLeft, 'TURN ◀')}
        <Readout label="HDG" value={hdg3(hdg)} />
        {b(ACT.turnRight, 'TURN ▶')}
      </div>
      <div className="flex items-center gap-2">
        {b(ACT.noseDown, 'NOSE ▼')}
        <Readout label="ALT" value={Math.round(alt).toLocaleString('en-US')} />
        {b(ACT.noseUp, 'NOSE ▲')}
      </div>
      <div className="flex items-center gap-2">
        {b(ACT.slower, 'SPD −')}
        <Readout label="SPD" value={`${Math.round(spd)} KT`} />
        {b(ACT.faster, 'SPD +')}
      </div>
    </div>
  );
}
