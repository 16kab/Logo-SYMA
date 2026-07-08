import { getKv } from './_lib/kv.js';
import { applyIconographyAction, readIconography } from './_lib/iconography.js';

export function createIconographyHandler(kv, now = () => Date.now()) {
  return async function iconographyHandler(req, res) {
    if (req.method === 'GET') {
      res.status(200).json({ iconography: await readIconography(kv) });
      return;
    }

    if (req.method === 'POST') {
      const iconography = await applyIconographyAction(kv, req.body || {}, now);
      if (!iconography) {
        res.status(400).json({ error: 'Invalid iconography payload' });
        return;
      }

      res.status(200).json({ status: 'saved', iconography });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  };
}

export default createIconographyHandler(getKv());
