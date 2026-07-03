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
  const existing = await kv.hget(VISITS_KEY, visitId);
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
