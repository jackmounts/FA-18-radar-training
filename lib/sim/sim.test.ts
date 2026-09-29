import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim, run } from './sim.ts';
import { makeTarget } from './world.ts';
import { lock, setPower, tdcDepress, undesignate } from './radar.ts';
import { toBscope } from './geometry.ts';
import type { Target } from './types.ts';

const headOn = () => makeTarget({ id: 'T1', x: 0, y: 30, alt: 20000, hdg: 180, spd: 300 });
const sandbox = (targets: Target[] = [headOn()]) => createSim({ seed: 7, own: { spd: 300 }, targets });

test('a radar in STBY paints nothing', () => {
  const s = sandbox();
  run(s, 15);
  assert.equal(s.radar.bricks.length, 0);
});

test('in OPR a head-on target is painted within two frames', () => {
  const s = sandbox();
  setPower(s, 'OPR');
  run(s, 14);
  assert.ok(s.radar.bricks.length > 0);
});

test('a beaming target sits in the notch and is never painted', () => {
  const s = sandbox([makeTarget({ id: 'T1', x: 0, y: 30, hdg: 90, spd: 300 })]);
  setPower(s, 'OPR');
  run(s, 15);
  assert.equal(s.radar.bricks.length, 0);
});

test('a target above the scan is found by raising the antenna elevation', () => {
  const s = sandbox([makeTarget({ id: 'T1', x: 0, y: 30, alt: 40000, hdg: 180, spd: 300 })]);
  setPower(s, 'OPR');
  run(s, 14);
  assert.equal(s.radar.bricks.length, 0);
  s.radar.elev = 7;
  run(s, 14);
  assert.ok(s.radar.bricks.length > 0);
});

test('TDC depress on a brick locks STT, auto-ranges, and undesignate returns to RWS', () => {
  const s = sandbox();
  setPower(s, 'OPR');
  run(s, 14);
  const b = s.radar.bricks.at(-1)!;
  s.radar.cursor = toBscope(b.az, b.range, s.radar.rangeScale);
  tdcDepress(s);
  assert.equal(s.radar.mode, 'STT');
  assert.match(s.events.find((e) => e.kind === 'lock')!.text, /^Locked: \d+ nm, angels 20$/);
  s.radar.rangeScale = 160;
  run(s, 1);
  assert.equal(s.radar.mode, 'STT');
  assert.equal(s.radar.rangeScale, 40);
  undesignate(s);
  assert.equal(s.radar.mode, 'RWS');
});

test('the lock breaks when the target leaves the gimbal limits', () => {
  const s = sandbox();
  setPower(s, 'OPR');
  lock(s, 'T1');
  run(s, 0.5);
  assert.equal(s.radar.mode, 'STT');
  s.own.hdg = 90;
  run(s, 0.1);
  assert.equal(s.radar.mode, 'RWS');
  assert.equal(s.events.at(-1)?.kind, 'lockLost');
});

test('STT coasts 3 s on memory in the notch, then drops', () => {
  const s = sandbox();
  setPower(s, 'OPR');
  lock(s, 'T1');
  s.targets[0].hdg = 90;
  run(s, 2.9);
  assert.equal(s.radar.mode, 'STT');
  run(s, 0.2);
  assert.equal(s.radar.mode, 'RWS');
  assert.equal(s.events.at(-1)?.kind, 'lockLost');
});

test('setting power to STBY in STT drops the lock', () => {
  const s = sandbox();
  setPower(s, 'OPR');
  lock(s, 'T1');
  run(s, 0.5);
  assert.equal(s.radar.mode, 'STT');
  setPower(s, 'STBY');
  run(s, 0.1);
  assert.equal(s.radar.mode, 'RWS');
  assert.equal(s.events.at(-1)?.kind, 'lockLost');
});

test('bumping the cursor into the top edge steps the range scale once per push', () => {
  const s = sandbox();
  s.radar.cursor = { u: 0.5, v: 0.02 };
  s.held.tdcY = 1;
  run(s, 1);
  assert.equal(s.radar.rangeScale, 80);
  s.held.tdcY = 0;
  run(s, 0.1);
  s.held.tdcY = 1;
  run(s, 0.5);
  assert.equal(s.radar.rangeScale, 160);
});

test('TDC depress on empty space moves the scan centre', () => {
  const s = sandbox([]);
  setPower(s, 'OPR');
  s.radar.cursor = toBscope(30, 20, 40);
  tdcDepress(s);
  assert.equal(Math.round(s.radar.scanCenter), 30);
});

test('the same seed gives the same picture', () => {
  const a = sandbox();
  const b = sandbox();
  setPower(a, 'OPR');
  setPower(b, 'OPR');
  run(a, 20);
  run(b, 20);
  assert.deepEqual(a.radar.bricks, b.radar.bricks);
});

test('HPRF is weak in a tail chase even when we are the faster aircraft', () => {
  const bricks = (prf: 'HI' | 'MED') => {
    const s = createSim({
      seed: 7,
      own: { spd: 600 },
      targets: [makeTarget({ id: 'T1', x: 0, y: 20, alt: 20000, hdg: 0, spd: 400 })],
    });
    setPower(s, 'OPR');
    s.radar.prf = prf;
    s.radar.azWidth = 20;
    s.radar.bars = 2;
    s.radar.age = 32;
    run(s, 15);
    return s.radar.bricks.length;
  };
  const hiBricks = bricks('HI');
  const medBricks = bricks('MED');
  assert.ok(medBricks >= 10, `medBricks ${medBricks} should be >= 10`);
  assert.ok(hiBricks * 3 < medBricks, `hiBricks ${hiBricks} * 3 should be < medBricks ${medBricks}`);
});
