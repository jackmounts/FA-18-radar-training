import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawInstructor } from './instructor.ts';
import { createSim } from '../sim/sim.ts';
import { makeTarget } from '../sim/world.ts';
import { castle, lock, setPower } from '../sim/radar.ts';

function fakeCtx() {
  const texts: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) =>
        key === 'fillText'
          ? (s: string) => { texts.push(s); }
          : key === 'measureText'
            ? (s: string) => ({ width: s.length * 6 })
            : () => {},
      set: () => true,
    },
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

const scene = () => {
  const s = createSim({
    targets: [
      makeTarget({ id: 'A', x: 0, y: 20, alt: 25000 }),
      makeTarget({ id: 'FAR', x: 0, y: 90, alt: 33000 }),
    ],
  });
  setPower(s, 'OPR');
  return s;
};

test('plan view and side view label the aircraft inside the radar scale', () => {
  const s = scene();
  const { ctx, texts } = fakeCtx();
  drawInstructor(ctx, s, 300, 'monospace');
  assert.ok(texts.includes('TRUTH · 40 NM'));
  assert.ok(texts.includes('SIDE VIEW · 0–50K FT'));
  assert.ok(texts.includes('25'));
  assert.ok(!texts.includes('33')); // 90 nm is beyond the 40 nm scale
});

test('draws in STT and ACM without throwing', () => {
  const s = scene();
  lock(s, 'A');
  drawInstructor(fakeCtx().ctx, s, 300, 'monospace');
  castle(s, 'fwd');
  drawInstructor(fakeCtx().ctx, s, 300, 'monospace');
});
