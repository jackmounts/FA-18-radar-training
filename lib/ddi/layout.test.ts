import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pbPlace } from './layout.ts';

test('pushbuttons are numbered clockwise from the bottom of the left column', () => {
  assert.deepEqual(pbPlace(1), { side: 'left', t: 0.8 });
  assert.deepEqual(pbPlace(5), { side: 'left', t: 0.2 });
  assert.deepEqual(pbPlace(6), { side: 'top', t: 0.2 });
  assert.deepEqual(pbPlace(11), { side: 'right', t: 0.2 });
  assert.deepEqual(pbPlace(16), { side: 'bottom', t: 0.8 });
  assert.deepEqual(pbPlace(18), { side: 'bottom', t: 0.5 });
  assert.deepEqual(pbPlace(20), { side: 'bottom', t: 0.2 });
});
