import { getKv } from './_lib/kv.js';
import { computeRankedVoteSummary } from './_lib/voteLogic.js';
import { extractBearerToken, isAuthorizedToken } from './_lib/adminAuth.js';

export function createVotesHandler(kv, getAdminPassword = () => process.env.ADMIN_PASSWORD) {
  return async function votesHandler(req, res) {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const token = extractBearerToken(req.headers && req.headers.authorization);
    const isAdmin = isAuthorizedToken(token, getAdminPassword());
    const requestUrl = new URL(req.url || '/', 'http://localhost');
    const visitorId = requestUrl.searchParams.get('visitorId');
    const hash = (await kv.hgetall('votes')) || {};
    const summary = computeRankedVoteSummary(Object.entries(hash));
    const result = {
      palettes: summary.palettes,
      logos: summary.logos,
    };

    if (visitorId && hash[visitorId]) {
      result.myVote = {
        paletteKey: hash[visitorId].paletteKey,
        ranking: hash[visitorId].ranking,
      };
    }

    if (isAdmin) {
      result.voters = summary.voters;
    }

    res.status(200).json(result);
  };
}

export default createVotesHandler(getKv());
