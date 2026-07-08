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

export const DEFAULT_TYPOGRAPHY = {
  headingFont: 'Outfit',
  bodyFont: 'Quicksand',
  decorationFont: null,
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
