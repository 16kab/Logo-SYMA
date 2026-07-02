export function createMemoryKv() {
  const hashes = new Map();
  const lists = new Map();

  return {
    async hset(key, fieldValues) {
      const hash = hashes.get(key) || new Map();
      for (const [field, value] of Object.entries(fieldValues)) {
        hash.set(field, value);
      }
      hashes.set(key, hash);
      return Object.keys(fieldValues).length;
    },

    async hdel(key, field) {
      const hash = hashes.get(key);
      if (!hash) return 0;
      const existed = hash.delete(field);
      return existed ? 1 : 0;
    },

    async hgetall(key) {
      const hash = hashes.get(key);
      if (!hash || hash.size === 0) return null;
      return Object.fromEntries(hash.entries());
    },

    async rpush(key, value) {
      const list = lists.get(key) || [];
      list.push(value);
      lists.set(key, list);
      return list.length;
    },

    async lrange(key, start, stop) {
      const list = lists.get(key) || [];
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end);
    },
  };
}
