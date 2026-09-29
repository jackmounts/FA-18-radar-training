import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barPrf, inBeam, inNotch, probability, r50 } from './detection.ts';

test('INTL alternates HI and MED by bar and flips each frame', () => {
  assert.equal(barPrf('INTL', 0, 0), 'HI');
  assert.equal(barPrf('INTL', 1, 0), 'MED');
  assert.equal(barPrf('INTL', 0, 1), 'MED');
  assert.equal(barPrf('MED', 0, 0), 'MED');
});

test('R50: HPRF long against closing targets, weak against non-closing; MPRF all-aspect', () => {
  assert.equal(r50('HI', 5, 300), 65);
  assert.equal(r50('HI', 5, -100), 16.25);
  assert.equal(r50('MED', 5, -100), 30);
  assert.equal(r50('HI', 80, 300), 130); // 16x RCS doubles range (fourth root)
});

test('Pd is 50% at R50 and falls off beyond it', () => {
  assert.equal(probability(30, 30), 0.5);
  assert.ok(probability(20, 30) > 0.9);
  assert.ok(probability(45, 30) < 0.1);
});

test('the notch rejects radial speeds under 90 kt', () => {
  assert.equal(inNotch(50), true);
  assert.equal(inNotch(-89), true);
  assert.equal(inNotch(120), false);
});

test('in-beam test uses half the 3.3 deg beamwidth on both axes', () => {
  assert.equal(inBeam(1.6, 0, { az: 0, el: 0 }), true);
  assert.equal(inBeam(1.7, 0, { az: 0, el: 0 }), false);
  assert.equal(inBeam(0, -1.7, { az: 0, el: 0 }), false);
});
