import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acmLanes, stepAcmAntenna } from './acm.ts';
import { ACM_PATTERNS, SIM_DT } from './constants.ts';
import type { Antenna } from './types.ts';

const near = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('lanes: BST is one column on the nose, VACQ two columns, WACQ five rows', () => {
  assert.deepEqual(acmLanes(ACM_PATTERNS.BST), { long: 'el', lanes: [0] });
  const v = acmLanes(ACM_PATTERNS.VACQ);
  assert.equal(v.long, 'el');
  near(v.lanes[0], -1.35);
  near(v.lanes[1], 1.35);
  const w = acmLanes(ACM_PATTERNS.WACQ);
  assert.equal(w.long, 'az');
  assert.equal(w.lanes.length, 5);
  near(w.lanes[0], -7.35);
  near(w.lanes[4], 4.35);
});

test('BST nods its beam through ±1.7° on the nose, completing many frames per second', () => {
  const ant: Antenna = { az: 5, el: 0, bar: 0, dir: 1, frame: 0 };
  let lo = 0;
  let hi = 0;
  for (let i = 0; i < 60; i++) {
    stepAcmAntenna(ant, ACM_PATTERNS.BST, SIM_DT);
    lo = Math.min(lo, ant.el);
    hi = Math.max(hi, ant.el);
    assert.equal(ant.az, 0);
  }
  assert.ok(hi <= 1.7 && lo >= -1.7);
  assert.ok(ant.frame >= 10);
});

test('a VACQ frame is two vertical passes (about 1.5 s)', () => {
  const ant: Antenna = { az: 0, el: -13, bar: 0, dir: 1, frame: 0 };
  let t = 0;
  while (ant.frame === 0) {
    stepAcmAntenna(ant, ACM_PATTERNS.VACQ, SIM_DT);
    t += SIM_DT;
  }
  assert.ok(Math.abs(t - (2 * 59) / 80) < 0.1, `frame took ${t}s`);
});
