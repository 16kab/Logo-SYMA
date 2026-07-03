import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisitsHandler } from '../api/visits.js';
import { recordVisitEvent } from '../api/_lib/visitAnalytics.js';
import { computeAdminToken } from '../api/_lib/adminAuth.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

async function seedVisit(kv, visitId, startTime, heartbeatTime = startTime) {
  await recordVisitEvent(kv, { visitId, event: 'start' }, () => startTime);
  if (heartbeatTime !== startTime) {
    await recordVisitEvent(kv, { visitId, event: 'heartbeat' }, () => heartbeatTime);
  }
}

test('returns anonymous visit analytics for a valid admin token', async () => {
  const kv = createFakeKv();
  await seedVisit(kv, 'visit-1', Date.UTC(2026, 6, 3, 10, 0, 0), Date.UTC(2026, 6, 3, 10, 0, 30));
  await seedVisit(kv, 'visit-2', Date.UTC(2026, 6, 3, 10, 1, 0), Date.UTC(2026, 6, 3, 10, 2, 0));
  const handler = createVisitsHandler(kv, () => 'secret', () => Date.UTC(2026, 6, 3, 10, 2, 30));
  const res = createMockRes();
  const token = computeAdminToken('secret');

  await handler({ method: 'GET', headers: { authorization: `Bearer ${token}` } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.summary, {
    totalVisits: 2,
    averageDurationMs: 45000,
    activeNow: 2,
  });
  assert.deepEqual(res.body.daily, [
    { date: '2026-07-03', visits: 2, averageDurationMs: 45000 },
  ]);
  assert.deepEqual(res.body.recent.map((visit) => visit.visitId), ['visit-2', 'visit-1']);
});

test('requires a valid admin token', async () => {
  const kv = createFakeKv();
  const handler = createVisitsHandler(kv, () => 'secret');

  for (const headers of [{}, { authorization: 'Bearer stale-token' }]) {
    const res = createMockRes();
    await handler({ method: 'GET', headers }, res);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: 'Unauthorized' });
  }
});

test('returns empty analytics when no visits exist', async () => {
  const kv = createFakeKv();
  const handler = createVisitsHandler(kv, () => 'secret', () => Date.UTC(2026, 6, 3));
  const res = createMockRes();
  const token = computeAdminToken('secret');

  await handler({ method: 'GET', headers: { authorization: `Bearer ${token}` } }, res);

  assert.deepEqual(res.body, {
    summary: { totalVisits: 0, averageDurationMs: 0, activeNow: 0 },
    daily: [],
    recent: [],
  });
});

test('rejects non-GET methods', async () => {
  const kv = createFakeKv();
  const handler = createVisitsHandler(kv);
  const res = createMockRes();

  await handler({ method: 'POST', headers: {} }, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'Method not allowed' });
});
