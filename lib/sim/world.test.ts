import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeTarget, moveMover, stepOwnship, stepTarget } from './world.ts';
import { radialSpeed } from './geometry.ts';

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const still = () => ({ x: 0, y: 0, alt: 20000, hdg: 0, spd: 0 });

test('moveMover covers speed x time', () => {
  const m = { x: 0, y: 0, alt: 0, hdg: 90, spd: 360 };
  moveMover(m, 10);
  near(m.x, 1);
  near(m.y, 0);
});

test('ownship turns, climbs and slows at the rate limits', () => {
  const own = { x: 0, y: 0, alt: 20000, hdg: 0, spd: 450 };
  const held = { tdcX: 0, tdcY: 0, elev: 0, turn: 1, fine: false, climb: 1, accel: -1 };
  for (let i = 0; i < 60; i++) stepOwnship(own, held, 1 / 60);
  near(own.hdg, 6);
  near(own.alt, 20100);
  near(own.spd, 440);
});

test('a turnTo leg completes on the exact heading and is removed', () => {
  const t = makeTarget({ id: 'T', x: 0, y: 10, hdg: 180, legs: [{ kind: 'turnTo', hdg: 270 }] });
  for (let i = 0; i < 40 * 60; i++) stepTarget(t, still(), 1 / 60);
  assert.equal(t.hdg, 270);
  assert.equal(t.legs.length, 0);
});

test('a beam leg puts the target in the Doppler notch', () => {
  const own = still();
  const t = makeTarget({ id: 'T', x: 0, y: 30, hdg: 180, spd: 400, legs: [{ kind: 'beam', seconds: 120 }] });
  for (let i = 0; i < 40 * 60; i++) stepTarget(t, own, 1 / 60);
  assert.ok(Math.abs(radialSpeed(own, t)) < 90);
});
