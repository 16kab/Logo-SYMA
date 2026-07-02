import { getKv } from './_lib/kv.js';
import { isValidPaletteKey, isValidRanking, sanitizeName } from './_lib/validate.js';

export function createVoteHandler(kv, now = () => Date.now()) {
  return async function voteHandler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { visitorId, name, paletteKey, ranking } = req.body || {};

    if (!visitorId || !isValidPaletteKey(paletteKey) || !isValidRanking(ranking)) {
      res.status(400).json({ error: 'Invalid vote payload' });
      return;
    }

    await kv.hset('votes', {
      [visitorId]: { name: sanitizeName(name), paletteKey, ranking, ts: now() },
    });

    res.status(200).json({ status: 'saved' });
  };
}

export default createVoteHandler(getKv());
