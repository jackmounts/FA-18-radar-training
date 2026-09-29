import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushbuttons } from './pushbuttons.ts';
import { createSim } from './sim.ts';
import { makeTarget } from './world.ts';
import { lock, setPower } from './radar.ts';

test('RWS pushbuttons cycle the scan settings', () => {
  const s = createSim();
  assert.equal(pushbuttons(s)[5].label, 'RWS');
  assert.equal(pushbuttons(s)[18].label, 'MENU');
  assert.equal(pushbuttons(s)[1].label, 'HI\nINTL');
  pushbuttons(s)[19].press!();
  assert.equal(s.radar.azWidth, 20);
  pushbuttons(s)[6].press!();
  assert.equal(s.radar.bars, 6);
  pushbuttons(s)[1].press!();
  assert.equal(s.radar.prf, 'MED');
  pushbuttons(s)[11].press!();
  assert.equal(s.radar.rangeScale, 80);
  pushbuttons(s)[12].press!();
  assert.equal(s.radar.rangeScale, 40);
});

test('SIL toggles and is boxed; ERASE clears bricks', () => {
  const s = createSim();
  s.radar.bricks.push({ targetId: 'T1', az: 0, range: 20, t: 0 });
  pushbuttons(s)[8].press!();
  assert.equal(s.radar.bricks.length, 0);
  pushbuttons(s)[7].press!();
  assert.equal(s.radar.sil, true);
  assert.equal(pushbuttons(s)[7].boxed, true);
});

test('the DATA sub-level exposes AGE and exits', () => {
  const s = createSim();
  pushbuttons(s)[16].press!();
  const data = pushbuttons(s);
  assert.equal(data[16].boxed, true);
  assert.equal(data[19], undefined);
  data[10].press!();
  assert.equal(s.radar.age, 16);
  pushbuttons(s)[16].press!();
  assert.equal(s.radar.dataPage, false);
});

test('STT swaps PB5 to RTS and removes the range and azimuth buttons', () => {
  const s = createSim({ targets: [makeTarget({ id: 'T1', x: 0, y: 20 })] });
  setPower(s, 'OPR');
  lock(s, 'T1');
  const pbs = pushbuttons(s);
  assert.equal(pbs[5].label, 'RTS\nRWS');
  assert.equal(pbs[11], undefined);
  assert.equal(pbs[19], undefined);
  pbs[5].press!();
  assert.equal(s.radar.mode, 'RWS');
});
