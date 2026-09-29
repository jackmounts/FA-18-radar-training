import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFreePlay, freePlayStatus, stepFreePlay, type FreePlay } from './freeplay.ts';
import { step } from './sim.ts';
import { lock } from './radar.ts';
import { FIRST_ENCOUNTER_S, NEXT_ENCOUNTER_DELAY_S } from './constants.ts';
import type { Sim } from './types.ts';

function tick(s: Sim, fp: FreePlay, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    step(s);
    stepFreePlay(s, fp);
  }
}

test('free play starts with the radar on and spawns the first tasking after a few seconds', () => {
  const { sim, fp } = createFreePlay('easy', 1);
  assert.equal(sim.radar.power, 'OPR');
  assert.equal(sim.targets.length, 0);
  assert.equal(freePlayStatus(sim, fp), 'Stand by for tasking…');
  tick(sim, fp, FIRST_ENCOUNTER_S + 0.1);
  assert.ok(fp.enc);
  assert.equal(sim.targets.length, 1);
  assert.equal(sim.events.at(-1)?.kind, 'tasking');
  assert.match(freePlayStatus(sim, fp), /Lock the bandit\. · \d:\d\d$/);
});

test('winning scores, clears the picture and queues the next encounter', () => {
  const { sim, fp } = createFreePlay('easy', 2);
  tick(sim, fp, FIRST_ENCOUNTER_S + 0.1);
  lock(sim, sim.targets[0].id);
  tick(sim, fp, 0.1);
  assert.equal(fp.enc, null);
  assert.ok(fp.score > 0);
  assert.equal(sim.targets.length, 0);
  assert.equal(sim.radar.mode, 'RWS');
  assert.equal(sim.events.at(-1)?.kind, 'debrief');
  assert.match(freePlayStatus(sim, fp), /^Objective complete .* next tasking in \d+ s$/);
  tick(sim, fp, NEXT_ENCOUNTER_DELAY_S + 0.1);
  assert.ok(fp.enc);
  assert.equal(fp.count, 2);
});

test('running out of time is reported and free play moves on', () => {
  const { sim, fp } = createFreePlay('easy', 3);
  tick(sim, fp, FIRST_ENCOUNTER_S + 0.1);
  sim.t = fp.enc!.start + fp.enc!.timeLimit + 1;
  tick(sim, fp, 0.05);
  assert.equal(fp.enc, null);
  assert.match(fp.last, /Time's up/);
  assert.equal(fp.score, 0);
});
