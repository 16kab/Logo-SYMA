import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

function cssBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's'))?.[1] || '';
}

test('base stylesheet avoids decorative gradients', () => {
  assert.doesNotMatch(css, /(linear|radial)-gradient/);
});

test('iconography decision controls use full-width actions and link-style edit', () => {
  const cardBlock = cssBlock('.iconography-card');
  const actionsBlock = cssBlock('.iconography-card__actions');
  const iconButtonBlock = cssBlock('.iconography-card__icon-action');
  const editBlock = cssBlock('.iconography-card__secondary');
  const stateBlock = cssBlock('.iconography-card__state');
  const titleBlock = cssBlock('.iconography-card__title,\n.iconography-request-card__title');

  assert.match(cardBlock, /position:\s*relative/);
  assert.match(titleBlock, /white-space:\s*nowrap/);
  assert.match(titleBlock, /overflow:\s*hidden/);
  assert.match(titleBlock, /text-overflow:\s*ellipsis/);
  assert.match(actionsBlock, /display:\s*grid/);
  assert.match(actionsBlock, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(iconButtonBlock, /width:\s*100%/);
  assert.match(editBlock, /border:\s*none/);
  assert.match(editBlock, /background:\s*transparent/);
  assert.match(editBlock, /text-decoration:\s*underline/);
  assert.match(editBlock, /font-size:\s*0\.72rem/);
  assert.match(editBlock, /font-weight:\s*500/);
  assert.match(stateBlock, /position:\s*absolute/);
  assert.match(stateBlock, /top:\s*0\.55rem/);
  assert.match(stateBlock, /right:\s*0\.55rem/);
  assert.match(stateBlock, /border-radius:\s*999px/);
  assert.match(stateBlock, /padding:\s*0\.16rem\s+0\.42rem/);
  assert.match(stateBlock, /font-size:\s*0\.58rem/);
});

test('typography dropdown options stay readable in native select popups', () => {
  const optionBlock = cssBlock('.typography-field__select option');

  assert.match(optionBlock, /background:\s*#ffffff/);
  assert.match(optionBlock, /color:\s*#18233f/);
});
