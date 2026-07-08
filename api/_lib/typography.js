import {
  DEFAULT_TYPOGRAPHY,
  isBodyFont,
  isDecorationFont,
  isFontWeight,
  isHeadingFont,
} from '../../js/typography-options.js';

export const TYPOGRAPHY_KEY = 'typography';
export const TYPOGRAPHY_FIELD = 'selection';

function cloneSelection(selection) {
  return {
    headingFont: selection?.headingFont || DEFAULT_TYPOGRAPHY.headingFont,
    headingWeight: normalizeWeight(selection?.headingWeight, DEFAULT_TYPOGRAPHY.headingWeight),
    bodyFont: selection?.bodyFont || DEFAULT_TYPOGRAPHY.bodyFont,
    bodyWeight: normalizeWeight(selection?.bodyWeight, DEFAULT_TYPOGRAPHY.bodyWeight),
    decorationFont: selection?.decorationFont || null,
    decorationWeight: normalizeWeight(selection?.decorationWeight, DEFAULT_TYPOGRAPHY.decorationWeight),
    ...(selection?.updatedAt ? { updatedAt: selection.updatedAt } : {}),
  };
}

function normalizeWeight(value, fallback) {
  const weight = Number(value ?? fallback);
  return isFontWeight(weight) ? weight : fallback;
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const selection = {
    headingFont: payload.headingFont,
    headingWeight: normalizeWeight(payload.headingWeight, DEFAULT_TYPOGRAPHY.headingWeight),
    bodyFont: payload.bodyFont,
    bodyWeight: normalizeWeight(payload.bodyWeight, DEFAULT_TYPOGRAPHY.bodyWeight),
    decorationFont: payload.decorationFont || null,
    decorationWeight: normalizeWeight(payload.decorationWeight, DEFAULT_TYPOGRAPHY.decorationWeight),
  };

  if (!isHeadingFont(selection.headingFont)) return null;
  if (!isFontWeight(payload.headingWeight ?? selection.headingWeight)) return null;
  if (!isBodyFont(selection.bodyFont)) return null;
  if (!isFontWeight(payload.bodyWeight ?? selection.bodyWeight)) return null;
  if (!isDecorationFont(selection.decorationFont)) return null;
  if (!isFontWeight(payload.decorationWeight ?? selection.decorationWeight)) return null;
  return selection;
}

export async function readTypography(kv) {
  const stored = await kv.hget(TYPOGRAPHY_KEY, TYPOGRAPHY_FIELD);
  return stored ? cloneSelection(stored) : cloneSelection(DEFAULT_TYPOGRAPHY);
}

export async function writeTypography(kv, selection) {
  const record = cloneSelection(selection);
  await kv.hset(TYPOGRAPHY_KEY, { [TYPOGRAPHY_FIELD]: record });
  return record;
}

export async function applyTypographySelection(kv, payload, now = () => Date.now()) {
  const selection = normalizePayload(payload);
  if (!selection) return null;

  return await writeTypography(kv, {
    ...selection,
    updatedAt: now(),
  });
}
