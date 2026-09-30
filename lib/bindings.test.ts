import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  actionForKey, assign, captureStart, captureStep, defaultBindings, padActions, padLabel, parseBindings, type Pad,
} from './bindings.ts';

const pad = (buttons: boolean[] = [], axes: number[] = [], id = 'Stick'): Pad => ({
  id,
  buttons: buttons.map((pressed) => ({ pressed })),
  axes,
});

test('defaults: every action has its default key and no joystick input', () => {
  const b = defaultBindings();
  assert.equal(actionForKey(b, 'Space'), 'designate');
  assert.equal(actionForKey(b, 'KeyQ'), null);
  assert.equal(b.designate.pad, null);
});

test('assigning an input takes it away from any other action', () => {
  let b = assign(defaultBindings(), 'designate', { key: 'KeyW' });
  assert.equal(actionForKey(b, 'KeyW'), 'designate');
  assert.equal(b.tdcUp.key, null);
  b = assign(b, 'undesignate', { pad: { pad: 'Stick', button: 2 } });
  b = assign(b, 'designate', { pad: { pad: 'Stick', button: 2 } });
  assert.deepEqual(b.designate.pad, { pad: 'Stick', button: 2 });
  assert.equal(b.undesignate.pad, null);
  assert.equal(b.undesignate.key, 'KeyU'); // the other slot is untouched
});

test('joystick buttons, axis directions and hat positions drive actions', () => {
  let b = assign(defaultBindings(), 'designate', { pad: { pad: 'Stick', button: 0 } });
  b = assign(b, 'tdcRight', { pad: { pad: 'Throttle', axis: 0, value: 1 } });
  b = assign(b, 'castleRight', { pad: { pad: 'Stick', axis: 9, value: -0.43 } }); // hat right (DirectInput POV axis)
  b = assign(b, 'castleFwd', { pad: { pad: 'Stick', axis: 9, value: 1 } }); // hat up-left reads +1
  const idle = [pad([false], [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2857]), pad([], [0.1], 'Throttle')];
  assert.deepEqual([...padActions(b, idle)], []); // a centred hat (~1.29) triggers nothing
  const busy = [pad([true], [0, 0, 0, 0, 0, 0, 0, 0, 0, -0.4286]), pad([], [0.7], 'Throttle')];
  assert.deepEqual([...padActions(b, busy)].sort(), ['castleRight', 'designate', 'tdcRight']);
  assert.deepEqual([...padActions(b, [pad([], [], 'Other')])], []); // bindings belong to one device
});

test('capture: a new button press binds at once', () => {
  const st = captureStart([pad([true, false])]); // button 0 already held: ignored
  assert.equal(captureStep(st, [pad([true, false])]), null);
  assert.deepEqual(captureStep(st, [pad([true, true])]), { pad: 'Stick', button: 1 });
});

test('capture: a joystick that appears mid-capture binds the button that woke it up', () => {
  const st = captureStart([]);
  assert.deepEqual(captureStep(st, [pad([false, false, true], [1.2857])]), { pad: 'Stick', button: 2 });
});

test('capture: an axis binds its direction once it returns to rest', () => {
  const st = captureStart([pad([], [0, 0])]);
  assert.equal(captureStep(st, [pad([], [0, -0.6])]), null);
  assert.equal(captureStep(st, [pad([], [0, -1])]), null);
  assert.deepEqual(captureStep(st, [pad([], [0, 0.05])]), { pad: 'Stick', axis: 1, value: -1 });
});

test('capture: a POV hat on one axis binds its exact position', () => {
  const st = captureStart([pad([], [1.2857])]);
  assert.equal(captureStep(st, [pad([], [-0.4286])]), null);
  assert.deepEqual(captureStep(st, [pad([], [1.2857])]), { pad: 'Stick', axis: 0, value: -0.43 });
});

test('stored bindings are validated; bad entries fall back to the defaults', () => {
  const b = parseBindings(JSON.stringify({ designate: { key: 'KeyQ', pad: { pad: 'Stick', button: 3 } }, tdcUp: { key: 5 } }));
  assert.equal(b.designate.key, 'KeyQ');
  assert.deepEqual(b.designate.pad, { pad: 'Stick', button: 3 });
  assert.equal(b.tdcUp.key, 'KeyW');
  assert.deepEqual(parseBindings('not json'), defaultBindings());
});

test('joystick labels are short', () => {
  assert.equal(padLabel({ pad: 'Joystick - HOTAS Warthog (Vendor: 044f Product: 0402)', button: 4 }), 'Joystick - HOTAS… B5');
  assert.equal(padLabel({ pad: 'Xbox', axis: 1, value: -1 }), 'Xbox A2−');
  assert.equal(padLabel({ pad: 'Xbox', axis: 9, value: -0.43 }), 'Xbox A10 −0.43');
});
