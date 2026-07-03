import { getKv } from './_lib/kv.js';
import { isValidVisitPayload, recordVisitEvent } from './_lib/visitAnalytics.js';

export function createVisitHandler(kv, now = () => Date.now()) {
  return async function visitHandler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    if (!isValidVisitPayload(req.body)) {
      res.status(400).json({ error: 'Invalid visit payload' });
      return;
    }

    await recordVisitEvent(kv, {
      visitId: req.body.visitId.trim(),
      event: req.body.event,
    }, now);

    res.status(200).json({ status: 'recorded' });
  };
}

export default createVisitHandler(getKv());
