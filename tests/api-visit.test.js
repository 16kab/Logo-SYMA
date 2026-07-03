import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisitHandler } from '../api/visit.js';
import { VISITS_KEY } from '../api/_lib/visitAnalytics.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

test('records a public visit start event', async () => {
  const kv = createFakeKv();
  const handler = createVisitHandler(kv, () => 12345);
  const res = createMockRes();

  await handler({ method: 'POST', body: { visitId: 'visit-1', event: 'start' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: 'recorded' });
  assert.deepEqual(await kv.hgetall(VISITS_KEY), {
    'visit-1': {
      visitId: 'visit-1',
      startedAt: 12345,
      lastSeenAt: 12345,
      durationMs: 0,
      pageViews: 1,
    },
  });
});

test('records a heartbeat event for an existing visit', async () => {
  const kv = createFakeKv();
  const handler = createVisitHandler(kv, () => 1000);
  await handler({ method: 'POST', body: { visitId: 'visit-1', event: 'start' } }, createMockRes());

  const heartbeatHandler = createVisitHandler(kv, () => 31000);
  const res = createMockRes();
  await heartbeatHandler({ method: 'POST', body: { visitId: 'visit-1', event: 'heartbeat' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual((await kv.hgetall(VISITS_KEY))['visit-1'], {
    visitId: 'visit-1',
    startedAt: 1000,
    lastSeenAt: 31000,
    durationMs: 30000,
    pageViews: 1,
  });
});

test('rejects invalid visit payloads', async () => {
  const kv = createFakeKv();
  const handler = createVisitHandler(kv);

  for (const body of [
    { visitId: '', event: 'start' },
    { visitId: 'visit-1', event: 'close' },
    { event: 'start' },
  ]) {
    const res = createMockRes();
    await handler({ method: 'POST', body }, res);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'Invalid visit payload' });
  }
});

test('rejects non-POST methods', async () => {
  const kv = createFakeKv();
  const handler = createVisitHandler(kv);
  const res = createMockRes();

  await handler({ method: 'GET', body: {} }, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'Method not allowed' });
});
