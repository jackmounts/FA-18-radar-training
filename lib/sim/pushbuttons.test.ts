import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushbuttons } from './pushbuttons.ts';
import { createSim } from './sim.ts';
import { makeTarget } from './world.ts';
import { lock, setPower, castle } from './radar.ts';

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

test('PB5 toggles RWS ↔ TWS; TWS shows AUTO/MAN at PB13 and no ERASE', () => {
  const s = createSim();
  pushbuttons(s)[5].press!();
  assert.equal(s.radar.mode, 'TWS');
  const pbs = pushbuttons(s);
  assert.equal(pbs[5].label, 'TWS');
  assert.equal(pbs[13].label, 'MAN');
  assert.equal(pbs[8], undefined);
  pbs[13].press!();
  assert.equal(s.radar.centering, 'AUTO');
  pushbuttons(s)[5].press!();
  assert.equal(s.radar.mode, 'RWS');
});

test('TWS bar and azimuth buttons stay inside the frame limits', () => {
  const s = createSim();
  pushbuttons(s)[5].press!(); // TWS: 60°/4B
  pushbuttons(s)[19].press!();
  assert.equal(s.radar.azWidth, 20);
  pushbuttons(s)[19].press!();
  pushbuttons(s)[19].press!();
  assert.equal(s.radar.azWidth, 60);
  pushbuttons(s)[6].press!();
  assert.equal(s.radar.bars, 6);
  assert.equal(s.radar.azWidth, 40); // 6 bars cap the scan at 40°
  pushbuttons(s)[6].press!();
  assert.equal(s.radar.bars, 2);
});

test('RSET clears the designations; NCTR is boxed and toggles', () => {
  const s = createSim();
  s.radar.ls = 'A';
  s.radar.dt2 = 'B';
  pushbuttons(s)[14].press!();
  assert.deepEqual([s.radar.ls, s.radar.dt2], [null, null]);
  assert.equal(pushbuttons(s)[15].boxed, true);
  pushbuttons(s)[15].press!();
  assert.equal(s.radar.nctr, false);
});

test('in STT, PB10 drops to TWS with AUTO centring on the locked target', () => {
  const s = createSim({ targets: [makeTarget({ id: 'T1', x: 0, y: 20 })] });
  setPower(s, 'OPR');
  lock(s, 'T1');
  const pbs = pushbuttons(s);
  assert.equal(pbs[10].label, 'TWS');
  pbs[10].press!();
  assert.equal(s.radar.mode, 'TWS');
  assert.equal(s.radar.centering, 'AUTO');
  assert.equal(s.radar.ls, 'T1');
});

test('in ACM, PB5 shows the ACM sub-mode and the search controls disappear', () => {
  const s = createSim();
  castle(s, 'fwd');
  const pbs = pushbuttons(s);
  assert.equal(pbs[5].label, 'BST');
  assert.equal(pbs[7].label, 'SIL');
  assert.equal(pbs[19], undefined);
  assert.equal(pbs[11], undefined);
  castle(s, 'aft');
  assert.equal(pushbuttons(s)[5].label, 'VACQ');
});
