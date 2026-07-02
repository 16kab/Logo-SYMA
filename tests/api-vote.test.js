import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoteHandler } from '../api/vote.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

const ranking = { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5, logo6: 6 };

test('records a ranked vote with palette choice', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv, () => 12345);
  const res = createMockRes();

  await handler({ method: 'POST', body: { visitorId: 'v1', name: 'Alexis', paletteKey: 'palette1', ranking } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: 'saved' });
  const stored = await kv.hgetall('votes');
  assert.deepEqual(stored, {
    v1: { name: 'Alexis', paletteKey: 'palette1', ranking, ts: 12345 },
  });
});

test('replaces an existing ranked vote for the same visitor', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv, () => 999);
  await handler({ method: 'POST', body: { visitorId: 'v1', name: 'Alexis', paletteKey: 'palette1', ranking } }, createMockRes());
  const nextRanking = { logo1: 6, logo2: 5, logo3: 4, logo4: 3, logo5: 2, logo6: 1 };
  const res = createMockRes();

  await handler({ method: 'POST', body: { visitorId: 'v1', name: 'Alexis', paletteKey: 'palette2', ranking: nextRanking } }, res);

  assert.deepEqual(res.body, { status: 'saved' });
  const stored = await kv.hgetall('votes');
  assert.deepEqual(stored.v1, { name: 'Alexis', paletteKey: 'palette2', ranking: nextRanking, ts: 999 });
});

test('rejects invalid ranked vote payloads', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv);

  for (const body of [
    { visitorId: '', name: 'Alexis', paletteKey: 'palette1', ranking },
    { visitorId: 'v1', name: 'Alexis', paletteKey: 'palette9', ranking },
    { visitorId: 'v1', name: 'Alexis', paletteKey: 'palette1', ranking: { ...ranking, logo6: 5 } },
  ]) {
    const res = createMockRes();
    await handler({ method: 'POST', body }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('rejects non-POST methods', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv);
  const res = createMockRes();
  await handler({ method: 'GET', body: {} }, res);
  assert.equal(res.statusCode, 405);
});
