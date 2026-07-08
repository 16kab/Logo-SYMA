import test from 'node:test';
import assert from 'node:assert/strict';
import { createIconographyHandler } from '../api/iconography.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

test('GET returns the empty global iconography state', async () => {
  const handler = createIconographyHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'GET', body: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { iconography: { items: {}, requests: [] } });
});

test('POST applies an iconography action and returns the new global state', async () => {
  const handler = createIconographyHandler(createFakeKv(), () => 123);
  const res = createMockRes();

  await handler({ method: 'POST', body: { action: 'approve', itemId: 'blobs' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: 'saved',
    iconography: {
      items: { blobs: { status: 'approved', feedback: '', updatedAt: 123 } },
      requests: [],
    },
  });
});

test('POST rejects invalid iconography actions', async () => {
  const handler = createIconographyHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'POST', body: { action: 'reject', itemId: 'blobs', feedback: '   ' } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid iconography payload' });
});

test('iconography handler rejects unsupported methods', async () => {
  const handler = createIconographyHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'DELETE', body: {} }, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'Method not allowed' });
});
