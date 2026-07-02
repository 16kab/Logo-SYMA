import test from 'node:test';
import assert from 'node:assert/strict';
import { createVotesHandler } from '../api/votes.js';
import { createVoteHandler } from '../api/vote.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';
import { computeAdminToken } from '../api/_lib/adminAuth.js';

async function seedVote(kv, logoId, visitorId, name, value) {
  const voteHandler = createVoteHandler(kv, () => 1);
  await voteHandler({ method: 'POST', body: { logoId, visitorId, name, value } }, createMockRes());
}

test('returns aggregated counts without voter detail for anonymous requests', async () => {
  const kv = createFakeKv();
  await seedVote(kv, 'logo1', 'v1', 'Alexis', 'up');
  await seedVote(kv, 'logo1', 'v2', 'Camille', 'down');
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();
  await handler({ method: 'GET', headers: {} }, res);
  assert.deepEqual(res.body.logo1, { up: 1, down: 1 });
  assert.equal(res.body.logo1.voters, undefined);
});

test('includes voter detail when a valid admin token is provided', async () => {
  const kv = createFakeKv();
  await seedVote(kv, 'logo1', 'v1', 'Alexis', 'up');
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();
  const token = computeAdminToken('secret');
  await handler({ method: 'GET', headers: { authorization: `Bearer ${token}` } }, res);
  assert.equal(res.body.logo1.voters.length, 1);
  assert.equal(res.body.logo1.voters[0].name, 'Alexis');
});

test('every known logo id is present even with no votes', async () => {
  const kv = createFakeKv();
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();
  await handler({ method: 'GET', headers: {} }, res);
  assert.deepEqual(Object.keys(res.body).sort(), ['logo1', 'logo2', 'logo3', 'logo4', 'logo5']);
});

test('rejects non-GET methods', async () => {
  const kv = createFakeKv();
  const handler = createVotesHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});

test('includes the requesting visitor own vote value when visitorId is provided', async () => {
  const kv = createFakeKv();
  await seedVote(kv, 'logo1', 'v1', 'Alexis', 'up');
  await seedVote(kv, 'logo1', 'v2', 'Camille', 'down');
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();
  await handler({ method: 'GET', headers: {}, url: '/api/votes?visitorId=v2' }, res);
  assert.equal(res.body.logo1.myVote, 'down');
  assert.equal(res.body.logo2.myVote, null);
});
