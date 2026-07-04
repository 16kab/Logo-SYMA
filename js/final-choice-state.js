export function createBlankFinalChoiceDraft(name = '') {
  return {
    logoId: null,
    paletteKey: null,
    bgColor: null,
    logoColor: null,
    name: name || '',
  };
}

export function createDraftFromFinalChoice(finalChoice, fallbackName = '') {
  if (!finalChoice) return createBlankFinalChoiceDraft(fallbackName);

  return {
    logoId: finalChoice.logoId || null,
    paletteKey: finalChoice.paletteKey || null,
    bgColor: finalChoice.bgColor || null,
    logoColor: finalChoice.logoColor || null,
    name: finalChoice.name || fallbackName || '',
  };
}

export function applyFinalChoicePalette(draft, paletteKey) {
  return {
    ...draft,
    paletteKey,
    bgColor: null,
    logoColor: null,
  };
}

export function isCompleteFinalChoiceDraft(draft) {
  return Boolean(draft?.logoId && draft?.paletteKey && draft?.bgColor && draft?.logoColor);
}

export function getFinalChoicePayload(draft) {
  return {
    logoId: draft.logoId,
    paletteKey: draft.paletteKey,
    bgColor: draft.bgColor,
    logoColor: draft.logoColor,
    name: typeof draft.name === 'string' ? draft.name.trim() : '',
  };
}
