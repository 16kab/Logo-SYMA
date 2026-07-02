import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/dev-immersive.css', import.meta.url), 'utf8');
const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('index loads the dev-only immersive stylesheet after the base stylesheet', () => {
  assert.match(index, /css\/style\.css/);
  assert.match(index, /css\/dev-immersive\.css/);
  assert.ok(index.indexOf('css/style.css') < index.indexOf('css/dev-immersive.css'));
});

test('dev immersive stylesheet is scoped to the local theme class', () => {
  assert.match(css, /\.dev-immersive\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.comparator-panel/);
  assert.match(css, /\.dev-immersive\s+\.vote-palette-card/);
  assert.match(css, /\.dev-immersive\s+\.ranking-card/);
  assert.match(css, /\.dev-immersive\s+#feedback-form/);
});

test('dev immersive vote keeps the professional three-by-two logo gallery', () => {
  assert.match(css, /\.dev-immersive\s+\.ranking-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
});

test('dev immersive background uses a neutral charcoal direction instead of brown', () => {
  const block = css.match(/\.dev-immersive\s*\{([^}]*)\}/s)?.[1] || '';

  assert.match(block, /--page:\s*#0b0d10/);
  assert.doesNotMatch(block, /143,\s*61,\s*56/);
  assert.doesNotMatch(block, /#18130f/);
});

test('dev immersive headings are smaller and allowed to stay on one line', () => {
  const block = css.match(/\.dev-immersive \.section-heading h2,[\s\S]*?\.dev-immersive \.ranking-header h2\s*\{([^}]*)\}/s)?.[1] || '';

  assert.match(block, /max-width:\s*none/);
  assert.match(block, /font-size:\s*clamp\(1\.8rem,\s*2\.6vw,\s*3\.25rem\)/);
  assert.match(block, /line-height:\s*1\.05/);
});

test('dev immersive interface avoids gradients and replaces the old yellow accent', () => {
  assert.doesNotMatch(css, /linear-gradient/);
  assert.match(css, /--accent:\s*#b8c2d6/);
  assert.doesNotMatch(css, /#d6b46d|#e4c985|#b79046|#dcc18a/);
});

test('dev immersive rank picker uses custom premium dropdown styling', () => {
  assert.match(css, /\.dev-immersive\s+\.rank-picker\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.rank-picker__trigger\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.rank-picker__menu\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.rank-picker__option\s*\{/);
});
