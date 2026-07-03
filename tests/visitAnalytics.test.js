import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VISITS_KEY,
  computeVisitAnalytics,
  isValidVisitPayload,
  recordVisitEvent,
} from '../api/_lib/visitAnalytics.js';
import { createFakeKv } from './helpers/fakeKv.js';

test('validates anonymous visit payloads', () => {
  assert.equal(isValidVisitPayload({ visitId: 'visit-1', event: 'start' }), true);
  assert.equal(isValidVisitPayload({ visitId: 'visit-1', event: 'heartbeat' }), true);
  assert.equal(isValidVisitPayload({ visitId: '', event: 'start' }), false);
  assert.equal(isValidVisitPayload({ visitId: 'visit-1', event: 'leave' }), false);
  assert.equal(isValidVisitPayload({ event: 'start' }), false);
});

test('records a new visit start', async () => {
  const kv = createFakeKv();

  const record = await recordVisitEvent(kv, { visitId: 'visit-1', event: 'start' }, () => 1000);

  assert.deepEqual(record, {
    visitId: 'visit-1',
    startedAt: 1000,
    lastSeenAt: 1000,
    durationMs: 0,
    pageViews: 1,
  });
  assert.deepEqual(await kv.hgetall(VISITS_KEY), {
    'visit-1': record,
  });
});

test('updates an existing visit on heartbeat without adding a page view', async () => {
  const kv = createFakeKv();
  await recordVisitEvent(kv, { visitId: 'visit-1', event: 'start' }, () => 1000);

  const record = await recordVisitEvent(kv, { visitId: 'visit-1', event: 'heartbeat' }, () => 46000);

  assert.deepEqual(record, {
    visitId: 'visit-1',
    startedAt: 1000,
    lastSeenAt: 46000,
    durationMs: 45000,
    pageViews: 1,
  });
});

test('increments page views when a known session starts again', async () => {
  const kv = createFakeKv();
  await recordVisitEvent(kv, { visitId: 'visit-1', event: 'start' }, () => 1000);

  const record = await recordVisitEvent(kv, { visitId: 'visit-1', event: 'start' }, () => 61000);

  assert.deepEqual(record, {
    visitId: 'visit-1',
    startedAt: 1000,
    lastSeenAt: 61000,
    durationMs: 60000,
    pageViews: 2,
  });
});

test('summarizes visits by UTC day, active sessions, and recent activity', () => {
  const now = Date.UTC(2026, 6, 3, 12, 2, 0);
  const entries = [
    ['visit-1', {
      visitId: 'visit-1',
      startedAt: Date.UTC(2026, 6, 2, 23, 55, 0),
      lastSeenAt: Date.UTC(2026, 6, 2, 23, 55, 5),
      durationMs: 5000,
      pageViews: 1,
    }],
    ['visit-2', {
      visitId: 'visit-2',
      startedAt: Date.UTC(2026, 6, 3, 12, 0, 0),
      lastSeenAt: Date.UTC(2026, 6, 3, 12, 1, 0),
      durationMs: 60000,
      pageViews: 1,
    }],
    ['visit-3', {
      visitId: 'visit-3',
      startedAt: Date.UTC(2026, 6, 3, 12, 1, 0),
      lastSeenAt: Date.UTC(2026, 6, 3, 12, 1, 45),
      durationMs: 45000,
      pageViews: 2,
    }],
  ];

  const analytics = computeVisitAnalytics(entries, () => now);

  assert.deepEqual(analytics.summary, {
    totalVisits: 3,
    averageDurationMs: 36667,
    activeNow: 2,
  });
  assert.deepEqual(analytics.daily, [
    { date: '2026-07-02', visits: 1, averageDurationMs: 5000 },
    { date: '2026-07-03', visits: 2, averageDurationMs: 52500 },
  ]);
  assert.deepEqual(analytics.recent.map((visit) => visit.visitId), ['visit-3', 'visit-2', 'visit-1']);
});
