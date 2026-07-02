import test from 'node:test';
import assert from 'node:assert/strict';
import { createComparatorPanelMarkup } from '../js/comparator-panel.js';

test('comparator panel markup labels background and logo color controls', () => {
  const markup = createComparatorPanelMarkup();

  assert.match(markup, /data-role="bg-swatches"/);
  assert.match(markup, /data-role="logo-swatches"/);
  assert.match(markup, />Fond</);
  assert.match(markup, />Logo</);
});
