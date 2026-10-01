import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawDdi } from './draw.ts';
import { createSim } from '../sim/sim.ts';
import { makeTarget } from '../sim/world.ts';
import { lock, setPower, setSearchMode, castle } from '../sim/radar.ts';
import { rankTracks, updateTrack } from '../sim/tracks.ts';
import { range, relAz, toBscope } from '../sim/geometry.ts';

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
  for (const want of ['RTS', 'RWS', '★', '25.0', '180°']) assert.ok(texts.includes(want), `missing ${want}`);
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
  for (const want of ['TWS', 'MAN', 'RSET', 'NCTR', '★', '2', '24.0', '180°']) assert.ok(texts.includes(want), `missing ${want}`);
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

test('an armed AACQ shows its legend', () => {
  const s = createSim();
  setPower(s, 'OPR');
  castle(s, 'right');
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  assert.ok(texts.includes('AACQ'));
});

test('ACM frame shows RTS and the boxed ACM legend, and no search options', () => {
  const s = createSim();
  setPower(s, 'OPR');
  castle(s, 'fwd');
  const { ctx, texts } = fakeCtx();
  drawDdi(ctx, s, 600, 'monospace');
  for (const want of ['RTS', 'RWS', 'ACM']) assert.ok(texts.includes(want), `missing ${want}`);
  assert.ok(!texts.includes('ERASE'));
  assert.ok(!texts.includes('SIL'));
});

test('TWS shows Mach and altitude for the trackfile under the cursor too', () => {
  const s = createSim({ targets: [makeTarget({ id: 'B', x: 3, y: 25, alt: 31000 })] });
  setPower(s, 'OPR');
  setSearchMode(s, 'TWS');
  updateTrack(s.radar, s.targets[0], 0);
  rankTracks(s);
  const a = fakeCtx();
  drawDdi(a.ctx, s, 600, 'monospace');
  assert.ok(!a.texts.includes('31.0'));
  s.radar.cursor = toBscope(relAz(s.own, s.targets[0]), range(s.own, s.targets[0]), s.radar.rangeScale);
  const b = fakeCtx();
  drawDdi(b.ctx, s, 600, 'monospace');
  assert.ok(b.texts.includes('31.0'));
});
