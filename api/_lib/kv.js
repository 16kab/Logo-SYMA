import { createClient } from 'redis';

let client;
let connectPromise;

function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (error) => console.error('Redis client error', error));
  }
  if (!connectPromise) {
    connectPromise = client.connect();
  }
  return connectPromise.then(() => client);
}

export function getKv() {
  return {
    async hset(key, fieldValues) {
      const redis = await getClient();
      const serialized = {};
      for (const [field, value] of Object.entries(fieldValues)) {
        serialized[field] = JSON.stringify(value);
      }
      return redis.hSet(key, serialized);
    },

    async hdel(key, field) {
      const redis = await getClient();
      return redis.hDel(key, field);
    },

    async hget(key, field) {
      const redis = await getClient();
      const raw = await redis.hGet(key, field);
      return raw === null ? null : JSON.parse(raw);
    },

    async hgetall(key) {
      const redis = await getClient();
      const raw = await redis.hGetAll(key);
      if (!raw || Object.keys(raw).length === 0) return null;
      const parsed = {};
      for (const [field, value] of Object.entries(raw)) {
        parsed[field] = JSON.parse(value);
      }
      return parsed;
    },

    async rpush(key, value) {
      const redis = await getClient();
      return redis.rPush(key, JSON.stringify(value));
    },

    async lrange(key, start, stop) {
      const redis = await getClient();
      const raw = await redis.lRange(key, start, stop);
      return raw.map((item) => JSON.parse(item));
    },
  };
}
