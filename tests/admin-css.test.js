import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/admin.css', import.meta.url), 'utf8');

function cssBlock(selector) {
  const escapedSelector = selector.replace(/[.#]/g, '\\$&');
  return css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))?.[1] || '';
}

test('admin logo rankings are constrained to one horizontal row', () => {
  const block = cssBlock('.admin-logo-ranking--single-line');

  assert.match(block, /grid-auto-flow:\s*column/);
  assert.match(block, /grid-auto-columns:\s*minmax/);
  assert.match(block, /overflow-x:\s*auto/);
});

test('admin palette previews render compact color swatches', () => {
  const previewBlock = cssBlock('.admin-palette-preview');
  const swatchBlock = cssBlock('.admin-palette-preview__swatch');

  assert.match(previewBlock, /display:\s*flex/);
  assert.match(swatchBlock, /border-radius:\s*999px/);
});
