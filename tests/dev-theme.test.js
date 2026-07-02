import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { activateDevTheme, isDevHost } from '../js/dev-theme.js';

test('isDevHost only accepts local development hosts', () => {
  assert.equal(isDevHost('localhost'), true);
  assert.equal(isDevHost('127.0.0.1'), true);
  assert.equal(isDevHost('::1'), true);
  assert.equal(isDevHost('logo-syma.vercel.app'), false);
  assert.equal(isDevHost('example.com'), false);
});

test('activateDevTheme adds the immersive class only in local development', () => {
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

  assert.equal(activateDevTheme({ document, location: { hostname: 'localhost' } }), true);
  assert.equal(classList.has('dev-immersive'), true);
  assert.equal(document.body.dataset.experience, 'immersive-gallery');
});

test('activateDevTheme leaves production hosts untouched', () => {
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

  assert.equal(activateDevTheme({ document, location: { hostname: 'logo-syma.vercel.app' } }), false);
  assert.equal(classList.has('dev-immersive'), false);
  assert.equal(document.body.dataset.experience, undefined);
});

test('main activates the dev-only immersive theme', () => {
  const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

  assert.match(main, /activateDevTheme/);
});
