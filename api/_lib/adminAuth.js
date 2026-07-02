import { createHash, timingSafeEqual } from 'node:crypto';

const TOKEN_SALT = 'syma-logo-admin';

export function computeAdminToken(password) {
  return createHash('sha256').update(`${password}:${TOKEN_SALT}`).digest('hex');
}

export function isAuthorizedToken(token, adminPassword) {
  if (!token || !adminPassword) return false;
  const expected = computeAdminToken(adminPassword);
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  if (tokenBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(tokenBuffer, expectedBuffer);
}

export function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) return null;
  return authorizationHeader.slice('Bearer '.length).trim() || null;
}
