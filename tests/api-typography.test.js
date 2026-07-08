import test from 'node:test';
import assert from 'node:assert/strict';
import { createTypographyHandler } from '../api/typography.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

test('GET returns the global typography selection', async () => {
  const handler = createTypographyHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'GET', body: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    typography: {
      headingFont: 'Outfit',
      headingWeight: 700,
      bodyFont: 'Quicksand',
      bodyWeight: 400,
      decorationFont: null,
      decorationWeight: 600,
    },
  });
});

test('POST saves and returns the global typography selection', async () => {
  const handler = createTypographyHandler(createFakeKv(), () => 123);
  const res = createMockRes();

  await handler({
    method: 'POST',
    body: {
      headingFont: 'Bagel Fat One',
      headingWeight: 700,
      bodyFont: 'Nunito Sans',
      bodyWeight: 500,
      decorationFont: 'Darumadrop One',
      decorationWeight: 400,
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: 'saved',
    typography: {
      headingFont: 'Bagel Fat One',
      headingWeight: 700,
      bodyFont: 'Nunito Sans',
      bodyWeight: 500,
      decorationFont: 'Darumadrop One',
      decorationWeight: 400,
      updatedAt: 123,
    },
  });
});

test('POST rejects invalid typography selections', async () => {
  const handler = createTypographyHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'POST', body: {
    headingFont: 'Outfit',
    headingWeight: 700,
    bodyFont: 'Unknown',
    bodyWeight: 400,
    decorationFont: null,
    decorationWeight: 600,
  } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid typography payload' });
});

test('typography handler rejects unsupported methods', async () => {
  const handler = createTypographyHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'DELETE', body: {} }, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'Method not allowed' });
});
