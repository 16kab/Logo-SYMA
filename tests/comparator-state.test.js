import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState,
  withPaletteChange,
  withLogoChange,
  withBgColor,
  withLogoColor,
} from '../js/comparator-state.js';

test('initialState defaults to palette1 first color for bg and logo', () => {
  const state = initialState();
  assert.equal(state.paletteKey, 'palette1');
  assert.equal(state.bgColor, '#18233f');
  assert.equal(state.logoColor, '#18233f');
});

test('initialState accepts a custom palette and logo', () => {
  const state = initialState('palette2', 'logo3');
  assert.equal(state.logoId, 'logo3');
  assert.equal(state.bgColor, '#f35b43');
});

test('withPaletteChange resets background to first color and logo to second color', () => {
  const state = { logoId: 'logo2', paletteKey: 'palette1', bgColor: '#e0f479', logoColor: '#ffffff' };
  const next = withPaletteChange(state, 'palette2');
  assert.equal(next.paletteKey, 'palette2');
  assert.equal(next.bgColor, '#f35b43');
  assert.equal(next.logoColor, '#610023');
  assert.equal(next.logoId, 'logo2');
});

test('withPaletteChange does not mutate the input state', () => {
  const state = initialState();
  withPaletteChange(state, 'palette2');
  assert.equal(state.paletteKey, 'palette1');
});

test('withLogoChange only changes logoId', () => {
  const state = initialState();
  const next = withLogoChange(state, 'logo5');
  assert.equal(next.logoId, 'logo5');
  assert.equal(next.bgColor, state.bgColor);
});

test('withBgColor and withLogoColor update independently', () => {
  const state = initialState();
  const withBg = withBgColor(state, '#ffffff');
  assert.equal(withBg.bgColor, '#ffffff');
  assert.equal(withBg.logoColor, state.logoColor);

  const withLogo = withLogoColor(state, '#000000');
  assert.equal(withLogo.logoColor, '#000000');
  assert.equal(withLogo.bgColor, state.bgColor);
});
