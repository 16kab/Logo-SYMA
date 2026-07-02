import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoteHandler } from '../api/vote.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

test('records a new vote', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv, () => 12345);
  const res = createMockRes();
  await handler({ method: 'POST', body: { logoId: 'logo1', visitorId: 'v1', name: 'Alexis', value: 'up' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: 'saved', value: 'up' });
  const stored = await kv.hgetall('vote:logo1');
  assert.deepEqual(stored, { v1: { name: 'Alexis', value: 'up', ts: 12345 } });
});

test('toggles off a vote when clicking the same value again', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv, () => 12345);
  await handler({ method: 'POST', body: { logoId: 'logo1', visitorId: 'v1', name: 'Alexis', value: 'up' } }, createMockRes());
  const res2 = createMockRes();
  await handler({ method: 'POST', body: { logoId: 'logo1', visitorId: 'v1', name: 'Alexis', value: 'up' } }, res2);
  assert.deepEqual(res2.body, { status: 'removed' });
  assert.equal(await kv.hgetall('vote:logo1'), null);
});

test('changes an existing vote to the opposite value', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv, () => 999);
  await handler({ method: 'POST', body: { logoId: 'logo1', visitorId: 'v1', name: 'Alexis', value: 'up' } }, createMockRes());
  const res = createMockRes();
  await handler({ method: 'POST', body: { logoId: 'logo1', visitorId: 'v1', name: 'Alexis', value: 'down' } }, res);
  assert.deepEqual(res.body, { status: 'saved', value: 'down' });
});

test('rejects an invalid logoId', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', body: { logoId: 'logo9', visitorId: 'v1', value: 'up' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects an invalid vote value', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', body: { logoId: 'logo1', visitorId: 'v1', value: 'maybe' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects a missing visitorId', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', body: { logoId: 'logo1', value: 'up' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects non-POST methods', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv);
  const res = createMockRes();
  await handler({ method: 'GET', body: {} }, res);
  assert.equal(res.statusCode, 405);
});
