import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFinalChoicePalette,
  createBlankFinalChoiceDraft,
  createDraftFromFinalChoice,
  getFinalChoicePayload,
  isCompleteFinalChoiceDraft,
} from '../js/final-choice-state.js';

test('creates a blank final choice draft with reused name only', () => {
  assert.deepEqual(createBlankFinalChoiceDraft('Alexis'), {
    logoId: null,
    paletteKey: null,
    bgColor: null,
    logoColor: null,
    name: 'Alexis',
  });
});

test('creates a prefilled draft from an existing final choice', () => {
  const draft = createDraftFromFinalChoice({
    logoId: 'logo2',
    paletteKey: 'palette1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    name: 'Camille',
  }, 'Alexis');

  assert.equal(draft.logoId, 'logo2');
  assert.equal(draft.name, 'Camille');
});

test('palette selection resets colors until the user chooses them', () => {
  const draft = applyFinalChoicePalette(createBlankFinalChoiceDraft('Alexis'), 'palette1');

  assert.equal(draft.paletteKey, 'palette1');
  assert.equal(draft.bgColor, null);
  assert.equal(draft.logoColor, null);
});

test('complete drafts require logo, palette, and both selected colors', () => {
  assert.equal(isCompleteFinalChoiceDraft({
    logoId: 'logo1',
    paletteKey: 'palette1',
    bgColor: '#18233f',
    logoColor: null,
    name: 'Alexis',
  }), false);
  assert.equal(isCompleteFinalChoiceDraft({
    logoId: 'logo1',
    paletteKey: 'palette1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    name: 'Alexis',
  }), true);
});

test('payload trims the visible name field', () => {
  const payload = getFinalChoicePayload({
    logoId: 'logo1',
    paletteKey: 'palette1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    name: '  Alexis  ',
  });

  assert.deepEqual(payload, {
    logoId: 'logo1',
    paletteKey: 'palette1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    name: 'Alexis',
  });
});
