import test from 'node:test';
import assert from 'node:assert/strict';
import { createFinalChoiceHandler } from '../api/final-choice.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

const payload = {
  logoId: 'logo1',
  paletteKey: 'palette1',
  bgColor: '#18233f',
  logoColor: '#ffffff',
  name: 'Alexis',
};

test('GET returns null when no final choice exists', async () => {
  const handler = createFinalChoiceHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'GET', body: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { finalChoice: null });
});

test('POST saves and returns the global final choice', async () => {
  const kv = createFakeKv();
  const handler = createFinalChoiceHandler(kv, () => 12345);
  const res = createMockRes();

  await handler({ method: 'POST', body: payload }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: 'saved',
    finalChoice: { ...payload, updatedAt: 12345 },
  });
});

test('POST replaces the previous global final choice', async () => {
  const kv = createFakeKv();
  const handler = createFinalChoiceHandler(kv, () => 999);
  await handler({ method: 'POST', body: payload }, createMockRes());
  const res = createMockRes();

  await handler({
    method: 'POST',
    body: {
      logoId: 'logo2',
      paletteKey: 'palette2',
      bgColor: '#f35b43',
      logoColor: '#ffffff',
      name: 'Camille',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.finalChoice.logoId, 'logo2');
  assert.equal(res.body.finalChoice.name, 'Camille');
  assert.equal(res.body.finalChoice.updatedAt, 999);

  const getRes = createMockRes();
  await handler({ method: 'GET', body: {} }, getRes);
  assert.equal(getRes.body.finalChoice.logoId, 'logo2');
});

test('POST rejects invalid payloads', async () => {
  const handler = createFinalChoiceHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'POST', body: { ...payload, bgColor: '#ff00ff' } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid final choice payload' });
});

test('rejects unsupported methods', async () => {
  const handler = createFinalChoiceHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'DELETE', body: {} }, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'Method not allowed' });
});
