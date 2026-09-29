import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pruneTracks, rankTracks, trackAt, trackCoast, updateTrack } from './tracks.ts';
import { createSim } from './sim.ts';
import { makeTarget } from './world.ts';
import { MAX_TRACKS } from './constants.ts';

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('a detection creates a trackfile and a later one refreshes it', () => {
  const s = createSim();
  const t = makeTarget({ id: 'T1', x: 0, y: 20 });
  updateTrack(s.radar, t, 1);
  assert.equal(s.radar.tracks.length, 1);
  t.y = 19;
  updateTrack(s.radar, t, 5);
  assert.equal(s.radar.tracks.length, 1);
  assert.equal(s.radar.tracks[0].y, 19);
  assert.equal(s.radar.tracks[0].t, 5);
});

test('the radar keeps at most MAX_TRACKS trackfiles', () => {
  const s = createSim();
  for (let i = 0; i < MAX_TRACKS + 2; i++) updateTrack(s.radar, makeTarget({ id: `T${i}`, x: i, y: 20 }), 0);
  assert.equal(s.radar.tracks.length, MAX_TRACKS);
});

test('trackfiles are dead-reckoned from their last detection', () => {
  const k = trackAt({ targetId: 'T', x: 0, y: 0, alt: 20000, hdg: 90, spd: 360, t: 0, rank: 1 }, 10);
  near(k.x, 1);
  near(k.y, 0);
});

test('coast time is the longer of 8 s and 2.5 frames', () => {
  assert.equal(trackCoast({ azWidth: 140, bars: 4 }), 17.5);
  assert.equal(trackCoast({ azWidth: 20, bars: 2 }), 8);
});

test('stale trackfiles are dropped with their designations, but never the STT target', () => {
  const s = createSim();
  updateTrack(s.radar, makeTarget({ id: 'A', x: 0, y: 20 }), 0);
  updateTrack(s.radar, makeTarget({ id: 'B', x: 1, y: 20 }), 0);
  s.radar.ls = 'A';
  s.radar.dt2 = 'B';
  s.radar.stt = { targetId: 'B', memory: 0, nctrTime: 0, print: null };
  s.t = 30; // beyond the 17.5 s coast of the default 140°/4-bar scan
  pruneTracks(s);
  assert.deepEqual(s.radar.tracks.map((tr) => tr.targetId), ['B']);
  assert.equal(s.radar.ls, null);
  assert.equal(s.radar.dt2, 'B');
});

test('trackfiles are ranked by range, closest first', () => {
  const s = createSim();
  updateTrack(s.radar, makeTarget({ id: 'FAR', x: 0, y: 40 }), 0);
  updateTrack(s.radar, makeTarget({ id: 'NEAR', x: 0, y: 10 }), 0);
  rankTracks(s);
  const rank = (id: string) => s.radar.tracks.find((tr) => tr.targetId === id)!.rank;
  assert.equal(rank('NEAR'), 1);
  assert.equal(rank('FAR'), 2);
});
