import { LOGO_IDS } from '../../js/logos.js';
import { PALETTE_KEYS } from '../../js/palettes.js';

const MAX_NAME_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 2000;

export function isValidLogoId(logoId) {
  return LOGO_IDS.includes(logoId);
}

export function isValidVoteValue(value) {
  return value === 'up' || value === 'down';
}

export function isValidPaletteKey(paletteKey) {
  return PALETTE_KEYS.includes(paletteKey);
}

export function isValidRanking(ranking) {
  if (!ranking || typeof ranking !== 'object' || Array.isArray(ranking)) return false;

  const keys = Object.keys(ranking).sort();
  if (keys.length !== LOGO_IDS.length) return false;
  if (keys.join('|') !== [...LOGO_IDS].sort().join('|')) return false;

  const ranks = Object.values(ranking);
  const expectedRanks = Array.from({ length: LOGO_IDS.length }, (_, index) => index + 1);
  return expectedRanks.every((rank) => ranks.includes(rank)) && new Set(ranks).size === LOGO_IDS.length;
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
