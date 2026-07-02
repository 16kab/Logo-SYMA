import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPaletteTabs, renderSwatches } from '../js/palette-controls.js';

function createFakeElement() {
  const classes = new Set();
  return {
    children: [],
    attributes: {},
    style: {},
    textContent: '',
    type: '',
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
    createElement: () => createFakeElement(),
  };
  try {
    run();
  } finally {
    globalThis.document = originalDocument;
  }
}

test('renderPaletteTabs adds accessible pressed state and labels', () => {
  withFakeDocument(() => {
    const container = createFakeElement();
    renderPaletteTabs(container, 'palette1', () => {});

    assert.equal(container.children[0].getAttribute('aria-pressed'), 'true');
    assert.equal(container.children[0].getAttribute('aria-label'), 'Choisir Palette 1');
    assert.equal(container.children[1].getAttribute('aria-pressed'), 'false');
    assert.equal(container.children[1].getAttribute('aria-label'), 'Choisir Palette 2');
  });
});

test('renderSwatches names each color by its control role', () => {
  withFakeDocument(() => {
    const container = createFakeElement();
    renderSwatches(container, 'palette1', '#18233f', () => {}, 'Fond');

    assert.equal(container.children[0].getAttribute('aria-label'), 'Fond #18233f');
    assert.equal(container.children[0].getAttribute('aria-pressed'), 'true');
    assert.equal(container.children[1].getAttribute('aria-label'), 'Fond #788ce3');
    assert.equal(container.children[1].getAttribute('aria-pressed'), 'false');
  });
});
