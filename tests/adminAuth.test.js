import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAdminToken, isAuthorizedToken, extractBearerToken } from '../api/_lib/adminAuth.js';

test('computeAdminToken is deterministic for the same password', () => {
  assert.equal(computeAdminToken('secret'), computeAdminToken('secret'));
});

test('computeAdminToken differs for different passwords', () => {
  assert.notEqual(computeAdminToken('secret'), computeAdminToken('other'));
});

test('isAuthorizedToken accepts a token matching the admin password', () => {
  const token = computeAdminToken('secret');
  assert.equal(isAuthorizedToken(token, 'secret'), true);
});

test('isAuthorizedToken rejects a mismatched token', () => {
  assert.equal(isAuthorizedToken('wrong-token', 'secret'), false);
});

test('isAuthorizedToken rejects when password or token is missing', () => {
  assert.equal(isAuthorizedToken(null, 'secret'), false);
  assert.equal(isAuthorizedToken(computeAdminToken('secret'), undefined), false);
});

test('extractBearerToken parses the Authorization header', () => {
  assert.equal(extractBearerToken('Bearer abc123'), 'abc123');
  assert.equal(extractBearerToken('Basic abc123'), null);
  assert.equal(extractBearerToken(undefined), null);
});
