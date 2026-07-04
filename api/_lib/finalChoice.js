import { PALETTES } from '../../js/palettes.js';
import { isValidLogoId, isValidPaletteKey, sanitizeName } from './validate.js';

export const FINAL_CHOICE_KEY = 'finalChoice';
export const FINAL_CHOICE_FIELD = 'current';

function isPaletteColor(paletteKey, color) {
  return Boolean(PALETTES[paletteKey]?.colors.includes(color));
}

export function isValidFinalChoicePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;

  const { logoId, paletteKey, bgColor, logoColor } = payload;
  return isValidLogoId(logoId)
    && isValidPaletteKey(paletteKey)
    && isPaletteColor(paletteKey, bgColor)
    && isPaletteColor(paletteKey, logoColor);
}

export function normalizeFinalChoicePayload(payload, now = () => Date.now()) {
  if (!isValidFinalChoicePayload(payload)) return null;

  return {
    logoId: payload.logoId,
    paletteKey: payload.paletteKey,
    bgColor: payload.bgColor,
    logoColor: payload.logoColor,
    name: sanitizeName(payload.name),
    updatedAt: now(),
  };
}

export async function readFinalChoice(kv) {
  return await kv.hget(FINAL_CHOICE_KEY, FINAL_CHOICE_FIELD);
}

export async function writeFinalChoice(kv, payload, now = () => Date.now()) {
  const record = normalizeFinalChoicePayload(payload, now);
  if (!record) return null;

  await kv.hset(FINAL_CHOICE_KEY, { [FINAL_CHOICE_FIELD]: record });
  return record;
}
