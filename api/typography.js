import { getKv } from './_lib/kv.js';
import { applyTypographySelection, readTypography } from './_lib/typography.js';

export function createTypographyHandler(kv, now = () => Date.now()) {
  return async function typographyHandler(req, res) {
    if (req.method === 'GET') {
      res.status(200).json({ typography: await readTypography(kv) });
      return;
    }

    if (req.method === 'POST') {
      const typography = await applyTypographySelection(kv, req.body || {}, now);
      if (!typography) {
        res.status(400).json({ error: 'Invalid typography payload' });
        return;
      }

      res.status(200).json({ status: 'saved', typography });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  };
}

export default createTypographyHandler(getKv());
