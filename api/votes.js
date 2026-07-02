import { getKv } from './_lib/kv.js';
import { LOGO_IDS } from '../js/logos.js';
import { computeVoteSummary } from './_lib/voteLogic.js';
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

    const result = {};
    for (const logoId of LOGO_IDS) {
      const hash = (await kv.hgetall(`vote:${logoId}`)) || {};
      const summary = computeVoteSummary(Object.entries(hash));
      if (isAdmin) {
        result[logoId] = summary;
      } else {
        const entry = { up: summary.up, down: summary.down };
        if (visitorId) {
          const myVoter = summary.voters.find((voter) => voter.visitorId === visitorId);
          entry.myVote = myVoter ? myVoter.value : null;
        }
        result[logoId] = entry;
      }
    }

    res.status(200).json(result);
  };
}

export default createVotesHandler(getKv());
