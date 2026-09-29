import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSim, run } from './sim.ts';
import { makeTarget } from './world.ts';
import { castle, lock, setPower, setSearchMode, undesignate } from './radar.ts';
import type { Target } from './types.ts';

const withTarget = (t: Target) => {
  const s = createSim({ seed: 4, own: { spd: 250 }, targets: [t] });
  setPower(s, 'OPR');
  return s;
};

test('castle forward enters ACM Boresight and breaks an existing lock', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 20, spd: 250 }));
  lock(s, 'T1');
  castle(s, 'fwd');
  assert.equal(s.radar.mode, 'ACM');
  assert.equal(s.radar.acm, 'BST');
  assert.equal(s.radar.stt, null);
  assert.equal(s.events.at(-1)?.kind, 'acm');
});

test('BST auto-locks a target on the nose inside 10 nm', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 8, spd: 250 }));
  castle(s, 'fwd');
  run(s, 0.5);
  assert.equal(s.radar.mode, 'STT');
  assert.equal(s.radar.stt?.targetId, 'T1');
});

test('BST ignores a target 10° off the nose; castle left (WACQ) finds it', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 1.39, y: 7.88, spd: 250 }));
  castle(s, 'fwd');
  run(s, 1);
  assert.equal(s.radar.mode, 'ACM');
  castle(s, 'left');
  assert.equal(s.radar.acm, 'WACQ');
  run(s, 4);
  assert.equal(s.radar.mode, 'STT');
});

test('castle aft selects VACQ, which locks a target high above the nose inside 5 nm', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 4, alt: 30000, spd: 250 }));
  castle(s, 'fwd');
  castle(s, 'aft');
  assert.equal(s.radar.acm, 'VACQ');
  run(s, 3);
  assert.equal(s.radar.mode, 'STT');
});

test('ACM range gates: nothing beyond 10 nm in BST', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 12, spd: 250 }));
  castle(s, 'fwd');
  run(s, 1);
  assert.equal(s.radar.mode, 'ACM');
});

test('undesignate leaves ACM, and an ACM lock, back to the previous search mode', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 8, spd: 250 }));
  setSearchMode(s, 'TWS');
  castle(s, 'fwd');
  undesignate(s);
  assert.equal(s.radar.mode, 'TWS');
  assert.equal(s.radar.acm, null);
  castle(s, 'fwd');
  run(s, 0.5);
  assert.equal(s.radar.mode, 'STT');
  undesignate(s);
  assert.equal(s.radar.mode, 'TWS');
});

test('castle aft/left/right do nothing outside ACM', () => {
  const s = withTarget(makeTarget({ id: 'T1', x: 0, y: 20 }));
  castle(s, 'aft');
  castle(s, 'left');
  castle(s, 'right');
  assert.equal(s.radar.mode, 'RWS');
});
