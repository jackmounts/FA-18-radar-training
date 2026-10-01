import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim, run } from './sim.ts';
import { makeTarget } from './world.ts';
import { castle, setPower, shownTracks, tdcDepress, undesignate } from './radar.ts';
import { pushbuttons } from './pushbuttons.ts';
import { toBscope } from './geometry.ts';
import type { Sim } from './types.ts';

// two hot contacts 30 nm out, painted within a couple of RWS frames
const pair = () => {
  const s = createSim({
    seed: 3,
    own: { spd: 300 },
    targets: [makeTarget({ id: 'A', x: -5, y: 30, spd: 300 }), makeTarget({ id: 'B', x: 5, y: 25, spd: 300 })],
  });
  setPower(s, 'OPR');
  run(s, 14);
  return s;
};

function onBrick(s: Sim, id: string) {
  const b = s.radar.bricks.findLast((x) => x.targetId === id)!;
  s.radar.cursor = toBscope(b.az, b.range, s.radar.rangeScale);
}

test('LTWS (on by default): the cursor on a brick shows its trackfile; TDC designates first, then locks', () => {
  const s = pair();
  assert.equal(s.radar.ltws, true);
  assert.deepEqual(shownTracks(s), []);
  onBrick(s, 'A');
  assert.deepEqual(shownTracks(s).map((tr) => tr.targetId), ['A']);
  tdcDepress(s);
  assert.equal(s.radar.mode, 'RWS');
  assert.equal(s.radar.ls, 'A');
  tdcDepress(s);
  assert.equal(s.radar.mode, 'STT');
  assert.equal(s.radar.stt?.targetId, 'A');
});

test('LTWS off (DATA PB15): no trackfile preview, TDC on a brick locks at once', () => {
  const s = pair();
  s.radar.dataPage = true;
  pushbuttons(s)[15].press!();
  assert.equal(s.radar.ltws, false);
  onBrick(s, 'A');
  assert.deepEqual(shownTracks(s), []);
  tdcDepress(s);
  assert.equal(s.radar.mode, 'STT');
});

test('TDC priority: without it the cursor and TDC do nothing; castle right takes it', () => {
  const s = pair();
  s.radar.tdc = false;
  const before = { ...s.radar.cursor };
  s.held.tdcX = 1;
  run(s, 0.3);
  assert.deepEqual(s.radar.cursor, before);
  onBrick(s, 'A');
  tdcDepress(s);
  assert.equal(s.radar.ls, null);
  castle(s, 'right');
  assert.equal(s.radar.tdc, true);
  assert.equal(s.radar.mode, 'RWS'); // the first press only assigns the TDC
  run(s, 0.1);
  assert.notDeepEqual(s.radar.cursor, before);
});

test('AACQ (castle right with the TDC): symbol under the cursor, else the L&S, else the #1 trackfile', () => {
  const fast = pair();
  onBrick(fast, 'A');
  castle(fast, 'right');
  assert.equal(fast.radar.stt?.targetId, 'A'); // one press, even with LTWS on

  const ls = pair();
  ls.radar.ls = 'A';
  ls.radar.cursor = { u: 0.05, v: 0.95 };
  castle(ls, 'right');
  assert.equal(ls.radar.stt?.targetId, 'A');

  const prio = pair();
  prio.radar.cursor = { u: 0.05, v: 0.95 };
  castle(prio, 'right');
  assert.equal(prio.radar.stt?.targetId, 'B'); // B is closer: rank 1
});

test('AACQ with nothing to lock arms, then locks the first contact the scan finds; castle aft cancels it', () => {
  const s = createSim({ seed: 3, own: { spd: 300 }, targets: [makeTarget({ id: 'A', x: 0, y: 30, spd: 300 })] });
  setPower(s, 'OPR');
  castle(s, 'right'); // the TDC is already on the radar: this is AACQ
  assert.equal(s.radar.aacq, true);
  assert.equal(s.radar.mode, 'RWS');
  run(s, 20);
  assert.equal(s.radar.stt?.targetId, 'A');
  assert.equal(s.radar.aacq, false);

  const c = createSim();
  setPower(c, 'OPR');
  castle(c, 'right');
  castle(c, 'aft');
  assert.equal(c.radar.aacq, false);
});

test('undesignate in RWS makes the #1 trackfile the L&S', () => {
  const s = pair();
  undesignate(s);
  assert.equal(s.radar.ls, 'B');
  assert.equal(s.radar.mode, 'RWS');
});
