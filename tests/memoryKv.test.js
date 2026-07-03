import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryKv } from '../api/_lib/memoryKv.js';

test('hset then hgetall returns stored fields', async () => {
  const kv = createMemoryKv();
  await kv.hset('vote:logo1', { v1: { value: 'up' } });
  const all = await kv.hgetall('vote:logo1');
  assert.deepEqual(all, { v1: { value: 'up' } });
});

test('hgetall returns null for an unknown key', async () => {
  const kv = createMemoryKv();
  assert.equal(await kv.hgetall('vote:unknown'), null);
});

test('hget returns one stored field or null for missing key and field', async () => {
  const kv = createMemoryKv();
  await kv.hset('vote:logo1', {
    v1: { value: 'up' },
    v2: { value: 'down' },
  });

  assert.deepEqual(await kv.hget('vote:logo1', 'v1'), { value: 'up' });
  assert.equal(await kv.hget('vote:logo1', 'missing'), null);
  assert.equal(await kv.hget('vote:missing', 'v1'), null);
});

test('hdel removes a field and reports whether it existed', async () => {
  const kv = createMemoryKv();
  await kv.hset('vote:logo1', { v1: { value: 'up' } });
  assert.equal(await kv.hdel('vote:logo1', 'v1'), 1);
  assert.equal(await kv.hdel('vote:logo1', 'v1'), 0);
  assert.equal(await kv.hgetall('vote:logo1'), null);
});

test('rpush and lrange preserve insertion order', async () => {
  const kv = createMemoryKv();
  await kv.rpush('messages', { message: 'first' });
  await kv.rpush('messages', { message: 'second' });
  const all = await kv.lrange('messages', 0, -1);
  assert.deepEqual(all.map((m) => m.message), ['first', 'second']);
});
