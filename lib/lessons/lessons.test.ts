import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS } from './lessons.ts';
import { advance, isComplete, type Lesson } from './lesson.ts';
import { createSim, step } from '../sim/sim.ts';
import { castle, castlePress, setPower, tdcDepress, undesignate } from '../sim/radar.ts';
import { pushbuttons } from '../sim/pushbuttons.ts';
import { bearing, range, relAz, toBscope } from '../sim/geometry.ts';
import { braa } from '../sim/encounters.ts';
import { trackAt } from '../sim/tracks.ts';
import type { Sim } from '../sim/types.ts';

const TUT_IDS = new Set([
  'ddi', 'throttle', 'tdc', 'elevation', 'stick', 'castle', 'undesignate', 'radar-knob', 'flight', 'hud', 'map',
  ...Array.from({ length: 20 }, (_, i) => `pb-${i + 1}`),
]);

function runUntil(s: Sim, done: (s: Sim) => boolean, seconds = 90) {
  for (let i = 0; i < seconds * 60 && !done(s); i++) step(s);
  return done(s);
}

/** Cursor onto a target's symbol: its trackfile in TWS, otherwise its newest brick. */
function aim(s: Sim, id: string) {
  const tr = s.radar.tracks.find((x) => x.targetId === id);
  if (s.radar.mode === 'TWS' && tr) {
    const k = trackAt(tr, s.t);
    s.radar.cursor = toBscope(relAz(s.own, k), range(s.own, k), s.radar.rangeScale);
    return;
  }
  const b = s.radar.bricks.findLast((x) => x.targetId === id);
  assert.ok(b, `no brick for ${id}`);
  s.radar.cursor = toBscope(b.az, b.range, s.radar.rangeScale);
}

/** Press a pushbutton until a condition holds (e.g. cycle PB19 to 60°). */
function pressUntil(s: Sim, n: number, done: (s: Sim) => boolean) {
  for (let i = 0; i < 10 && !done(s); i++) pushbuttons(s)[n].press!();
}

/** Lock a contact the way the lessons teach: cursor on its brick, TDC twice (LTWS: first ★, then STT). */
function lockOn(s: Sim, id: string) {
  assert.ok(runUntil(s, (x) => x.radar.bricks.some((b) => b.targetId === id)), `${id} never painted`);
  aim(s, id);
  tdcDepress(s);
  tdcDepress(s);
}

/** Play a lesson start to finish. Info steps are clicked through.
 *  Action steps run the scripted action, then the sim until the step's condition holds. */
function walk(lesson: Lesson, actions: Record<number, (s: Sim) => void>) {
  const s = lesson.setup();
  let i = 0;
  while (!isComplete(lesson, i)) {
    const current = lesson.steps[i];
    if (!current.until) {
      i += 1;
      continue;
    }
    actions[i]?.(s);
    assert.ok(runUntil(s, current.until), `${lesson.id}: step ${i + 1} never completed`);
    const next = advance(lesson, i, s);
    assert.equal(next, i + 1);
    i = next;
  }
}

const lesson = (id: string) => LESSONS.find((l) => l.id === id)!;

test('advance: info steps never auto-advance; action steps advance once their condition holds', () => {
  const l: Lesson = {
    id: 'x', title: 'X', summary: '', setup: () => createSim(),
    steps: [{ text: 'info' }, { text: 'act', until: (s) => s.radar.power === 'OPR' }],
  };
  const s = l.setup();
  assert.equal(advance(l, 0, s), 0);
  assert.equal(advance(l, 1, s), 1);
  s.radar.power = 'OPR';
  assert.equal(advance(l, 1, s), 2);
  assert.ok(isComplete(l, 2));
});

test('lessons are in order, non-trivial, and only spotlight elements that exist', () => {
  assert.deepEqual(LESSONS.map((l) => l.id), ['tutorial', 'scan', 'elevation', 'lock', 'tws', 'ident', 'acm', 'notch', 'awacs']);
  for (const l of LESSONS) {
    assert.ok(l.steps.length >= 4, `${l.id} is too short`);
    for (const st of l.steps) for (const h of st.highlight ?? []) assert.ok(TUT_IDS.has(h), `${l.id}: unknown highlight ${h}`);
  }
});

test('tutorial is completable', () =>
  walk(lesson('tutorial'), {
    1: (s) => setPower(s, 'OPR'),
    3: (s) => castle(s, 'right'),
    4: (s) => pressUntil(s, 19, (x) => x.radar.azWidth === 60),
    5: (s) => pressUntil(s, 6, (x) => x.radar.bars === 2),
    6: (s) => pressUntil(s, 11, (x) => x.radar.rangeScale === 80),
    7: (s) => { s.radar.elev = 3.5; },
    8: (s) => lockOn(s, 'T1'),
    10: (s) => undesignate(s),
  }));

test('scan lesson is completable', () =>
  walk(lesson('scan'), {
    1: (s) => pressUntil(s, 19, (x) => x.radar.azWidth === 20),
    2: (s) => {
      s.radar.cursor = toBscope(-30, 20, s.radar.rangeScale);
      tdcDepress(s);
    },
    3: (s) => pressUntil(s, 6, (x) => x.radar.bars === 2),
  }));

test('elevation lesson is completable', () =>
  walk(lesson('elevation'), {
    1: (s) => { s.radar.cursor = toBscope(0, 30, s.radar.rangeScale); },
    2: (s) => { s.radar.elev = -6; },
  }));

test('lock lesson is completable', () =>
  walk(lesson('lock'), {
    0: (s) => lockOn(s, 'T1'),
    2: (s) => { s.held.turn = -1; },
  }));

test('TWS lesson is completable', () =>
  walk(lesson('tws'), {
    0: (s) => pressUntil(s, 5, (x) => x.radar.mode === 'TWS'),
    2: (s) => {
      assert.ok(runUntil(s, (x) => x.radar.tracks.length >= 3));
      aim(s, 'C');
      tdcDepress(s);
    },
    3: (s) => {
      aim(s, 'L');
      tdcDepress(s);
    },
    4: (s) => {
      undesignate(s);
      pushbuttons(s)[14].press!();
    },
    5: (s) => undesignate(s),
    6: (s) => pushbuttons(s)[13].press!(),
  }));

test('identification lesson is completable', () =>
  walk(lesson('ident'), {
    1: (s) => pressUntil(s, 5, (x) => x.radar.mode === 'TWS'),
    2: (s) => {
      assert.ok(runUntil(s, (x) => x.radar.tracks.length >= 2));
      aim(s, 'F');
      castlePress(s);
      aim(s, 'H');
      castlePress(s);
    },
    3: (s) => {
      aim(s, 'H');
      tdcDepress(s);
      aim(s, 'H');
      tdcDepress(s);
    },
  }));

test('ACM lesson is completable', () =>
  walk(lesson('acm'), {
    1: (s) => castle(s, 'fwd'),
    2: (s) => { s.own.hdg = bearing(s.own, s.targets[0]); },
    3: (s) => {
      undesignate(s);
      castle(s, 'fwd');
      castle(s, 'left');
    },
  }));

test('notch lesson is completable', () =>
  walk(lesson('notch'), {
    1: (s) => pressUntil(s, 1, (x) => x.radar.prf === 'HI'),
    2: (s) => lockOn(s, 'T1'),
  }));

test('AWACS lesson matches its BRAA call and is completable (Fast Acq lock)', () => {
  const s = lesson('awacs').setup();
  assert.ok(lesson('awacs').steps[0].text.includes(braa(s.own, s.targets[0])));
  walk(lesson('awacs'), {
    1: (x) => pressUntil(x, 11, (y) => y.radar.rangeScale === 80),
    2: (x) => { x.radar.cursor = toBscope(35, 45, x.radar.rangeScale); },
    3: (x) => { x.radar.elev = -3.6; },
    4: (x) => {
      assert.ok(runUntil(x, (y) => y.radar.bricks.some((b) => b.targetId === 'T1')), 'T1 never painted');
      aim(x, 'T1');
      castle(x, 'right');
    },
  });
});
