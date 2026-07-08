import {
  DEFAULT_TYPOGRAPHY,
  isBodyFont,
  isDecorationFont,
  isHeadingFont,
} from '../../js/typography-options.js';

export const TYPOGRAPHY_KEY = 'typography';
export const TYPOGRAPHY_FIELD = 'selection';

function cloneSelection(selection) {
  return {
    headingFont: selection?.headingFont || DEFAULT_TYPOGRAPHY.headingFont,
    bodyFont: selection?.bodyFont || DEFAULT_TYPOGRAPHY.bodyFont,
    decorationFont: selection?.decorationFont || null,
    ...(selection?.updatedAt ? { updatedAt: selection.updatedAt } : {}),
  };
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const selection = {
    headingFont: payload.headingFont,
    bodyFont: payload.bodyFont,
    decorationFont: payload.decorationFont || null,
  };

  if (!isHeadingFont(selection.headingFont)) return null;
  if (!isBodyFont(selection.bodyFont)) return null;
  if (!isDecorationFont(selection.decorationFont)) return null;
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
