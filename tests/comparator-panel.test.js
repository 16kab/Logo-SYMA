import test from 'node:test';
import assert from 'node:assert/strict';
import { createComparatorPanelMarkup, renderLogoThumbs } from '../js/comparator-panel.js';

function createFakeElement(tagName = 'div') {
  const classes = new Set();

  return {
    tagName,
    children: [],
    attributes: {},
    style: {},
    textContent: '',
    title: '',
    type: '',
    src: '',
    alt: '',
    loading: '',
    className: '',
    innerHTML: '',
    classList: {
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      },
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    addEventListener() {},
    appendChild(child) {
      this.children.push(child);
    },
  };
}

function withFakeDocument(run) {
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: (tagName) => createFakeElement(tagName),
  };
  try {
    run();
  } finally {
    globalThis.document = originalDocument;
  }
}

test('comparator panel markup labels background and logo color controls', () => {
  const markup = createComparatorPanelMarkup();

  assert.match(markup, /data-role="bg-swatches"/);
  assert.match(markup, /data-role="logo-swatches"/);
  assert.match(markup, />Fond</);
  assert.match(markup, />Logo</);
});

test('renderLogoThumbs shows logo images instead of visible logo numbers', () => {
  withFakeDocument(() => {
    const container = createFakeElement();

    renderLogoThumbs(container, 'logo2', () => {});

    assert.equal(container.children.length, 7);
    assert.equal(container.children[0].textContent, '');
    assert.equal(container.children[0].getAttribute('aria-label'), 'Choisir Logo 1');
    assert.equal(container.children[0].children[0].src, 'SVG/FAT.svg');
    assert.equal(container.children[0].children[0].alt, '');
    assert.equal(container.children[0].children[0].getAttribute('aria-hidden'), 'true');
    assert.equal(container.children[1].getAttribute('aria-pressed'), 'true');
    assert.equal(container.children[6].getAttribute('aria-label'), 'Choisir Logo 7');
    assert.equal(container.children[6].children[0].src, 'SVG/Logo fluid.svg');
  });
});
