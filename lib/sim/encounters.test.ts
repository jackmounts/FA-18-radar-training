import { test } from 'node:test';
import assert from 'node:assert/strict';
import { braa, evaluate, generateEncounter, type Encounter, type Objective } from './encounters.ts';
import { createSim, mulberry32 } from './sim.ts';
import { makeTarget } from './world.ts';
import { breakLock, lock } from './radar.ts';
import { aspect, range, relAz } from './geometry.ts';

const own = { x: 0, y: 0, alt: 20000, hdg: 0, spd: 400 };
const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('BRAA call: bearing / range / angels / aspect word', () => {
  assert.equal(braa(own, { x: 0, y: 30, alt: 25000, hdg: 180, spd: 400 }), 'BRAA 360 / 30 / ANGELS 25 / HOT');
  assert.equal(braa(own, { x: 30, y: 0, alt: 10000, hdg: 90, spd: 400 }), 'BRAA 090 / 30 / ANGELS 10 / DRAG');
});

test('generation is deterministic for a seed', () => {
  assert.deepEqual(
    generateEncounter(mulberry32(1), 'hard', own, 1, 0, 0),
    generateEncounter(mulberry32(1), 'hard', own, 1, 0, 0),
  );
});

test('easy: one hot bandit near the nose at about our altitude, LOCK objective', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { targets, encounter } = generateEncounter(mulberry32(seed), 'easy', own, seed, 0, 0);
    assert.equal(targets.length, 1);
    const [t] = targets;
    assert.equal(t.side, 'hostile');
    assert.ok(Math.abs(relAz(own, t)) <= 20.001);
    assert.ok(range(own, t) >= 25 && range(own, t) <= 40);
    assert.ok(Math.abs(t.alt - own.alt) <= 5000.001);
    assert.ok(aspect(own, t) <= 5.001);
    assert.equal(encounter.objective, 'LOCK');
    assert.match(encounter.tasking, /^BRAA \d{3} \/ \d+ \/ ANGELS \d+ \/ HOT\. Lock the bandit\.$/);
  }
});

test('normal: one bandit plus 1–2 friendlies that answer IFF', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { targets, encounter } = generateEncounter(mulberry32(seed), 'normal', own, seed, 0, 0);
    const friends = targets.filter((t) => t.side === 'friendly');
    assert.equal(targets.filter((t) => t.side === 'hostile').length, 1);
    assert.ok(friends.length >= 1 && friends.length <= 2);
    assert.ok(friends.every((f) => f.iffReplies));
    assert.ok(['ID_ALL', 'ID_AND_LOCK'].includes(encounter.objective));
  }
});

test('hard: a 2-ship flying 1.5 nm abreast that will beam', () => {
  const { targets, encounter } = generateEncounter(mulberry32(7), 'hard', own, 1, 0, 0);
  const [a, b] = targets.filter((t) => t.side === 'hostile');
  near(range(a, b), 1.5);
  assert.equal(a.legs[1].kind, 'beam');
  assert.equal(encounter.objective, 'ID_AND_LOCK');
});

function scenario(objective: Objective) {
  const s = createSim({ own });
  const h = makeTarget({ id: 'h', x: 0, y: 20 });
  const f = makeTarget({ id: 'f', type: 'F-16', side: 'friendly', iffReplies: true, x: 5, y: 25, hdg: 90 });
  s.targets = [h, f];
  const enc: Encounter = { objective, tasking: '', timeLimit: 180, start: 0, eventStart: 0, targetIds: ['h', 'f'] };
  return { s, enc, h, f };
}

test('LOCK is won by locking the hostile; the score loses a point every 3 s', () => {
  const { s, enc } = scenario('LOCK');
  assert.equal(evaluate(s, enc).status, 'running');
  s.t = 30;
  lock(s, 'h');
  const o = evaluate(s, enc);
  assert.equal(o.status, 'won');
  assert.equal(o.status === 'won' ? o.score : -1, 90);
});

test('ID_ALL needs every contact correctly identified', () => {
  const { s, enc, h, f } = scenario('ID_ALL');
  h.ident = 'hostile';
  assert.equal(evaluate(s, enc).status, 'running');
  f.ident = 'friendly';
  assert.equal(evaluate(s, enc).status, 'won');
});

test('spiking a friendly with STT costs 50 points', () => {
  const { s, enc } = scenario('LOCK');
  lock(s, 'f');
  breakLock(s, 'rts');
  lock(s, 'h');
  const o = evaluate(s, enc);
  assert.equal(o.status === 'won' ? o.score : -1, 50);
});

test('lost on timeout, or when a bandit merges inside 5 nm', () => {
  const a = scenario('LOCK');
  a.s.t = 181;
  const o = evaluate(a.s, a.enc);
  assert.equal(o.status, 'lost');
  assert.match(o.status === 'lost' ? o.text : '', /^Time’s up\. The bandit never showed on your scope/);
  const b = scenario('LOCK');
  b.h.y = 4;
  assert.equal(evaluate(b.s, b.enc).status, 'lost');
});
