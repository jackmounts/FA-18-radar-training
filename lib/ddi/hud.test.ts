import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawHud } from './hud.ts';
import { createSim } from '../sim/sim.ts';
import { makeTarget } from '../sim/world.ts';
import { castle, lock, setPower } from '../sim/radar.ts';

/** Records fillText strings and the names of every other method called. */
function fakeCtx() {
  const texts: string[] = [];
  const calls: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) =>
        key === 'fillText'
          ? (s: string) => { texts.push(s); }
          : key === 'measureText'
            ? (s: string) => ({ width: s.length * 6 })
            : () => { calls.push(String(key)); },
      set: () => true,
    },
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts, calls };
}

const scene = () => {
  const s = createSim({
    targets: [makeTarget({ id: 'T', x: 0, y: 4 }), makeTarget({ id: 'FAR', x: 0, y: 30 })],
  });
  setPower(s, 'OPR');
  return s;
};

test('BST: legend, boresight circle, and only aircraft within visual range', () => {
  const s = scene();
  castle(s, 'fwd');
  const { ctx, texts, calls } = fakeCtx();
  drawHud(ctx, s, 300, 'monospace');
  assert.ok(texts.includes('BST'));
  assert.ok(calls.includes('arc'));
  assert.ok(texts.includes('4.0'));
  assert.ok(!texts.includes('30.0'));
});

test('VACQ draws its box; STT draws the lock box and LOCK', () => {
  const s = scene();
  castle(s, 'fwd');
  castle(s, 'aft');
  const a = fakeCtx();
  drawHud(a.ctx, s, 300, 'monospace');
  assert.ok(a.texts.includes('VACQ'));
  assert.ok(a.calls.includes('strokeRect'));
  lock(s, 'T');
  const b = fakeCtx();
  drawHud(b.ctx, s, 300, 'monospace');
  assert.ok(b.texts.includes('LOCK'));
  assert.ok(b.texts.includes('STT'));
});

test('HUD target designator: square for unknown or friendly, diamond for hostile', () => {
  const s = scene();
  lock(s, 'T');
  const a = fakeCtx();
  drawHud(a.ctx, s, 300, 'monospace');
  assert.ok(a.calls.includes('rect'));
  s.targets[0].ident = 'hostile';
  const b = fakeCtx();
  drawHud(b.ctx, s, 300, 'monospace');
  assert.ok(!b.calls.includes('rect'));
});
