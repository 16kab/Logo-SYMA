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

test('logo ranking vote grid is fixed to three columns on desktop', () => {
  const block = cssBlock('.ranking-grid');

  assert.match(block, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
});

test('feedback form spans the full content width', () => {
  const block = cssBlockContaining('#feedback-form', 'display: grid');

  assert.match(block, /width:\s*100%/);
  assert.doesNotMatch(block, /max-width:\s*640px/);
});
