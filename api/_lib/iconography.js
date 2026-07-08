import { ICONOGRAPHY_ITEM_IDS } from '../../js/iconography-items.js';

export const ICONOGRAPHY_KEY = 'iconography';
export const ICONOGRAPHY_FIELD = 'state';

const MAX_FEEDBACK_LENGTH = 2000;
const MAX_REQUEST_TITLE_LENGTH = 120;

function createEmptyState() {
  return { items: {}, requests: [] };
}

function cloneState(state) {
  return {
    items: { ...(state?.items || {}) },
    requests: Array.isArray(state?.requests) ? [...state.requests] : [],
  };
}

function isKnownItemId(itemId) {
  return ICONOGRAPHY_ITEM_IDS.includes(itemId);
}

export function sanitizeFeedback(feedback) {
  const trimmed = typeof feedback === 'string' ? feedback.trim() : '';
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_FEEDBACK_LENGTH);
}

export function sanitizeRequestTitle(title) {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_REQUEST_TITLE_LENGTH);
}

export async function readIconography(kv) {
  const stored = await kv.hget(ICONOGRAPHY_KEY, ICONOGRAPHY_FIELD);
  return stored ? cloneState(stored) : createEmptyState();
}

export async function writeIconography(kv, state) {
  const record = cloneState(state);
  await kv.hset(ICONOGRAPHY_KEY, { [ICONOGRAPHY_FIELD]: record });
  return record;
}

export async function applyIconographyAction(kv, payload, now = () => Date.now()) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const state = await readIconography(kv);
  const timestamp = now();

  if (payload.action === 'approve') {
    if (!isKnownItemId(payload.itemId)) return null;
    state.items[payload.itemId] = { status: 'approved', feedback: '', updatedAt: timestamp };
    return await writeIconography(kv, state);
  }

  if (payload.action === 'reject') {
    if (!isKnownItemId(payload.itemId)) return null;
    const feedback = sanitizeFeedback(payload.feedback);
    if (!feedback) return null;
    state.items[payload.itemId] = { status: 'rejected', feedback, updatedAt: timestamp };
    return await writeIconography(kv, state);
  }

  if (payload.action === 'reset') {
    if (!isKnownItemId(payload.itemId)) return null;
    delete state.items[payload.itemId];
    return await writeIconography(kv, state);
  }

  if (payload.action === 'addRequest') {
    const title = sanitizeRequestTitle(payload.title);
    if (!title) return null;
    state.requests.push({ id: `request-${timestamp}`, title, createdAt: timestamp });
    return await writeIconography(kv, state);
  }

  return null;
}
