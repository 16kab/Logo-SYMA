import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

function cssBlock(selector) {
  const match = css.match(new RegExp(`${selector.replace(/[.#]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
  return match?.[1] || '';
}

function cssBlockContaining(selector, property) {
  const escapedSelector = selector.replace(/[.#]/g, '\\$&');
  const matches = css.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 'g'));
  for (const match of matches) {
    if (match[1].includes(property)) return match[1];
  }
  return '';
}

test('base stylesheet avoids decorative gradients', () => {
  assert.doesNotMatch(css, /(linear|radial)-gradient/);
});
