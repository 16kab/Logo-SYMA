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
