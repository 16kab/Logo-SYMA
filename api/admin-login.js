import { computeAdminToken } from './_lib/adminAuth.js';

export function createAdminLoginHandler(getAdminPassword = () => process.env.ADMIN_PASSWORD) {
  return function adminLoginHandler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const adminPassword = getAdminPassword();
    const submittedPassword = req.body && req.body.password;

    if (!submittedPassword) {
      res.status(400).json({ error: 'Password required' });
      return;
    }

    if (!adminPassword || submittedPassword !== adminPassword) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    res.status(200).json({ token: computeAdminToken(adminPassword) });
  };
}

export default createAdminLoginHandler();
