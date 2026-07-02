import test from 'node:test';
import assert from 'node:assert/strict';
import { createMessageHandler } from '../api/message.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

test('stores a valid message', async () => {
  const kv = createFakeKv();
  const handler = createMessageHandler(kv, () => 555);
  const res = createMockRes();
  await handler({ method: 'POST', body: { name: 'Alexis', message: 'Superbe travail' } }, res);
  assert.equal(res.statusCode, 200);
  const stored = await kv.lrange('messages', 0, -1);
  assert.deepEqual(stored, [{ name: 'Alexis', message: 'Superbe travail', ts: 555 }]);
});

test('defaults the name to Anonyme when missing', async () => {
  const kv = createFakeKv();
  const handler = createMessageHandler(kv, () => 1);
  await handler({ method: 'POST', body: { message: 'Salut' } }, createMockRes());
  const [stored] = await kv.lrange('messages', 0, -1);
  assert.equal(stored.name, 'Anonyme');
});

test('rejects an empty message', async () => {
  const kv = createFakeKv();
  const handler = createMessageHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', body: { message: '   ' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects non-POST methods', async () => {
  const kv = createFakeKv();
  const handler = createMessageHandler(kv);
  const res = createMockRes();
  await handler({ method: 'GET', body: {} }, res);
  assert.equal(res.statusCode, 405);
});
