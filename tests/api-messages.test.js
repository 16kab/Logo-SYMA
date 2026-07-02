import test from 'node:test';
import assert from 'node:assert/strict';
import { createMessagesHandler } from '../api/messages.js';
import { createMessageHandler } from '../api/message.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';
import { computeAdminToken } from '../api/_lib/adminAuth.js';

test('rejects requests without a valid admin token', async () => {
  const kv = createFakeKv();
  const handler = createMessagesHandler(kv, () => 'secret');
  const res = createMockRes();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 401);
});

test('returns messages most-recent-first for an authorized admin', async () => {
  const kv = createFakeKv();
  const addMessage = createMessageHandler(kv, () => 1);
  await addMessage({ method: 'POST', body: { name: 'Alexis', message: 'first' } }, createMockRes());
  await addMessage({ method: 'POST', body: { name: 'Camille', message: 'second' } }, createMockRes());

  const handler = createMessagesHandler(kv, () => 'secret');
  const res = createMockRes();
  const token = computeAdminToken('secret');
  await handler({ method: 'GET', headers: { authorization: `Bearer ${token}` } }, res);

  assert.deepEqual(res.body.map((m) => m.message), ['second', 'first']);
});

test('rejects non-GET methods', async () => {
  const kv = createFakeKv();
  const handler = createMessagesHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});
