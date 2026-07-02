import { PALETTES } from './palettes.js';
import { LOGOS } from './logos.js';

export function initialState(paletteKey = 'palette1', logoId = LOGOS[0].id) {
  const palette = PALETTES[paletteKey];
  return {
    logoId,
    paletteKey,
    bgColor: palette.colors[0],
    logoColor: palette.colors[0],
  };
}

export function withPaletteChange(state, paletteKey) {
  const palette = PALETTES[paletteKey];
  return {
    ...state,
    paletteKey,
    bgColor: palette.colors[0],
    logoColor: palette.colors[1],
  };
}

export function withLogoChange(state, logoId) {
  return { ...state, logoId };
}

export function withBgColor(state, bgColor) {
  return { ...state, bgColor };
}

export function withLogoColor(state, logoColor) {
  return { ...state, logoColor };
}
