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
    headingWeight: 700,
    bodyFont: 'Quicksand',
    bodyWeight: 400,
    decorationFont: null,
    decorationWeight: 600,
  });
});

test('applyTypographySelection stores a validated global typography selection', async () => {
  const kv = createFakeKv();
  const selection = await applyTypographySelection(kv, {
    headingFont: 'Syne',
    headingWeight: 600,
    bodyFont: 'Manrope',
    bodyWeight: 500,
    decorationFont: 'Grandstander',
    decorationWeight: 700,
  }, () => 123);

  assert.equal(TYPOGRAPHY_KEY, 'typography');
  assert.equal(TYPOGRAPHY_FIELD, 'selection');
  assert.deepEqual(selection, {
    headingFont: 'Syne',
    headingWeight: 600,
    bodyFont: 'Manrope',
    bodyWeight: 500,
    decorationFont: 'Grandstander',
    decorationWeight: 700,
    updatedAt: 123,
  });
  assert.deepEqual(await kv.hget(TYPOGRAPHY_KEY, TYPOGRAPHY_FIELD), selection);
});

test('applyTypographySelection accepts no decoration and rejects unknown fonts', async () => {
  const kv = createFakeKv();

  assert.deepEqual(await applyTypographySelection(kv, {
    headingFont: 'Fredoka',
    headingWeight: 700,
    bodyFont: 'Inter',
    bodyWeight: 400,
    decorationFont: null,
    decorationWeight: 600,
  }, () => 456), {
    headingFont: 'Fredoka',
    headingWeight: 700,
    bodyFont: 'Inter',
    bodyWeight: 400,
    decorationFont: null,
    decorationWeight: 600,
    updatedAt: 456,
  });
  assert.equal(await applyTypographySelection(kv, {
    headingFont: 'Comic Sans MS',
    headingWeight: 700,
    bodyFont: 'Inter',
    bodyWeight: 400,
    decorationFont: null,
    decorationWeight: 600,
  }), null);
  assert.equal(await applyTypographySelection(kv, {
    headingFont: 'Fredoka',
    headingWeight: 300,
    bodyFont: 'Inter',
    bodyWeight: 400,
    decorationFont: null,
    decorationWeight: 600,
  }), null);
  assert.equal(await applyTypographySelection(kv, {
    headingFont: 'Fredoka',
    headingWeight: 700,
    bodyFont: 'Inter',
    bodyWeight: 400,
    decorationFont: 'Papyrus',
    decorationWeight: 600,
  }), null);
});
