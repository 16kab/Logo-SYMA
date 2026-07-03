import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('base stylesheet avoids decorative gradients', () => {
  assert.doesNotMatch(css, /(linear|radial)-gradient/);
});
