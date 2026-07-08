import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TYPOGRAPHY_FIELD,
  TYPOGRAPHY_KEY,
  applyTypographySelection,
  readTypography,
} from '../api/_lib/typography.js';
import { createFakeKv } from './helpers/fakeKv.js';

test('readTypography returns the default global typography selection', async () => {
  const kv = createFakeKv();

  assert.deepEqual(await readTypography(kv), {
    headingFont: 'Outfit',
    bodyFont: 'Quicksand',
    decorationFont: null,
  });
});

test('applyTypographySelection stores a validated global typography selection', async () => {
  const kv = createFakeKv();
  const selection = await applyTypographySelection(kv, {
    headingFont: 'Syne',
    bodyFont: 'Manrope',
    decorationFont: 'Grandstander',
  }, () => 123);

  assert.equal(TYPOGRAPHY_KEY, 'typography');
  assert.equal(TYPOGRAPHY_FIELD, 'selection');
  assert.deepEqual(selection, {
    headingFont: 'Syne',
    bodyFont: 'Manrope',
    decorationFont: 'Grandstander',
    updatedAt: 123,
  });
  assert.deepEqual(await kv.hget(TYPOGRAPHY_KEY, TYPOGRAPHY_FIELD), selection);
});

test('applyTypographySelection accepts no decoration and rejects unknown fonts', async () => {
  const kv = createFakeKv();

  assert.deepEqual(await applyTypographySelection(kv, {
    headingFont: 'Fredoka',
    bodyFont: 'Inter',
    decorationFont: null,
  }, () => 456), {
    headingFont: 'Fredoka',
    bodyFont: 'Inter',
    decorationFont: null,
    updatedAt: 456,
  });
  assert.equal(await applyTypographySelection(kv, {
    headingFont: 'Comic Sans MS',
    bodyFont: 'Inter',
    decorationFont: null,
  }), null);
  assert.equal(await applyTypographySelection(kv, {
    headingFont: 'Fredoka',
    bodyFont: 'Inter',
    decorationFont: 'Papyrus',
  }), null);
});
