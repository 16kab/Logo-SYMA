import { getKv } from './_lib/kv.js';
import { isValidLogoId, isValidVoteValue, sanitizeName } from './_lib/validate.js';
import { resolveVoteAction } from './_lib/voteLogic.js';

export function createVoteHandler(kv, now = () => Date.now()) {
  return async function voteHandler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { logoId, visitorId, name, value } = req.body || {};

    if (!isValidLogoId(logoId) || !visitorId || !isValidVoteValue(value)) {
      res.status(400).json({ error: 'Invalid vote payload' });
      return;
    }

    const key = `vote:${logoId}`;
    const hash = (await kv.hgetall(key)) || {};
    const existingEntry = hash[visitorId] || null;
    const action = resolveVoteAction(existingEntry, value);

    if (action.action === 'delete') {
      await kv.hdel(key, visitorId);
      res.status(200).json({ status: 'removed' });
      return;
    }

    await kv.hset(key, {
      [visitorId]: { name: sanitizeName(name), value: action.value, ts: now() },
    });
    res.status(200).json({ status: 'saved', value: action.value });
  };
}

export default createVoteHandler(getKv());
