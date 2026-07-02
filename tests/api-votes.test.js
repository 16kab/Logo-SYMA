import test from 'node:test';
import assert from 'node:assert/strict';
import { createVotesHandler } from '../api/votes.js';
import { createVoteHandler } from '../api/vote.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';
import { computeAdminToken } from '../api/_lib/adminAuth.js';

const ranking = { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5, logo6: 6, logo7: 7 };

async function seedVote(kv, visitorId, name, paletteKey, visitorRanking = ranking) {
  const voteHandler = createVoteHandler(kv, () => (visitorId === 'v1' ? 100 : 200));
  await voteHandler({ method: 'POST', body: { visitorId, name, paletteKey, ranking: visitorRanking } }, createMockRes());
}

test('returns public aggregate palette and ranking results', async () => {
  const kv = createFakeKv();
  await seedVote(kv, 'v1', 'Alexis', 'palette1');
  await seedVote(kv, 'v2', 'Camille', 'palette2', { logo1: 2, logo2: 1, logo3: 3, logo4: 4, logo5: 5, logo6: 6, logo7: 7 });
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();

  await handler({ method: 'GET', headers: {} }, res);

  assert.deepEqual(res.body.palettes, { palette1: 1, palette2: 1 });
  assert.equal(res.body.logos.logo1.score, 3);
  assert.equal(res.body.logos.logo1.averageRank, 1.5);
  assert.equal(res.body.voters, undefined);
});

test('includes voter detail when a valid admin token is provided', async () => {
  const kv = createFakeKv();
  await seedVote(kv, 'v1', 'Alexis', 'palette1');
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();
  const token = computeAdminToken('secret');

  await handler({ method: 'GET', headers: { authorization: `Bearer ${token}` } }, res);

  assert.equal(res.body.voters.length, 1);
  assert.equal(res.body.voters[0].name, 'Alexis');
  assert.equal(res.body.voters[0].paletteKey, 'palette1');
  assert.deepEqual(res.body.voters[0].ranking, ranking);
});

test('includes requesting visitor own ranked vote when visitorId is provided', async () => {
  const kv = createFakeKv();
  await seedVote(kv, 'v1', 'Alexis', 'palette1');
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();

  await handler({ method: 'GET', headers: {}, url: '/api/votes?visitorId=v1' }, res);

  assert.deepEqual(res.body.myVote, { paletteKey: 'palette1', ranking });
});

test('returns empty aggregates with no votes', async () => {
  const kv = createFakeKv();
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();

  await handler({ method: 'GET', headers: {} }, res);

  assert.deepEqual(res.body.palettes, { palette1: 0, palette2: 0 });
  assert.equal(res.body.logos.logo1.score, 0);
});

test('rejects non-GET methods', async () => {
  const kv = createFakeKv();
  const handler = createVotesHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});
