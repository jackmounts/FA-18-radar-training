import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  altitudeCoverage, aspect, bearing, closure, fromBscope, mach, radialSpeed, relAz, toBscope, wrap180,
} from './geometry.ts';

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('bearing is 0 north, clockwise', () => {
  near(bearing({ x: 0, y: 0 }, { x: 0, y: 1 }), 0);
  near(bearing({ x: 0, y: 0 }, { x: 1, y: 0 }), 90);
  near(bearing({ x: 0, y: 0 }, { x: -1, y: 0 }), 270);
});

test('relAz is measured off the nose, right positive', () => {
  near(relAz({ x: 0, y: 0, hdg: 90 }, { x: 1, y: 0 }), 0);
  near(relAz({ x: 0, y: 0, hdg: 90 }, { x: 0, y: 1 }), -90);
  near(wrap180(190), -170);
});

test('B-scope projection round-trips', () => {
  assert.deepEqual(toBscope(0, 20, 40), { u: 0.5, v: 0.5 });
  const back = fromBscope(0.75, 0.25, 80);
  near(back.az, 35);
  near(back.range, 60);
});

test('altitude coverage reproduces the reference case: 4B, 33 nm, 14,760 ft, elevation 0 -> 27 / 3', () => {
  assert.deepEqual(altitudeCoverage(14760, 33, 0, 4), { hi: 27, lo: 3 });
});

test('radial speed is zero for a beaming target and full for a going-away one', () => {
  near(radialSpeed({ x: 0, y: 0 }, { x: 0, y: 10, hdg: 90, spd: 400 }), 0);
  near(radialSpeed({ x: 0, y: 0 }, { x: 0, y: 10, hdg: 0, spd: 400 }), 400);
});

test('closure adds both speeds head-on; aspect is 0 when the target points at us', () => {
  near(closure({ x: 0, y: 0, hdg: 0, spd: 400 }, { x: 0, y: 10, hdg: 180, spd: 400 }), 800);
  near(aspect({ x: 0, y: 0 }, { x: 0, y: 10, hdg: 180, spd: 400 }), 0);
});

test('mach is 1 at sea-level speed of sound', () => {
  near(mach(661.47, 0), 1);
});
