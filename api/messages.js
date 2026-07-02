import { getKv } from './_lib/kv.js';
import { extractBearerToken, isAuthorizedToken } from './_lib/adminAuth.js';

export function createMessagesHandler(kv, getAdminPassword = () => process.env.ADMIN_PASSWORD) {
  return async function messagesHandler(req, res) {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const token = extractBearerToken(req.headers && req.headers.authorization);
    if (!isAuthorizedToken(token, getAdminPassword())) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const messages = await kv.lrange('messages', 0, -1);
    res.status(200).json(messages.slice().reverse());
  };
}

export default createMessagesHandler(getKv());
