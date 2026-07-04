import { getKv } from './_lib/kv.js';
import { readFinalChoice, writeFinalChoice } from './_lib/finalChoice.js';

export function createFinalChoiceHandler(kv, now = () => Date.now()) {
  return async function finalChoiceHandler(req, res) {
    if (req.method === 'GET') {
      res.status(200).json({ finalChoice: await readFinalChoice(kv) });
      return;
    }

    if (req.method === 'POST') {
      const finalChoice = await writeFinalChoice(kv, req.body || {}, now);
      if (!finalChoice) {
        res.status(400).json({ error: 'Invalid final choice payload' });
        return;
      }

      res.status(200).json({ status: 'saved', finalChoice });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  };
}

export default createFinalChoiceHandler(getKv());
