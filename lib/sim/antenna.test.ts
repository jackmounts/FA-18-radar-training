import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barElevation, frameTime, scanEdges, stepAntenna } from './antenna.ts';
import { SIM_DT } from './constants.ts';
import type { Antenna } from './types.ts';

test('frame time = bars x width / scan rate', () => {
  assert.equal(frameTime(140, 4), 7);
  assert.equal(frameTime(60, 2), 1.5);
});

test('a simulated 140 deg / 4-bar frame takes about 7 s', () => {
  const ant: Antenna = { az: -70, el: 0, bar: 0, dir: 1, frame: 0 };
  const s = { azWidth: 140, bars: 4, scanCenter: 0, elev: 0 };
  let t = 0;
  while (ant.frame === 0) {
    stepAntenna(ant, s, SIM_DT);
    t += SIM_DT;
  }
  assert.ok(Math.abs(t - 7) < 0.1, `frame took ${t}s`);
  assert.equal(ant.bar, 0);
});

test('scan edges keep the pattern inside the +/-70 deg gimbal', () => {
  assert.deepEqual(scanEdges({ azWidth: 40, bars: 1, scanCenter: 60, elev: 0 }), [30, 70]);
  assert.deepEqual(scanEdges({ azWidth: 20, bars: 1, scanCenter: -10, elev: 0 }), [-20, 0]);
});

test('bars are stacked 1.2 deg apart around the elevation setting, top bar first', () => {
  const s = { azWidth: 140, bars: 4, scanCenter: 0, elev: 0 };
  assert.ok(Math.abs(barElevation(s, 0) - 1.8) < 1e-9);
  assert.ok(Math.abs(barElevation(s, 3) + 1.8) < 1e-9);
});
