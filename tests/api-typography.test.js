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
      bodyFont: 'Quicksand',
      decorationFont: null,
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
      bodyFont: 'Nunito Sans',
      decorationFont: 'Darumadrop One',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: 'saved',
    typography: {
      headingFont: 'Bagel Fat One',
      bodyFont: 'Nunito Sans',
      decorationFont: 'Darumadrop One',
      updatedAt: 123,
    },
  });
});

test('POST rejects invalid typography selections', async () => {
  const handler = createTypographyHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'POST', body: { headingFont: 'Outfit', bodyFont: 'Unknown', decorationFont: null } }, res);

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
