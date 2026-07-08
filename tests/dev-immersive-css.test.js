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

test('index enables the immersive dark theme by default', () => {
  assert.match(index, /<body[^>]*class="dev-immersive"/);
  assert.match(index, /data-experience="immersive-gallery"/);
});

test('index includes final choice and iconography roots', () => {
  assert.match(index, /id="final-choice-root"/);
  assert.match(index, /id="final-choice-action-root"/);
  assert.match(index, /id="iconography-root"/);
  assert.doesNotMatch(index, /class="iconography-empty"/);
});

test('dev immersive stylesheet is scoped to the local theme class', () => {
  assert.match(css, /\.dev-immersive\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.comparator-panel/);
  assert.match(css, /\.dev-immersive\s+\.vote-palette-card/);
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

test('dev immersive gradients are reserved for the submission panel accent', () => {
  const withoutSubmissionPanel = css.replace(/\.dev-immersive [^{}]*submission-bar[^{}]*\{[^}]*\}/g, '');
  assert.doesNotMatch(withoutSubmissionPanel, /linear-gradient/);
  assert.match(css, /--accent:\s*#b8c2d6/);
  assert.doesNotMatch(css, /#d6b46d|#e4c985|#b79046|#dcc18a/);
});

test('immersive theme styles the drag-and-drop ranking list', () => {
  assert.match(css, /\.dev-immersive\s+\.ranking-list\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.ranking-row\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.ranking-row__handle\s*\{/);
});

test('immersive theme styles the submission bar', () => {
  assert.match(css, /\.dev-immersive\s+\.submission-bar\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.submission-bar\.is-visible\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.submission-bar__send\s*\{/);
});

test('immersive theme styles tabs, final choice, modal, and iconography state', () => {
  assert.match(css, /\.dev-immersive\s+\.page-tabs\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.final-choice-section\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.final-choice-modal\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.iconography-section\s*\{/);
  assert.match(css, /body\.dev-immersive\[data-active-tab="iconography"\]\s+#submission-bar-root/);
});

test('immersive theme styles the iconography grid, states, requests, and feedback modal', () => {
  assert.match(css, /\.dev-immersive\s+\.iconography-grid\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.iconography-card\.is-approved/);
  assert.match(css, /\.dev-immersive\s+\.iconography-card\.is-rejected/);
  assert.match(css, /\.dev-immersive\s+\.iconography-feedback-modal\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.iconography-requests\s*\{/);
});
