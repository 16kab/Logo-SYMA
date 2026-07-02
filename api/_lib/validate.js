import { LOGO_IDS } from '../../js/logos.js';

const MAX_NAME_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 2000;

export function isValidLogoId(logoId) {
  return LOGO_IDS.includes(logoId);
}

export function isValidVoteValue(value) {
  return value === 'up' || value === 'down';
}

export function sanitizeName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return 'Anonyme';
  return trimmed.slice(0, MAX_NAME_LENGTH);
}

export function sanitizeMessage(message) {
  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_MESSAGE_LENGTH);
}
