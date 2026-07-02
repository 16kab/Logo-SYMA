import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidLogoId, isValidVoteValue, sanitizeName, sanitizeMessage } from '../api/_lib/validate.js';

test('isValidLogoId accepts known ids and rejects others', () => {
  assert.equal(isValidLogoId('logo1'), true);
  assert.equal(isValidLogoId('logo5'), true);
  assert.equal(isValidLogoId('logo6'), false);
  assert.equal(isValidLogoId(''), false);
});

test('isValidVoteValue accepts only up or down', () => {
  assert.equal(isValidVoteValue('up'), true);
  assert.equal(isValidVoteValue('down'), true);
  assert.equal(isValidVoteValue('maybe'), false);
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
