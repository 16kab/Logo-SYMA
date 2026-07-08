import test from 'node:test';
import assert from 'node:assert/strict';
import { createIconographySection } from '../js/iconography-section.js';

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
    name: '',
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
    click() {
      return this.listeners.click?.({ preventDefault() {} });
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

  const dataActionMatch = selector.match(/^\[data-action="([^"]+)"\]$/);
  if (dataActionMatch) {
    return element.getAttribute?.('data-action') === dataActionMatch[1];
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
  const body = createFakeElement('body');
  globalThis.document = {
    createElement: createFakeElement,
    body,
  };
  try {
    return await run({ body });
  } finally {
    globalThis.document = originalDocument;
  }
}

function createSvgLoader() {
  return async (url, container) => {
    const svg = createFakeElement('svg');
    svg.setAttribute('data-src', url);
    svg.querySelectorAll = () => [];
    container.appendChild(svg);
    return svg;
  };
}

test('renders iconography cards from the catalog and recolors each SVG', async () => {
  await withFakeDocument(async () => {
    const root = createFakeElement();
    const recolored = [];
    const section = createIconographySection({
      root,
      fetcher: async () => ({ ok: true, async json() { return { iconography: { items: {}, requests: [] } }; } }),
      loadSvg: createSvgLoader(),
      recolor: (svg, color) => recolored.push([svg.getAttribute('data-src'), color]),
    });

    await section.load();

    assert.match(collectText(root), /Sélection iconographique/);
    assert.equal(root.querySelectorAll('.iconography-card').length, 22);
    assert.equal(root.querySelectorAll('.iconography-card__decision').length, 22);
    assert.equal(recolored[0][0], 'SVG/iconographie/blobs.svg');
    assert.equal(recolored[0][1], '#18233f');
  });
});

test('approving an iconography item shows the global validated state and modifier action', async () => {
  await withFakeDocument(async () => {
    const root = createFakeElement();
    const section = createIconographySection({
      root,
      fetcher: async (path, options = {}) => {
        if (options.method === 'POST') {
          assert.deepEqual(JSON.parse(options.body), { action: 'approve', itemId: 'blobs' });
          return {
            ok: true,
            async json() {
              return {
                iconography: {
                  items: { blobs: { status: 'approved', feedback: '', updatedAt: 123 } },
                  requests: [],
                },
              };
            },
          };
        }
        return { ok: true, async json() { return { iconography: { items: {}, requests: [] } }; } };
      },
      loadSvg: createSvgLoader(),
    });

    await section.load();
    await root.querySelector('[data-action="approve"]').click();

    const firstCard = root.querySelector('.iconography-card');
    assert.match(firstCard.className, /is-approved/);
    assert.match(collectText(firstCard), /Validé/);
    assert.match(collectText(firstCard), /Modifier/);
  });
});

test('rejecting an iconography item saves feedback and exposes voir le retour', async () => {
  await withFakeDocument(async ({ body }) => {
    const root = createFakeElement();
    const section = createIconographySection({
      root,
      fetcher: async (path, options = {}) => {
        if (options.method === 'POST') {
          assert.deepEqual(JSON.parse(options.body), {
            action: 'reject',
            itemId: 'blobs',
            feedback: 'A simplifier',
          });
          return {
            ok: true,
            async json() {
              return {
                iconography: {
                  items: { blobs: { status: 'rejected', feedback: 'A simplifier', updatedAt: 456 } },
                  requests: [],
                },
              };
            },
          };
        }
        return { ok: true, async json() { return { iconography: { items: {}, requests: [] } }; } };
      },
      loadSvg: createSvgLoader(),
    });

    await section.load();
    await root.querySelector('[data-action="reject"]').click();
    const modal = body.querySelector('.iconography-feedback-modal');
    modal.querySelector('[data-role="feedback"]').value = 'A simplifier';
    await modal.querySelector('[data-role="submit-feedback"]').click();

    const firstCard = root.querySelector('.iconography-card');
    assert.match(firstCard.className, /is-rejected/);
    assert.match(collectText(firstCard), /Voir le retour/);
    assert.match(collectText(firstCard), /Modifier/);
  });
});

test('voir le retour reopens the saved feedback text', async () => {
  await withFakeDocument(async ({ body }) => {
    const root = createFakeElement();
    const section = createIconographySection({
      root,
      fetcher: async () => ({
        ok: true,
        async json() {
          return {
            iconography: {
              items: { blobs: { status: 'rejected', feedback: 'A simplifier', updatedAt: 456 } },
              requests: [],
            },
          };
        },
      }),
      loadSvg: createSvgLoader(),
    });

    await section.load();
    await root.querySelector('[data-action="view-feedback"]').click();

    const modal = body.querySelector('.iconography-feedback-modal');
    assert.equal(modal.hidden, false);
    assert.equal(modal.querySelector('[data-role="feedback"]').value, 'A simplifier');
  });
});

test('adding a free request appends a simple titled card', async () => {
  await withFakeDocument(async () => {
    const root = createFakeElement();
    const section = createIconographySection({
      root,
      fetcher: async (path, options = {}) => {
        if (options.method === 'POST') {
          assert.deepEqual(JSON.parse(options.body), { action: 'addRequest', title: 'Tasse vue face' });
          return {
            ok: true,
            async json() {
              return {
                iconography: {
                  items: {},
                  requests: [{ id: 'request-1', title: 'Tasse vue face', createdAt: 1 }],
                },
              };
            },
          };
        }
        return { ok: true, async json() { return { iconography: { items: {}, requests: [] } }; } };
      },
      loadSvg: createSvgLoader(),
    });

    await section.load();
    root.querySelector('[data-role="request-title"]').value = 'Tasse vue face';
    await root.querySelector('[data-role="add-request"]').click();

    assert.match(collectText(root), /Demandes ajoutées/);
    assert.match(collectText(root), /Tasse vue face/);
  });
});
