import { getKv } from './_lib/kv.js';
import { sanitizeName, sanitizeMessage } from './_lib/validate.js';

export function createMessageHandler(kv, now = () => Date.now()) {
  return async function messageHandler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { name, message } = req.body || {};
    const cleanMessage = sanitizeMessage(message);

    if (!cleanMessage) {
      res.status(400).json({ error: 'Message required' });
      return;
    }

    await kv.rpush('messages', {
      name: sanitizeName(name),
      message: cleanMessage,
      ts: now(),
    });

    res.status(200).json({ status: 'saved' });
  };
}

export default createMessageHandler(getKv());
