import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidLogoId,
  isValidPaletteKey,
  isValidRanking,
  isValidVoteValue,
  sanitizeName,
  sanitizeMessage,
} from '../api/_lib/validate.js';

test('isValidLogoId accepts known ids and rejects others', () => {
  assert.equal(isValidLogoId('logo1'), true);
  assert.equal(isValidLogoId('logo5'), true);
  assert.equal(isValidLogoId('logo6'), true);
  assert.equal(isValidLogoId('logo7'), false);
  assert.equal(isValidLogoId(''), false);
});

test('isValidVoteValue accepts only up or down', () => {
  assert.equal(isValidVoteValue('up'), true);
  assert.equal(isValidVoteValue('down'), true);
  assert.equal(isValidVoteValue('maybe'), false);
});

test('isValidPaletteKey accepts known palette keys only', () => {
  assert.equal(isValidPaletteKey('palette1'), true);
  assert.equal(isValidPaletteKey('palette2'), true);
  assert.equal(isValidPaletteKey('palette3'), false);
  assert.equal(isValidPaletteKey(''), false);
});

test('isValidRanking accepts a complete one-to-six logo ranking', () => {
  assert.equal(isValidRanking({
    logo1: 1,
    logo2: 2,
    logo3: 3,
    logo4: 4,
    logo5: 5,
    logo6: 6,
  }), true);
});

test('isValidRanking rejects missing logos, duplicate ranks, and invalid ranks', () => {
  assert.equal(isValidRanking({ logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5 }), false);
  assert.equal(isValidRanking({ logo1: 1, logo2: 1, logo3: 3, logo4: 4, logo5: 5, logo6: 6 }), false);
  assert.equal(isValidRanking({ logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5, logo6: 7 }), false);
  assert.equal(isValidRanking({ logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5, fake: 6 }), false);
});

test('sanitizeName trims whitespace and defaults to Anonyme', () => {
  assert.equal(sanitizeName('  Alexis  '), 'Alexis');
  assert.equal(sanitizeName(''), 'Anonyme');
  assert.equal(sanitizeName(undefined), 'Anonyme');
});

test('sanitizeName truncates overly long names', () => {
  const longName = 'a'.repeat(100);
  assert.equal(sanitizeName(longName).length, 60);
});

test('sanitizeMessage returns null for empty input', () => {
  assert.equal(sanitizeMessage('   '), null);
  assert.equal(sanitizeMessage(undefined), null);
});

test('sanitizeMessage trims and truncates', () => {
  assert.equal(sanitizeMessage('  hello  '), 'hello');
  const longMessage = 'a'.repeat(2100);
  assert.equal(sanitizeMessage(longMessage).length, 2000);
});
