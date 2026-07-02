import { Redis } from '@upstash/redis';

let client;

export function getKv() {
  if (!client) {
    client = Redis.fromEnv();
  }
  return client;
}
