import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINAL_CHOICE_FIELD,
  FINAL_CHOICE_KEY,
  isValidFinalChoicePayload,
  normalizeFinalChoicePayload,
  readFinalChoice,
  writeFinalChoice,
} from '../api/_lib/finalChoice.js';
import { createFakeKv } from './helpers/fakeKv.js';

const validPayload = {
  logoId: 'logo1',
  paletteKey: 'palette1',
  bgColor: '#18233f',
  logoColor: '#ffffff',
  name: '  Alexis  ',
};

test('validates a complete final choice payload', () => {
  assert.equal(isValidFinalChoicePayload(validPayload), true);
});

test('rejects unknown logo, palette, and colors outside selected palette', () => {
  assert.equal(isValidFinalChoicePayload({ ...validPayload, logoId: 'logo9' }), false);
  assert.equal(isValidFinalChoicePayload({ ...validPayload, paletteKey: 'palette9' }), false);
  assert.equal(isValidFinalChoicePayload({ ...validPayload, bgColor: '#ff00ff' }), false);
  assert.equal(isValidFinalChoicePayload({ ...validPayload, logoColor: '#ff00ff' }), false);
});

test('normalizes name and adds updatedAt', () => {
  assert.deepEqual(normalizeFinalChoicePayload(validPayload, () => 12345), {
    logoId: 'logo1',
    paletteKey: 'palette1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    name: 'Alexis',
    updatedAt: 12345,
  });
});

test('empty final choice name becomes Anonyme', () => {
  const normalized = normalizeFinalChoicePayload({ ...validPayload, name: '   ' }, () => 12345);
  assert.equal(normalized.name, 'Anonyme');
});

test('writeFinalChoice stores one current global record', async () => {
  const kv = createFakeKv();
  const record = await writeFinalChoice(kv, validPayload, () => 987);

  assert.equal(FINAL_CHOICE_KEY, 'finalChoice');
  assert.equal(FINAL_CHOICE_FIELD, 'current');
  assert.deepEqual(record, {
    logoId: 'logo1',
    paletteKey: 'palette1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    name: 'Alexis',
    updatedAt: 987,
  });
  assert.deepEqual(await kv.hget(FINAL_CHOICE_KEY, FINAL_CHOICE_FIELD), record);
});

test('writeFinalChoice rejects invalid payload without storing', async () => {
  const kv = createFakeKv();
  const record = await writeFinalChoice(kv, { ...validPayload, logoId: 'bad' }, () => 987);

  assert.equal(record, null);
  assert.equal(await readFinalChoice(kv), null);
});
