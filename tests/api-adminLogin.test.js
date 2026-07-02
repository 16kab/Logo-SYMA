import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminLoginHandler } from '../api/admin-login.js';
import { computeAdminToken } from '../api/_lib/adminAuth.js';
import { createMockRes } from './helpers/http.js';

test('returns a token for the correct password', () => {
  const handler = createAdminLoginHandler(() => 'secret');
  const res = createMockRes();
  handler({ method: 'POST', body: { password: 'secret' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.token, computeAdminToken('secret'));
});

test('rejects an incorrect password', () => {
  const handler = createAdminLoginHandler(() => 'secret');
  const res = createMockRes();
  handler({ method: 'POST', body: { password: 'wrong' } }, res);
  assert.equal(res.statusCode, 401);
});

test('rejects a missing password', () => {
  const handler = createAdminLoginHandler(() => 'secret');
  const res = createMockRes();
  handler({ method: 'POST', body: {} }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects non-POST methods', () => {
  const handler = createAdminLoginHandler(() => 'secret');
  const res = createMockRes();
  handler({ method: 'GET', body: {} }, res);
  assert.equal(res.statusCode, 405);
});
