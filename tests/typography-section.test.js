import test from 'node:test';
import assert from 'node:assert/strict';
import { createTypographySection } from '../js/typography-section.js';

function createFakeElement(tagName = 'div') {
  let inner = '';
  const listeners = {};
  const classes = new Set();
  const element = {
    tagName,
    children: [],
    attributes: {},
    dataset: {},
    style: {},
    hidden: false,
    value: '',
    textContent: '',
    className: '',
    type: '',
    listeners,
    classList: {
      add(name) {
        classes.add(name);
        syncClassName(element, classes);
      },
      remove(name) {
        classes.delete(name);
        syncClassName(element, classes);
      },
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
        syncClassName(element, classes);
      },
      contains(name) {
        return classes.has(name) || element.className.split(/\s+/).includes(name);
      },
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
      if (name.startsWith('data-')) {
        this.dataset[dataName(name)] = value;
      }
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    },
    dispatchEvent(event) {
      return this.listeners[event.type]?.(event);
    },
    querySelector(selector) {
      return findAll(this, selector)[0] || null;
    },
    querySelectorAll(selector) {
      return findAll(this, selector);
    },
    set innerHTML(value) {
      inner = value;
      this.children = [];
    },
    get innerHTML() {
      return inner;
    },
  };
  return element;
}

function dataName(attribute) {
  return attribute
    .replace(/^data-/, '')
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function syncClassName(element, classes) {
  const explicit = element.className.split(/\s+/).filter(Boolean);
  element.className = [...new Set([...explicit, ...classes])].join(' ');
}

function matches(element, selector) {
  if (selector.startsWith('.')) {
    return element.className.split(/\s+/).includes(selector.slice(1));
  }

  const dataRoleMatch = selector.match(/^\[data-role="([^"]+)"\]$/);
  if (dataRoleMatch) {
    return element.getAttribute?.('data-role') === dataRoleMatch[1];
  }

  if (/^[a-z][a-z0-9-]*$/i.test(selector)) {
    return element.tagName?.toLowerCase() === selector.toLowerCase();
  }

  return false;
}

function findAll(element, selector) {
  const matchesList = [];
  for (const child of element.children) {
    if (matches(child, selector)) matchesList.push(child);
    matchesList.push(...findAll(child, selector));
  }
  return matchesList;
}

function collectText(element) {
  return [element.textContent, ...element.children.map(collectText)].filter(Boolean).join(' ');
}

async function withFakeDocument(run) {
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: createFakeElement };
  try {
    return await run();
  } finally {
    globalThis.document = originalDocument;
  }
}

test('renders typography selectors and applies saved fonts to the live preview', async () => {
  await withFakeDocument(async () => {
    const root = createFakeElement();
    const section = createTypographySection({
      root,
      fetcher: async () => ({
        ok: true,
        async json() {
          return {
            typography: {
              headingFont: 'Syne',
              headingWeight: 600,
              bodyFont: 'Manrope',
              bodyWeight: 500,
              decorationFont: 'Grandstander',
              decorationWeight: 700,
              updatedAt: 123,
            },
          };
        },
      }),
    });

    await section.load();

    assert.match(collectText(root), /Typographies/);
    assert.equal(root.querySelector('[data-role="heading-font"]').value, 'Syne');
    assert.equal(root.querySelector('[data-role="heading-weight"]').value, '600');
    assert.equal(root.querySelector('[data-role="body-font"]').value, 'Manrope');
    assert.equal(root.querySelector('[data-role="body-weight"]').value, '500');
    assert.equal(root.querySelector('[data-role="decoration-font"]').value, 'Grandstander');
    assert.equal(root.querySelector('[data-role="decoration-weight"]').value, '700');
    assert.equal(root.querySelector('[data-role="preview-heading"]').style.fontFamily, '"Syne", sans-serif');
    assert.equal(root.querySelector('[data-role="preview-heading"]').style.fontWeight, '600');
    assert.equal(root.querySelector('[data-role="preview-body"]').style.fontFamily, '"Manrope", sans-serif');
    assert.equal(root.querySelector('[data-role="preview-body"]').style.fontWeight, '500');
    assert.equal(root.querySelector('[data-role="preview-decoration"]').style.fontFamily, '"Grandstander", sans-serif');
    assert.equal(root.querySelector('[data-role="preview-decoration"]').style.fontWeight, '700');
    assert.equal(root.querySelector('[data-role="preview-decoration"]').hidden, false);
    assert.ok(root.querySelector('.typography-preview__canvas'));
    assert.equal(root.querySelectorAll('.typography-preview__font-pill').length, 3);
  });
});

test('changing typography updates the preview and persists the shared selection', async () => {
  await withFakeDocument(async () => {
    const root = createFakeElement();
    const payloads = [];
    const section = createTypographySection({
      root,
      fetcher: async (path, options = {}) => {
        if (options.method === 'POST') {
          payloads.push(JSON.parse(options.body));
          return {
            ok: true,
            async json() {
              return {
                typography: {
                  headingFont: 'Fredoka',
                  headingWeight: 600,
                  bodyFont: 'Quicksand',
                  bodyWeight: 400,
                  decorationFont: null,
                  decorationWeight: 600,
                  updatedAt: 456,
                },
              };
            },
          };
        }
        return {
          ok: true,
          async json() {
            return {
              typography: {
                headingFont: 'Outfit',
                headingWeight: 700,
                bodyFont: 'Quicksand',
                bodyWeight: 400,
                decorationFont: null,
                decorationWeight: 600,
              },
            };
          },
        };
      },
    });

    await section.load();
    const headingSelect = root.querySelector('[data-role="heading-font"]');
    headingSelect.value = 'Fredoka';
    const headingWeight = root.querySelector('[data-role="heading-weight"]');
    headingWeight.value = '600';
    await headingSelect.dispatchEvent({ type: 'change' });

    assert.deepEqual(payloads, [{
      headingFont: 'Fredoka',
      headingWeight: 600,
      bodyFont: 'Quicksand',
      bodyWeight: 400,
      decorationFont: null,
      decorationWeight: 600,
    }]);
    assert.equal(root.querySelector('[data-role="preview-heading"]').style.fontFamily, '"Fredoka", sans-serif');
    assert.equal(root.querySelector('[data-role="preview-heading"]').style.fontWeight, '600');
    assert.equal(root.querySelector('[data-role="preview-decoration"]').hidden, true);
  });
});
