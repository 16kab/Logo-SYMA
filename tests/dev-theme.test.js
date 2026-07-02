import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { activateDevTheme } from '../js/dev-theme.js';

test('activateDevTheme adds the immersive class in production too', () => {
  const classList = new Set();
  const document = {
    body: {
      classList: {
        add(name) {
          classList.add(name);
        },
      },
      dataset: {},
    },
  };

  assert.equal(activateDevTheme({ document, location: { hostname: 'logo-syma.vercel.app' } }), true);
  assert.equal(classList.has('dev-immersive'), true);
  assert.equal(document.body.dataset.experience, 'immersive-gallery');
});

test('main activates the immersive theme', () => {
  const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

  assert.match(main, /activateDevTheme/);
});
