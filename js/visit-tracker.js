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

export function startVisitTracking(options = {}) {
  const noopTracker = { visitId: null, sendHeartbeat() {} };
  let storage;
  let createId;
  let fetchFn;
  let documentRef;
  let windowRef;
  let setIntervalFn;

  try {
    ({
      storage = globalThis.sessionStorage,
      createId = createVisitId,
      fetchFn = globalThis.fetch,
      documentRef = globalThis.document,
      windowRef = globalThis.window,
      setIntervalFn = globalThis.setInterval,
    } = options);
  } catch {
    return noopTracker;
  }

  if (!storage || !fetchFn) return noopTracker;

  let visitId;
  try {
    visitId = getOrCreateVisitId(storage, createId);
  } catch {
    return noopTracker;
  }

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
