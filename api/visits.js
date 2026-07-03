import { getKv } from './_lib/kv.js';
import { extractBearerToken, isAuthorizedToken } from './_lib/adminAuth.js';
import { VISITS_KEY, computeVisitAnalytics } from './_lib/visitAnalytics.js';

export function createVisitsHandler(kv, getAdminPassword = () => process.env.ADMIN_PASSWORD, now = () => Date.now()) {
  return async function visitsHandler(req, res) {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const token = extractBearerToken(req.headers && req.headers.authorization);
    if (!isAuthorizedToken(token, getAdminPassword())) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const hash = (await kv.hgetall(VISITS_KEY)) || {};
    res.status(200).json(computeVisitAnalytics(Object.entries(hash), now));
  };
}

export default createVisitsHandler(getKv());
