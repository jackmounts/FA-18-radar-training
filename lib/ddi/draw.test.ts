import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawDdi } from './draw.ts';
import { createSim } from '../sim/sim.ts';
import { makeTarget } from '../sim/world.ts';
import { lock, setPower, setSearchMode, castle } from '../sim/radar.ts';
import { rankTracks, updateTrack } from '../sim/tracks.ts';

function fakeCtx() {
  const texts: string[] = [];
  const calls = { save: 0, restore: 0 };
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) =>
        key === 'fillText'
          ? (s: string) => { texts.push(s); }
          : key === 'save' || key === 'restore'
            ? () => { calls[key]++; }
          : key === 'measureText'
            ? (s: string) => ({ width: s.length * 6 })
            : () => {},
      set: () => true,
    },
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts, calls };
}

test('RWS frame draws the legends and pushbutton labels', () => {
  const s = createSim();
  setPower(s, 'OPR');
  const { ctx, texts, calls } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  assert.equal(calls.save, calls.restore);
  assert.ok(calls.save >= 1);
  for (const want of ['OPR', 'RWS', '140°', 'MENU', 'DATA', 'ERASE', '40', '360°', '20000']) {
    assert.ok(texts.includes(want), `missing ${want}`);
  }
});

test('STT frame draws the L&S star, RTS and target data', () => {
  const s = createSim({ targets: [makeTarget({ id: 'T1', x: 0, y: 20, alt: 25000 })] });
  setPower(s, 'OPR');
  lock(s, 'T1');
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  for (const want of ['RTS', 'RWS', '★', '25', '180°']) assert.ok(texts.includes(want), `missing ${want}`);
});

test('radar OFF shows the OFF legend', () => {
  const s = createSim();
  setPower(s, 'OFF');
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  assert.ok(texts.includes('OFF'));
});

test('TWS frame draws ranked trackfiles, the L&S star and its data', () => {
  const s = createSim({
    targets: [makeTarget({ id: 'A', x: -3, y: 20, alt: 24000 }), makeTarget({ id: 'B', x: 3, y: 25 })],
  });
  setPower(s, 'OPR');
  setSearchMode(s, 'TWS');
  for (const t of s.targets) updateTrack(s.radar, t, 0);
  rankTracks(s);
  s.radar.ls = 'A';
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  for (const want of ['TWS', 'MAN', 'RSET', 'NCTR', '★', '2', '24', '180°']) assert.ok(texts.includes(want), `missing ${want}`);
});

test('STT frame shows the NCTR print once available', () => {
  const s = createSim({ targets: [makeTarget({ id: 'T1', x: 0, y: 20 })] });
  setPower(s, 'OPR');
  lock(s, 'T1');
  s.radar.stt!.print = 'MIG-29';
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  assert.ok(texts.includes('NCTR MIG-29'));
});

test('ACM frame shows the sub-mode legend and no cursor altitude numbers', () => {
  const s = createSim();
  setPower(s, 'OPR');
  castle(s, 'fwd');
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  assert.ok(texts.includes('BST'));
  assert.ok(!texts.includes('ERASE'));
});
