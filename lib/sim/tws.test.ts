import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim, run } from './sim.ts';
import { makeTarget } from './world.ts';
import { lock, rset, setPower, setSearchMode, sttToTws, tdcDepress, undesignate } from './radar.ts';
import { range, relAz, toBscope } from './geometry.ts';
import { trackAt } from './tracks.ts';
import type { Sim } from './types.ts';

// three contacts 30 nm out, 12° apart, all hot
const trio = () => {
  const s = createSim({
    seed: 3,
    own: { spd: 300 },
    targets: [
      makeTarget({ id: 'L', x: -6.2, y: 29.4, spd: 300 }),
      makeTarget({ id: 'C', x: 0, y: 30, spd: 300 }),
      makeTarget({ id: 'R', x: 6.2, y: 29.4, spd: 300 }),
    ],
  });
  setPower(s, 'OPR');
  return s;
};

/** Put the cursor on a target's trackfile symbol. */
function aim(s: Sim, id: string) {
  const k = trackAt(s.radar.tracks.find((tr) => tr.targetId === id)!, s.t);
  s.radar.cursor = toBscope(relAz(s.own, k), range(s.own, k), s.radar.rangeScale);
}

const byRank = (s: Sim) => [...s.radar.tracks].sort((a, b) => a.rank - b.rank).map((tr) => tr.targetId);

test('entering TWS clips the scan to the ~3 s frame limits', () => {
  const s = trio();
  setSearchMode(s, 'TWS');
  assert.equal(s.radar.mode, 'TWS');
  assert.equal(s.radar.azWidth, 60);
  assert.equal(s.radar.bars, 4);
  s.radar.bars = 1;
  s.radar.azWidth = 140;
  setSearchMode(s, 'TWS');
  assert.equal(s.radar.bars, 2);
  assert.equal(s.radar.azWidth, 80);
});

test('detections build trackfiles (latent in RWS too)', () => {
  const s = trio();
  run(s, 8);
  assert.deepEqual(byRank(s).sort(), ['C', 'L', 'R']);
});

test('TDC ladder in TWS: trackfile → L&S, another → DT2, DT2 → L&S (swap), L&S → STT', () => {
  const s = trio();
  setSearchMode(s, 'TWS');
  run(s, 4);
  aim(s, 'C');
  tdcDepress(s);
  assert.equal(s.radar.ls, 'C');
  aim(s, 'L');
  tdcDepress(s);
  assert.equal(s.radar.dt2, 'L');
  aim(s, 'L');
  tdcDepress(s);
  assert.deepEqual([s.radar.ls, s.radar.dt2], ['L', 'C']);
  aim(s, 'L');
  tdcDepress(s);
  assert.equal(s.radar.mode, 'STT');
  assert.deepEqual(s.radar.tracks.map((tr) => tr.targetId), ['L']); // STT drops the other trackfiles
  assert.equal(s.radar.searchMode, 'TWS');
});

test('undesignate ladder in TWS: none → #1, L&S + DT2 → swap, L&S alone → next rank', () => {
  const s = trio();
  setSearchMode(s, 'TWS');
  run(s, 4);
  undesignate(s);
  assert.equal(s.radar.ls, byRank(s)[0]);
  aim(s, byRank(s)[2]);
  tdcDepress(s);
  assert.equal(s.radar.dt2, byRank(s)[2]);
  const before = [s.radar.ls, s.radar.dt2];
  undesignate(s);
  assert.deepEqual([s.radar.ls, s.radar.dt2], [before[1], before[0]]);
  rset(s);
  assert.deepEqual([s.radar.ls, s.radar.dt2], [null, null]);
  undesignate(s);
  undesignate(s);
  assert.equal(s.radar.ls, byRank(s)[1]);
});

test('STT returns to the search mode it came from; PB10 path drops to TWS with AUTO centring', () => {
  const s = trio();
  setSearchMode(s, 'TWS');
  run(s, 4);
  lock(s, 'C');
  undesignate(s);
  assert.equal(s.radar.mode, 'TWS');
  assert.equal(s.events.at(-1)?.kind, 'rts');
  lock(s, 'C');
  sttToTws(s);
  assert.equal(s.radar.mode, 'TWS');
  assert.equal(s.radar.centering, 'AUTO');
  assert.equal(s.radar.ls, 'C');
});

test('AUTO centring points the scan at the L&S; TDC on empty space then leaves it alone', () => {
  const s = trio();
  setSearchMode(s, 'TWS');
  run(s, 4);
  s.radar.ls = 'R';
  s.radar.centering = 'AUTO';
  run(s, 0.1);
  const k = trackAt(s.radar.tracks.find((tr) => tr.targetId === 'R')!, s.t);
  assert.ok(Math.abs(s.radar.scanCenter - relAz(s.own, k)) < 0.5);
  s.radar.cursor = toBscope(-40, 5, s.radar.rangeScale);
  const centre = s.radar.scanCenter;
  tdcDepress(s);
  assert.equal(s.radar.scanCenter, centre);
});

test('TWS cursor bumps respect the TWS azimuth limits', () => {
  const s = trio();
  setSearchMode(s, 'TWS'); // 60°/4B: allowed widths 20/40/60
  s.radar.cursor = { u: 0.99, v: 0.5 };
  s.held.tdcX = 1;
  run(s, 0.2);
  assert.equal(s.radar.azWidth, 20); // wraps past 60
});
