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

test('admin visit analytics chart uses stable accessible bars', () => {
  const metricsBlock = cssBlock('.admin-visits-metrics');
  const chartBlock = cssBlock('.admin-visits-chart');
  const barBlock = cssBlock('.admin-visits-chart__bar');

  assert.match(metricsBlock, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(chartBlock, /display:\s*grid/);
  assert.match(barBlock, /min-height:\s*8px/);
  assert.match(barBlock, /background:\s*linear-gradient/);
});

test('admin final choice card has stable preview and metadata layout', () => {
  const cardBlock = cssBlock('.admin-final-choice-card');
  const previewBlock = cssBlock('.admin-final-choice__preview');
  const metaBlock = cssBlock('.admin-final-choice__meta');

  assert.match(cardBlock, /display:\s*grid/);
  assert.match(previewBlock, /min-height:\s*180px/);
  assert.match(metaBlock, /grid-template-columns:\s*repeat/);
});
