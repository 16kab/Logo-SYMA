import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTES, PALETTE_KEYS } from '../js/palettes.js';

test('exposes exactly two palettes', () => {
  assert.deepEqual(PALETTE_KEYS, ['palette1', 'palette2']);
});

test('palette1 has the 7 expected colors', () => {
  assert.deepEqual(PALETTES.palette1.colors, [
    '#18233f', '#788ce3', '#92bad4', '#f7f3e7', '#e0f479', '#000000', '#ffffff',
  ]);
});

test('palette2 has the 7 expected colors', () => {
  assert.deepEqual(PALETTES.palette2.colors, [
    '#f35b43', '#610023', '#9f9536', '#f7c6dc', '#f7eee5', '#000000', '#ffffff',
  ]);
});

test('every palette includes black and white', () => {
  for (const key of PALETTE_KEYS) {
    assert.ok(PALETTES[key].colors.includes('#000000'));
    assert.ok(PALETTES[key].colors.includes('#ffffff'));
  }
});
