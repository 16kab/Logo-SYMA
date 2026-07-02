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

    const result = {};
    for (const logoId of LOGO_IDS) {
      const hash = (await kv.hgetall(`vote:${logoId}`)) || {};
      const summary = computeVoteSummary(Object.entries(hash));
      result[logoId] = isAdmin ? summary : { up: summary.up, down: summary.down };
    }

    res.status(200).json(result);
  };
}

export default createVotesHandler(getKv());
