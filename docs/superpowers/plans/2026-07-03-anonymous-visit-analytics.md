# Anonymous Visit Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add anonymous public-site visit analytics to the admin dashboard, including visit counts, estimated duration, active sessions, and a daily graph.

**Architecture:** Store one anonymous visit session per browser session in the existing KV hash storage under `visits`. A public tracker posts `start` and `heartbeat` events to `/api/visit`; an admin-only `/api/visits` endpoint aggregates the stored sessions for the dashboard. The admin UI uses small native DOM helpers and CSS bars rather than adding a chart dependency.

**Tech Stack:** Static HTML/CSS, browser ES modules, Node/Vercel-style serverless API handlers, Redis-backed KV adapter, `node:test`.

---

## File Structure

- Create `api/_lib/visitAnalytics.js`: pure visit validation, recording, and aggregation helpers.
- Create `api/visit.js`: public `POST /api/visit` endpoint.
- Create `api/visits.js`: admin-protected `GET /api/visits` endpoint.
- Modify `dev-server.js`: register the two new local API routes.
- Create `js/visit-tracker.js`: browser-side anonymous session tracker.
- Modify `js/main.js`: start tracking when the public page initializes.
- Create `js/admin-visits.js`: render the visit analytics admin card and format durations.
- Modify `js/admin.js`: fetch visits alongside votes and render the new card.
- Modify `css/admin.css`: style the visit metrics and chart in the existing dark admin direction.
- Create tests:
  - `tests/visitAnalytics.test.js`
  - `tests/api-visit.test.js`
  - `tests/api-visits.test.js`
  - `tests/visit-tracker.test.js`
  - `tests/main-tracker.test.js`
  - `tests/admin-visits.test.js`
  - extend `tests/admin-render.test.js`
  - extend `tests/admin-css.test.js`

## UI/UX Notes From ui-ux-pro-max

The plan uses the Node fallback for UI guidance:

```powershell
node "$HOME\.codex\skills\ui-ux-pro-max\scripts\search-node.mjs" "admin analytics dashboard dark chart" --design-system -p "SYMA Admin"
node "$HOME\.codex\skills\ui-ux-pro-max\scripts\search-node.mjs" "analytics chart accessibility dashboard" --domain chart -n 3
node "$HOME\.codex\skills\ui-ux-pro-max\scripts\search-node.mjs" "dashboard accessibility responsive" --stack html-tailwind
```

Apply these results by keeping the admin theme dark, high-contrast, compact, and accessible. The chart must have visible labels, an `aria-label`, no emoji icons, no layout-shifting hover behavior, and reduced-motion-safe CSS.

---

### Task 1: Visit Analytics Core

**Files:**
- Create: `api/_lib/visitAnalytics.js`
- Create: `tests/visitAnalytics.test.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/visitAnalytics.test.js`:

```javascript
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
```

- [ ] **Step 2: Run the core tests to verify they fail**

Run:

```powershell
node --test tests/visitAnalytics.test.js
```

Expected: FAIL with an import error because `api/_lib/visitAnalytics.js` does not exist.

- [ ] **Step 3: Create the visit analytics helper**

Create `api/_lib/visitAnalytics.js`:

```javascript
export const VISITS_KEY = 'visits';
export const ACTIVE_WINDOW_MS = 2 * 60 * 1000;
export const MAX_RECENT_VISITS = 20;

const VALID_EVENTS = new Set(['start', 'heartbeat']);

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function toNonNegativeInteger(value, fallback = 0) {
  return isFiniteNumber(value) && value >= 0 ? Math.round(value) : fallback;
}

function sanitizeStoredVisit(field, value) {
  const now = toNonNegativeInteger(value?.lastSeenAt, 0);
  const startedAt = toNonNegativeInteger(value?.startedAt, now);
  return {
    visitId: typeof value?.visitId === 'string' && value.visitId ? value.visitId : field,
    startedAt,
    lastSeenAt: now,
    durationMs: toNonNegativeInteger(value?.durationMs, Math.max(0, now - startedAt)),
    pageViews: toNonNegativeInteger(value?.pageViews, 0),
  };
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function isValidVisitPayload(body) {
  return (
    typeof body?.visitId === 'string'
    && body.visitId.trim().length > 0
    && body.visitId.length <= 120
    && VALID_EVENTS.has(body.event)
  );
}

export async function recordVisitEvent(kv, { visitId, event }, now = () => Date.now()) {
  const timestamp = now();
  const visits = (await kv.hgetall(VISITS_KEY)) || {};
  const existing = visits[visitId];
  const startedAt = isFiniteNumber(existing?.startedAt) ? existing.startedAt : timestamp;
  const currentPageViews = toNonNegativeInteger(existing?.pageViews, 0);
  const pageViews = currentPageViews + (event === 'start' ? 1 : 0);
  const record = {
    visitId,
    startedAt,
    lastSeenAt: timestamp,
    durationMs: Math.max(0, timestamp - startedAt),
    pageViews,
  };

  await kv.hset(VISITS_KEY, { [visitId]: record });
  return record;
}

export function computeVisitAnalytics(entries, now = () => Date.now()) {
  const timestamp = now();
  const visits = entries
    .map(([field, value]) => sanitizeStoredVisit(field, value))
    .filter((visit) => visit.startedAt > 0 && visit.lastSeenAt > 0);

  const dailyMap = new Map();
  for (const visit of visits) {
    const date = new Date(visit.startedAt).toISOString().slice(0, 10);
    const day = dailyMap.get(date) || { date, visits: 0, durations: [] };
    day.visits += 1;
    day.durations.push(visit.durationMs);
    dailyMap.set(date, day);
  }

  const daily = [...dailyMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      date: day.date,
      visits: day.visits,
      averageDurationMs: average(day.durations),
    }));

  const recent = [...visits]
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
    .slice(0, MAX_RECENT_VISITS);

  return {
    summary: {
      totalVisits: visits.length,
      averageDurationMs: average(visits.map((visit) => visit.durationMs)),
      activeNow: visits.filter((visit) => timestamp - visit.lastSeenAt <= ACTIVE_WINDOW_MS).length,
    },
    daily,
    recent,
  };
}
```

- [ ] **Step 4: Run the core tests to verify they pass**

Run:

```powershell
node --test tests/visitAnalytics.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add api/_lib/visitAnalytics.js tests/visitAnalytics.test.js
git commit -m "feat: add visit analytics core"
```

---

### Task 2: Public Visit Recording Endpoint

**Files:**
- Create: `api/visit.js`
- Create: `tests/api-visit.test.js`

- [ ] **Step 1: Write the failing API tests**

Create `tests/api-visit.test.js`:

```javascript
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
```

- [ ] **Step 2: Run the endpoint tests to verify they fail**

Run:

```powershell
node --test tests/api-visit.test.js
```

Expected: FAIL with an import error because `api/visit.js` does not exist.

- [ ] **Step 3: Create the public endpoint**

Create `api/visit.js`:

```javascript
import { getKv } from './_lib/kv.js';
import { isValidVisitPayload, recordVisitEvent } from './_lib/visitAnalytics.js';

export function createVisitHandler(kv, now = () => Date.now()) {
  return async function visitHandler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    if (!isValidVisitPayload(req.body)) {
      res.status(400).json({ error: 'Invalid visit payload' });
      return;
    }

    await recordVisitEvent(kv, {
      visitId: req.body.visitId.trim(),
      event: req.body.event,
    }, now);

    res.status(200).json({ status: 'recorded' });
  };
}

export default createVisitHandler(getKv());
```

- [ ] **Step 4: Run the endpoint tests to verify they pass**

Run:

```powershell
node --test tests/api-visit.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add api/visit.js tests/api-visit.test.js
git commit -m "feat: record anonymous visits"
```

---

### Task 3: Admin Visits Endpoint And Local Route

**Files:**
- Create: `api/visits.js`
- Create: `tests/api-visits.test.js`
- Modify: `dev-server.js`

- [ ] **Step 1: Write the failing admin endpoint tests**

Create `tests/api-visits.test.js`:

```javascript
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
```

- [ ] **Step 2: Run the admin endpoint tests to verify they fail**

Run:

```powershell
node --test tests/api-visits.test.js
```

Expected: FAIL with an import error because `api/visits.js` does not exist.

- [ ] **Step 3: Create the admin endpoint**

Create `api/visits.js`:

```javascript
import { getKv } from './_lib/kv.js';
import { extractBearerToken, isAuthorizedToken } from './_lib/adminAuth.js';
import { VISITS_KEY, computeVisitAnalytics } from './_lib/visitAnalytics.js';

export function createVisitsHandler(kv, getAdminPassword = () => process.env.ADMIN_PASSWORD, now = () => Date.now()) {
  return async function visitsHandler(req, res) {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const token = extractBearerToken(req.headers && req.headers.authorization);
    if (!isAuthorizedToken(token, getAdminPassword())) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const hash = (await kv.hgetall(VISITS_KEY)) || {};
    res.status(200).json(computeVisitAnalytics(Object.entries(hash), now));
  };
}

export default createVisitsHandler(getKv());
```

- [ ] **Step 4: Run the admin endpoint tests to verify they pass**

Run:

```powershell
node --test tests/api-visits.test.js
```

Expected: PASS.

- [ ] **Step 5: Wire routes into the local dev server**

Modify the imports at the top of `dev-server.js`:

```javascript
import { createVisitHandler } from './api/visit.js';
import { createVisitsHandler } from './api/visits.js';
```

Modify the `routes` object in `dev-server.js`:

```javascript
const routes = {
  '/api/vote': createVoteHandler(kv),
  '/api/votes': createVotesHandler(kv, getAdminPassword),
  '/api/visit': createVisitHandler(kv),
  '/api/visits': createVisitsHandler(kv, getAdminPassword),
  '/api/admin-login': createAdminLoginHandler(getAdminPassword),
};
```

- [ ] **Step 6: Run targeted tests and a syntax check**

Run:

```powershell
node --test tests/api-visits.test.js tests/api-visit.test.js tests/visitAnalytics.test.js
node --check dev-server.js
```

Expected: PASS and no syntax output from `node --check`.

- [ ] **Step 7: Commit**

Run:

```powershell
git add api/visits.js dev-server.js tests/api-visits.test.js
git commit -m "feat: expose admin visit analytics"
```

---

### Task 4: Browser Visit Tracker

**Files:**
- Create: `js/visit-tracker.js`
- Create: `tests/visit-tracker.test.js`
- Create: `tests/main-tracker.test.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write the failing tracker tests**

Create `tests/visit-tracker.test.js`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HEARTBEAT_INTERVAL_MS,
  VISIT_STORAGE_KEY,
  getOrCreateVisitId,
  sendVisitEvent,
  startVisitTracking,
} from '../js/visit-tracker.js';

function createStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
  };
}

function createEventTarget(initial = {}) {
  const listeners = {};
  return {
    ...initial,
    addEventListener(name, listener) {
      listeners[name] = listener;
    },
    dispatch(name) {
      listeners[name]?.();
    },
  };
}

test('getOrCreateVisitId creates and reuses a session id', () => {
  const storage = createStorage();

  const first = getOrCreateVisitId(storage, () => 'visit-1');
  const second = getOrCreateVisitId(storage, () => 'visit-2');

  assert.equal(first, 'visit-1');
  assert.equal(second, 'visit-1');
  assert.equal(storage.getItem(VISIT_STORAGE_KEY), 'visit-1');
});

test('sendVisitEvent posts an anonymous visit payload', async () => {
  const calls = [];
  const ok = await sendVisitEvent('visit-1', 'start', async (url, options) => {
    calls.push({ url, options });
    return { ok: true };
  });

  assert.equal(ok, true);
  assert.equal(calls[0].url, '/api/visit');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.keepalive, true);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    visitId: 'visit-1',
    event: 'start',
  });
});

test('startVisitTracking sends start and heartbeat events', () => {
  const events = [];
  let intervalCallback;
  const documentRef = createEventTarget({ visibilityState: 'visible' });
  const windowRef = createEventTarget();

  const tracker = startVisitTracking({
    storage: createStorage(),
    createId: () => 'visit-1',
    fetchFn: async (_url, options) => {
      events.push(JSON.parse(options.body).event);
      return { ok: true };
    },
    documentRef,
    windowRef,
    setIntervalFn(callback, ms) {
      intervalCallback = callback;
      assert.equal(ms, HEARTBEAT_INTERVAL_MS);
      return 7;
    },
  });

  intervalCallback();
  documentRef.visibilityState = 'hidden';
  documentRef.dispatch('visibilitychange');
  windowRef.dispatch('pagehide');

  assert.equal(tracker.visitId, 'visit-1');
  assert.deepEqual(events, ['start', 'heartbeat', 'heartbeat', 'heartbeat']);
});
```

Create `tests/main-tracker.test.js`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainSource = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

test('public main module imports and starts anonymous visit tracking', () => {
  assert.match(mainSource, /import\s+\{\s*startVisitTracking\s*\}\s+from\s+'\.\/visit-tracker\.js';/);
  assert.match(mainSource, /startVisitTracking\(\);/);
});
```

- [ ] **Step 2: Run the tracker tests to verify they fail**

Run:

```powershell
node --test tests/visit-tracker.test.js tests/main-tracker.test.js
```

Expected: FAIL because `js/visit-tracker.js` does not exist and `js/main.js` does not start tracking.

- [ ] **Step 3: Create the tracker module**

Create `js/visit-tracker.js`:

```javascript
export const VISIT_STORAGE_KEY = 'syma_visit_id';
export const HEARTBEAT_INTERVAL_MS = 30 * 1000;

export function createVisitId(cryptoRef = globalThis.crypto) {
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  return `visit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateVisitId(storage = globalThis.sessionStorage, createId = createVisitId) {
  const existing = storage.getItem(VISIT_STORAGE_KEY);
  if (existing) return existing;

  const visitId = createId();
  storage.setItem(VISIT_STORAGE_KEY, visitId);
  return visitId;
}

export async function sendVisitEvent(visitId, event, fetchFn = globalThis.fetch) {
  try {
    await fetchFn('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitId, event }),
      keepalive: true,
    });
    return true;
  } catch {
    return false;
  }
}

export function startVisitTracking({
  storage = globalThis.sessionStorage,
  createId = createVisitId,
  fetchFn = globalThis.fetch,
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  setIntervalFn = globalThis.setInterval,
} = {}) {
  if (!storage || !fetchFn) return { visitId: null, sendHeartbeat() {} };

  const visitId = getOrCreateVisitId(storage, createId);
  const send = (event) => {
    void sendVisitEvent(visitId, event, fetchFn);
  };
  const sendHeartbeat = () => send('heartbeat');

  send('start');
  setIntervalFn?.(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

  documentRef?.addEventListener?.('visibilitychange', () => {
    if (documentRef.visibilityState === 'hidden') sendHeartbeat();
  });
  windowRef?.addEventListener?.('pagehide', sendHeartbeat);

  return { visitId, sendHeartbeat };
}
```

- [ ] **Step 4: Start tracking from the public main module**

Modify `js/main.js`:

```javascript
import { createComparatorPanel } from './comparator-panel.js';
import { createVotesSection } from './votes-section.js';
import { activateDevTheme } from './dev-theme.js';
import { startVisitTracking } from './visit-tracker.js';

document.addEventListener('DOMContentLoaded', () => {
  startVisitTracking();
  activateDevTheme();

  createComparatorPanel(document.getElementById('panel-left'), {
    paletteKey: 'palette1',
    logoId: 'logo1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    label: 'A',
  });

  createComparatorPanel(document.getElementById('panel-right'), {
    paletteKey: 'palette1',
    logoId: 'logo2',
    bgColor: '#f7f3e7',
    logoColor: '#18233f',
    label: 'B',
  });

  createVotesSection({
    submissionRoot: document.getElementById('submission-bar-root'),
  });
});
```

- [ ] **Step 5: Run the tracker tests to verify they pass**

Run:

```powershell
node --test tests/visit-tracker.test.js tests/main-tracker.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```powershell
git add js/visit-tracker.js js/main.js tests/visit-tracker.test.js tests/main-tracker.test.js
git commit -m "feat: track anonymous public visits"
```

---

### Task 5: Admin Visit Card Rendering

**Files:**
- Create: `js/admin-visits.js`
- Create: `tests/admin-visits.test.js`
- Modify: `js/admin.js`
- Modify: `tests/admin-render.test.js`

- [ ] **Step 1: Write the failing visit card tests**

Create `tests/admin-visits.test.js`:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisitAnalyticsCard, formatDuration } from '../js/admin-visits.js';

function createFakeElement(tagName = 'div') {
  return {
    tagName,
    attributes: {},
    className: '',
    children: [],
    style: {},
    textContent: '',
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    querySelector(selector) {
      if (selector.startsWith('.')) {
        return findByClass(this, selector.slice(1))[0] || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector.startsWith('.')) {
        return findByClass(this, selector.slice(1));
      }
      return [];
    },
  };
}

function findByClass(element, className) {
  const matches = [];
  for (const child of element.children) {
    const classNames = String(child.className || '').split(/\s+/).filter(Boolean);
    if (classNames.includes(className)) matches.push(child);
    matches.push(...findByClass(child, className));
  }
  return matches;
}

function collectText(element) {
  return [element.textContent, ...element.children.map(collectText)].filter(Boolean).join(' ');
}

const fakeDocument = { createElement: createFakeElement };

test('formatDuration formats seconds and minutes', () => {
  assert.equal(formatDuration(0), '0 s');
  assert.equal(formatDuration(42000), '42 s');
  assert.equal(formatDuration(125000), '2 min 5 s');
});

test('createVisitAnalyticsCard renders metrics and a labelled chart', () => {
  const card = createVisitAnalyticsCard({
    summary: {
      totalVisits: 12,
      averageDurationMs: 42000,
      activeNow: 2,
    },
    daily: [
      { date: '2026-07-02', visits: 3, averageDurationMs: 30000 },
      { date: '2026-07-03', visits: 9, averageDurationMs: 60000 },
    ],
    recent: [],
  }, fakeDocument);

  const text = collectText(card);
  const chart = card.querySelector('.admin-visits-chart');
  const bars = card.querySelectorAll('.admin-visits-chart__bar');

  assert.equal(card.className, 'admin-card admin-visits-card');
  assert.match(text, /Visites du site/);
  assert.match(text, /12 visites/);
  assert.match(text, /42 s/);
  assert.match(text, /2 actives/);
  assert.equal(chart.getAttribute('role'), 'img');
  assert.match(chart.getAttribute('aria-label'), /Visites anonymes par jour/);
  assert.equal(bars.length, 2);
  assert.equal(bars[1].style.height, '100%');
});

test('createVisitAnalyticsCard renders an empty state without visits', () => {
  const card = createVisitAnalyticsCard({
    summary: {
      totalVisits: 0,
      averageDurationMs: 0,
      activeNow: 0,
    },
    daily: [],
    recent: [],
  }, fakeDocument);

  assert.match(collectText(card), /Aucune visite enregistree/);
});
```

- [ ] **Step 2: Run the visit card tests to verify they fail**

Run:

```powershell
node --test tests/admin-visits.test.js
```

Expected: FAIL with an import error because `js/admin-visits.js` does not exist.

- [ ] **Step 3: Create the admin visit card module**

Create `js/admin-visits.js`:

```javascript
function formatDateLabel(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatVisitCount(count) {
  return `${count} visite${count > 1 ? 's' : ''}`;
}

function appendText(parent, tagName, className, text, doc) {
  const element = doc.createElement(tagName);
  element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

export function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round((durationMs || 0) / 1000));
  if (totalSeconds < 60) return `${totalSeconds} s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes} min ${seconds} s` : `${minutes} min`;
}

export function createVisitAnalyticsCard(visitsData, doc = document) {
  const card = doc.createElement('div');
  card.className = 'admin-card admin-visits-card';
  appendText(card, 'h3', '', 'Visites du site', doc);

  const metrics = doc.createElement('div');
  metrics.className = 'admin-visits-metrics';
  card.appendChild(metrics);

  const metricItems = [
    ['Total', formatVisitCount(visitsData.summary?.totalVisits || 0)],
    ['Duree moyenne', formatDuration(visitsData.summary?.averageDurationMs || 0)],
    ['Actives', `${visitsData.summary?.activeNow || 0} active${(visitsData.summary?.activeNow || 0) > 1 ? 's' : ''}`],
  ];

  for (const [label, value] of metricItems) {
    const item = doc.createElement('article');
    item.className = 'admin-visits-metric';
    appendText(item, 'p', 'admin-visits-metric__label', label, doc);
    appendText(item, 'p', 'admin-visits-metric__value', value, doc);
    metrics.appendChild(item);
  }

  const daily = visitsData.daily || [];
  if (!daily.length) {
    appendText(card, 'p', 'admin-empty', 'Aucune visite enregistree.', doc);
    return card;
  }

  const maxVisits = Math.max(...daily.map((day) => day.visits), 1);
  const chart = doc.createElement('div');
  chart.className = 'admin-visits-chart';
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', 'Visites anonymes par jour et duree moyenne');
  card.appendChild(chart);

  for (const day of daily) {
    const column = doc.createElement('div');
    column.className = 'admin-visits-chart__column';

    const bar = doc.createElement('span');
    bar.className = 'admin-visits-chart__bar';
    bar.style.height = `${Math.max(8, Math.round((day.visits / maxVisits) * 100))}%`;
    bar.setAttribute('title', `${formatVisitCount(day.visits)} - ${formatDuration(day.averageDurationMs)}`);

    appendText(column, 'span', 'admin-visits-chart__value', String(day.visits), doc);
    column.appendChild(bar);
    appendText(column, 'span', 'admin-visits-chart__label', formatDateLabel(day.date), doc);
    appendText(column, 'span', 'admin-visits-chart__duration', formatDuration(day.averageDurationMs), doc);
    chart.appendChild(column);
  }

  return card;
}
```

- [ ] **Step 4: Run the visit card tests to verify they pass**

Run:

```powershell
node --test tests/admin-visits.test.js
```

Expected: PASS.

- [ ] **Step 5: Write the failing admin dashboard integration test**

Append this test to `tests/admin-render.test.js`:

```javascript
test('renderDashboard prepends visit analytics before vote summaries', async () => {
  const { renderDashboard } = await loadAdminModule();
  const container = createFakeElement();
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: createFakeElement,
    getElementById(id) {
      return id === 'votes-summary' ? container : null;
    },
  };

  try {
    renderDashboard({
      visitsData: {
        summary: { totalVisits: 3, averageDurationMs: 30000, activeNow: 1 },
        daily: [{ date: '2026-07-03', visits: 3, averageDurationMs: 30000 }],
        recent: [],
      },
      votesData: {
        palettes: { palette1: 1, palette2: 0 },
        logos: {},
        voters: [],
      },
    });
  } finally {
    globalThis.document = originalDocument;
  }

  const text = collectText(container);
  assert.match(text, /Visites du site/);
  assert.match(text, /3 visites/);
  assert.match(text, /Palettes preferees/);
  assert.equal(container.children[0].className, 'admin-card admin-visits-card');
});
```

- [ ] **Step 6: Run the admin render test to verify it fails**

Run:

```powershell
node --test tests/admin-render.test.js
```

Expected: FAIL because `renderDashboard` is not exported by `js/admin.js`.

- [ ] **Step 7: Update admin rendering and data loading**

Modify the top of `js/admin.js`:

```javascript
import { LOGOS } from './logos.js';
import { PALETTES, PALETTE_KEYS } from './palettes.js';
import { formatPaletteLabel } from './admin-format.js';
import { createVisitAnalyticsCard } from './admin-visits.js';
```

Change the `renderVotes` signature and first lines:

```javascript
export function renderVotes(votesData, { reset = true } = {}) {
  const container = document.getElementById('votes-summary');
  if (reset) container.innerHTML = '';
```

Add this exported function after `renderVotes`:

```javascript
export function renderDashboard({ votesData, visitsData }) {
  const container = document.getElementById('votes-summary');
  container.innerHTML = '';

  if (visitsData) {
    container.appendChild(createVisitAnalyticsCard(visitsData));
  }

  renderVotes(votesData, { reset: false });
}
```

Add this helper before `showDashboard`:

```javascript
async function fetchAdminJson(path, token) {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  return response;
}
```

Replace the fetch block inside `showDashboard(token)` with:

```javascript
  let votesData;
  let visitsData;
  try {
    const [votesResponse, visitsResponse] = await Promise.all([
      fetchAdminJson('/api/votes', token),
      fetchAdminJson('/api/visits', token),
    ]);

    if (votesResponse.status === 401 || visitsResponse.status === 401) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      document.getElementById('login-section').hidden = false;
      document.getElementById('dashboard-section').hidden = true;
      document.getElementById('login-status').textContent = 'Session expiree, reconnectez-vous.';
      return;
    }

    if (!votesResponse.ok || !visitsResponse.ok) {
      throw new Error('Admin data request failed');
    }

    votesData = await votesResponse.json();
    visitsData = await visitsResponse.json();
  } catch (error) {
    document.getElementById('login-section').hidden = false;
    document.getElementById('dashboard-section').hidden = true;
    document.getElementById('login-status').textContent = 'Erreur reseau, reessayez.';
    return;
  }

  document.getElementById('login-section').hidden = true;
  document.getElementById('dashboard-section').hidden = false;
  renderDashboard({ votesData, visitsData });
```

- [ ] **Step 8: Run admin render tests to verify they pass**

Run:

```powershell
node --test tests/admin-visits.test.js tests/admin-render.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```powershell
git add js/admin-visits.js js/admin.js tests/admin-visits.test.js tests/admin-render.test.js
git commit -m "feat: render admin visit analytics"
```

---

### Task 6: Admin Visit Chart Styling

**Files:**
- Modify: `css/admin.css`
- Modify: `tests/admin-css.test.js`

- [ ] **Step 1: Write the failing CSS test**

Append this test to `tests/admin-css.test.js`:

```javascript
test('admin visit analytics chart uses stable accessible bars', () => {
  const metricsBlock = cssBlock('.admin-visits-metrics');
  const chartBlock = cssBlock('.admin-visits-chart');
  const barBlock = cssBlock('.admin-visits-chart__bar');

  assert.match(metricsBlock, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(chartBlock, /display:\s*grid/);
  assert.match(barBlock, /min-height:\s*8px/);
  assert.match(barBlock, /background:\s*linear-gradient/);
});
```

- [ ] **Step 2: Run the CSS test to verify it fails**

Run:

```powershell
node --test tests/admin-css.test.js
```

Expected: FAIL because the `.admin-visits-*` CSS blocks do not exist.

- [ ] **Step 3: Add visit analytics styles**

Append this section before the `@media (prefers-reduced-motion: reduce)` block in `css/admin.css`:

```css
/* --- Analytics visites : metriques compactes + graph natif --- */

.admin-visits-card {
  display: grid;
  gap: 1rem;
}

.admin-visits-card h3 {
  margin-bottom: 0;
}

.admin-visits-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.admin-visits-metric {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  background: var(--admin-inner);
  padding: 0.75rem 0.85rem;
  min-width: 0;
}

.admin-visits-metric__label,
.admin-visits-metric__value {
  margin: 0;
}

.admin-visits-metric__label {
  color: var(--admin-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-visits-metric__value {
  margin-top: 0.28rem;
  font-family: var(--font-display);
  font-size: clamp(1.2rem, 2vw, 1.65rem);
  font-weight: 700;
  color: #f3f6fb;
}

.admin-visits-chart {
  min-height: 190px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(74px, 1fr);
  align-items: end;
  gap: 0.65rem;
  overflow-x: auto;
  padding: 0.7rem 0.15rem 0.1rem;
}

.admin-visits-chart__column {
  min-height: 170px;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  align-items: end;
  gap: 0.35rem;
  color: var(--admin-muted);
  font-size: 0.74rem;
  text-align: center;
}

.admin-visits-chart__value {
  color: #f3f6fb;
  font-family: var(--font-display);
  font-weight: 700;
}

.admin-visits-chart__bar {
  width: min(100%, 36px);
  min-height: 8px;
  justify-self: center;
  border-radius: 10px 10px 4px 4px;
  background: linear-gradient(180deg, #9badff, #6d82e2);
  box-shadow: 0 10px 24px rgba(109, 130, 226, 0.25);
}

.admin-visits-chart__label {
  color: #f3f6fb;
  font-weight: 700;
}

.admin-visits-chart__duration {
  font-size: 0.7rem;
}

@media (max-width: 700px) {
  .admin-visits-metrics {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run the CSS test to verify it passes**

Run:

```powershell
node --test tests/admin-css.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add css/admin.css tests/admin-css.test.js
git commit -m "style: add admin visit analytics chart"
```

---

### Task 7: Full Verification

**Files:**
- No new files
- Validate all changed files

- [ ] **Step 1: Run the full test suite**

Run:

```powershell
npm test
```

Expected: PASS with all `node:test` suites green.

- [ ] **Step 2: Start the local server**

Run:

```powershell
$env:ADMIN_PASSWORD = "admin"
npm run dev
```

Expected: the server prints:

```text
Dev server ready at http://localhost:3000 (admin password: admin)
```

- [ ] **Step 3: Manually verify the public tracker**

Open `http://localhost:3000`, wait at least 30 seconds, then refresh once.

Expected:

- the page still renders normally;
- no visible UI is added to the public page;
- the server logs do not show request errors.

- [ ] **Step 4: Manually verify the admin dashboard**

Open `http://localhost:3000/admin.html`, log in with `admin`.

Expected:

- the dashboard shows a `Visites du site` card;
- total visits is at least `1`;
- duration average is formatted as seconds or minutes;
- the daily graph has at least one bar;
- existing vote cards still render below the visit analytics card.

- [ ] **Step 5: Stop the dev server**

Stop the `npm run dev` process with `Ctrl+C`.

- [ ] **Step 6: Check git state**

Run:

```powershell
git status --short
```

Expected: no uncommitted changes after the task commits.

---

## Self-Review

Spec coverage:

- Public anonymous visit tracking is covered by Tasks 2 and 4.
- Unlimited Redis-backed storage is covered by Task 1 using the existing `visits` hash with no expiry.
- Admin-only analytics endpoint is covered by Task 3.
- Admin graph and metrics are covered by Tasks 5 and 6.
- TDD and final verification are covered by every task and Task 7.

Type consistency:

- The stored record shape is consistently `visitId`, `startedAt`, `lastSeenAt`, `durationMs`, `pageViews`.
- API payload events are consistently `start` and `heartbeat`.
- Admin response shape is consistently `summary`, `daily`, and `recent`.

No unresolved placeholders remain.
