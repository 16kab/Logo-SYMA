export const HEADING_FONTS = [
  { value: 'Outfit', label: 'Outfit' },
  { value: 'Fredoka', label: 'Fredoka' },
  { value: 'Bagel Fat One', label: 'Bagel Fat One' },
  { value: 'Syne', label: 'Syne' },
];

export const BODY_FONTS = [
  { value: 'Quicksand', label: 'Quicksand' },
  { value: 'Nunito Sans', label: 'Nunito Sans' },
  { value: 'Manrope', label: 'Manrope' },
  { value: 'Inter', label: 'Inter' },
];

export const DECORATION_FONTS = [
  { value: 'Grandstander', label: 'Grandstander' },
  { value: 'Darumadrop One', label: 'Darumadrop One' },
];

export const FONT_WEIGHT_OPTIONS = [
  { value: 400, label: 'Regular 400' },
  { value: 500, label: 'Medium 500' },
  { value: 600, label: 'Semi-bold 600' },
  { value: 700, label: 'Bold 700' },
];

export const DEFAULT_TYPOGRAPHY = {
  headingFont: 'Outfit',
  headingWeight: 700,
  bodyFont: 'Quicksand',
  bodyWeight: 400,
  decorationFont: null,
  decorationWeight: 600,
};

export function isHeadingFont(value) {
  return HEADING_FONTS.some((font) => font.value === value);
}

export function isBodyFont(value) {
  return BODY_FONTS.some((font) => font.value === value);
}

export function isDecorationFont(value) {
  return value === null || DECORATION_FONTS.some((font) => font.value === value);
}

export function isFontWeight(value) {
  return FONT_WEIGHT_OPTIONS.some((weight) => weight.value === Number(value));
}
