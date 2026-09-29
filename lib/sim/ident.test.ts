import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim, run } from './sim.ts';
import { makeTarget } from './world.ts';
import { castlePress, lock, setPower, setSearchMode } from './radar.ts';
import { iff } from './ident.ts';
import { range, relAz, toBscope } from './geometry.ts';
import { trackAt } from './tracks.ts';
import type { Sim, Target } from './types.ts';

// a friendly F-16 at about -13° and a hostile MiG-29 at about +14°: 27° apart, so one IFF scan can't cover both
const pair = () => {
  const s = createSim({
    seed: 5,
    own: { spd: 300 },
    targets: [
      makeTarget({ id: 'F', type: 'F-16', side: 'friendly', iffReplies: true, x: -5, y: 22, hdg: 170, spd: 300 }),
      makeTarget({ id: 'H', x: 5, y: 20, hdg: 190, spd: 300 }),
    ],
  });
  setPower(s, 'OPR');
  setSearchMode(s, 'TWS');
  run(s, 4);
  return s;
};

function aim(s: Sim, id: string) {
  const k = trackAt(s.radar.tracks.find((tr) => tr.targetId === id)!, s.t);
  s.radar.cursor = toBscope(relAz(s.own, k), range(s.own, k), s.radar.rangeScale);
}

const single = (t: Target) => {
  const s = createSim({ seed: 9, own: { spd: 300 }, targets: [t] });
  setPower(s, 'OPR');
  return s;
};

test('IFF: a reply means friendly, silence means ambiguous, and a hostile never downgrades', () => {
  const s = pair();
  const [f, h] = s.targets;
  iff(s, f);
  iff(s, h);
  assert.equal(f.ident, 'friendly');
  assert.equal(h.ident, 'ambiguous');
  h.ident = 'hostile';
  iff(s, h);
  assert.equal(h.ident, 'hostile');
  assert.equal(s.events.filter((e) => e.kind === 'ident').length, 2);
});

test('castle press interrogates only trackfiles within ±11° of the one under the cursor', () => {
  const s = pair();
  aim(s, 'F');
  castlePress(s);
  assert.equal(s.targets[0].ident, 'friendly');
  assert.equal(s.targets[1].ident, 'unknown');
});

test('locking interrogates automatically; NCTR prints the type nose-on inside 25 nm and confirms hostile', () => {
  const s = pair();
  lock(s, 'H');
  assert.equal(s.targets[1].ident, 'ambiguous');
  run(s, 2.2);
  assert.equal(s.radar.stt?.print, 'MIG-29');
  assert.equal(s.targets[1].ident, 'hostile');
  assert.ok(s.events.some((e) => e.kind === 'nctr'));
});

test('no NCTR print beyond 25 nm, off-aspect, or with NCTR switched off', () => {
  const far = single(makeTarget({ id: 'T', x: 0, y: 30, spd: 300 }));
  lock(far, 'T');
  run(far, 3);
  assert.equal(far.radar.stt?.print, null);

  const beam = single(makeTarget({ id: 'T', x: 0, y: 15, hdg: 90, spd: 300 }));
  lock(beam, 'T');
  run(beam, 2.5); // still inside the 3 s notch memory
  assert.equal(beam.radar.mode, 'STT');
  assert.equal(beam.radar.stt?.print, null);

  const off = single(makeTarget({ id: 'T', x: 0, y: 15, spd: 300 }));
  lock(off, 'T');
  off.radar.nctr = false;
  run(off, 3);
  assert.equal(off.radar.stt?.print, null);
});
