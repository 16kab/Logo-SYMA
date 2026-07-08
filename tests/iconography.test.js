import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ICONOGRAPHY_FIELD,
  ICONOGRAPHY_KEY,
  applyIconographyAction,
  readIconography,
  sanitizeFeedback,
  sanitizeRequestTitle,
} from '../api/_lib/iconography.js';
import { createFakeKv } from './helpers/fakeKv.js';

test('readIconography returns an empty global state by default', async () => {
  const kv = createFakeKv();
  assert.deepEqual(await readIconography(kv), { items: {}, requests: [] });
});

test('approve stores an approved global item state', async () => {
  const kv = createFakeKv();
  const state = await applyIconographyAction(kv, { action: 'approve', itemId: 'blobs' }, () => 123);

  assert.equal(ICONOGRAPHY_KEY, 'iconography');
  assert.equal(ICONOGRAPHY_FIELD, 'state');
  assert.deepEqual(state.items.blobs, { status: 'approved', feedback: '', updatedAt: 123 });
  assert.deepEqual(await kv.hget(ICONOGRAPHY_KEY, ICONOGRAPHY_FIELD), state);
});

test('reject stores trimmed feedback and replaces previous state', async () => {
  const kv = createFakeKv();
  await applyIconographyAction(kv, { action: 'approve', itemId: 'blobs' }, () => 100);

  const state = await applyIconographyAction(kv, {
    action: 'reject',
    itemId: 'blobs',
    feedback: '  A simplifier  ',
  }, () => 200);

  assert.deepEqual(state.items.blobs, { status: 'rejected', feedback: 'A simplifier', updatedAt: 200 });
});

test('reset removes one item state without deleting requests', async () => {
  const kv = createFakeKv();
  await applyIconographyAction(kv, { action: 'approve', itemId: 'blobs' }, () => 100);
  await applyIconographyAction(kv, { action: 'addRequest', title: 'Tasse vue face' }, () => 200);

  const state = await applyIconographyAction(kv, { action: 'reset', itemId: 'blobs' }, () => 300);

  assert.deepEqual(state.items, {});
  assert.equal(state.requests.length, 1);
});

test('addRequest appends a cleaned free request title', async () => {
  const kv = createFakeKv();
  const state = await applyIconographyAction(kv, { action: 'addRequest', title: '  Tasse vue face  ' }, () => 456);

  assert.deepEqual(state.requests, [{ id: 'request-456', title: 'Tasse vue face', createdAt: 456 }]);
});

test('invalid actions return null and do not store state', async () => {
  const kv = createFakeKv();

  assert.equal(await applyIconographyAction(kv, { action: 'approve', itemId: 'unknown' }), null);
  assert.equal(await applyIconographyAction(kv, { action: 'reject', itemId: 'blobs', feedback: '   ' }), null);
  assert.equal(await applyIconographyAction(kv, { action: 'addRequest', title: '   ' }), null);
  assert.equal(await applyIconographyAction(kv, { action: 'deleteAll' }), null);
  assert.equal(await kv.hget(ICONOGRAPHY_KEY, ICONOGRAPHY_FIELD), null);
});

test('sanitize helpers trim and truncate long text', () => {
  assert.equal(sanitizeFeedback('  ok  '), 'ok');
  assert.equal(sanitizeFeedback('x'.repeat(2100)).length, 2000);
  assert.equal(sanitizeRequestTitle('  Nouvelle tasse  '), 'Nouvelle tasse');
  assert.equal(sanitizeRequestTitle('x'.repeat(150)).length, 120);
});
