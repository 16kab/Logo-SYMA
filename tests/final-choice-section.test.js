import test from 'node:test';
import assert from 'node:assert/strict';
import { createFinalChoiceSection } from '../js/final-choice-section.js';

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
    src: '',
    alt: '',
    loading: '',
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

  const roleMatch = selector.match(/^\[data-role="([^"]+)"\]$/);
  if (roleMatch) {
    return element.getAttribute?.('data-role') === roleMatch[1];
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

function createStorage(name = null) {
  const values = new Map(name ? [['syma_visitor_name', name]] : []);
  return {
    getItem(key) {
      return values.get(key) || null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    values,
  };
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

test('renders only the validate button when no final choice exists', async () => {
  await withFakeDocument(async () => {
    const root = createFakeElement();
    const actionRoot = createFakeElement();
    const section = createFinalChoiceSection({
      root,
      actionRoot,
      fetcher: async () => ({ ok: true, async json() { return { finalChoice: null }; } }),
      storage: createStorage(),
      loadSvg: createSvgLoader(),
    });

    await section.load();

    assert.equal(root.children.length, 0);
    assert.match(collectText(actionRoot), /Valider notre choix/);
  });
});

test('renders the global final choice section with edit action and variants', async () => {
  await withFakeDocument(async () => {
    const root = createFakeElement();
    const actionRoot = createFakeElement();
    const section = createFinalChoiceSection({
      root,
      actionRoot,
      fetcher: async () => ({
        ok: true,
        async json() {
          return {
            finalChoice: {
              logoId: 'logo1',
              paletteKey: 'palette1',
              bgColor: '#18233f',
              logoColor: '#ffffff',
              name: 'Alexis',
              updatedAt: 123,
            },
          };
        },
      }),
      storage: createStorage('Alexis'),
      loadSvg: createSvgLoader(),
    });

    await section.load();

    const text = collectText(root);
    assert.match(text, /Choix final/);
    assert.match(text, /Direction retenue/);
    assert.match(text, /Modifier/);
    assert.match(text, /Noir sur blanc/);
    assert.match(text, /Blanc sur noir/);
  });
});

test('submits a complete modal draft and renders the saved final choice', async () => {
  await withFakeDocument(async ({ body }) => {
    const root = createFakeElement();
    const actionRoot = createFakeElement();
    const storage = createStorage('Alexis');
    let postedBody = null;

    const section = createFinalChoiceSection({
      root,
      actionRoot,
      fetcher: async (path, options = {}) => {
        if (path === '/api/final-choice' && options.method === 'POST') {
          postedBody = JSON.parse(options.body);
          return {
            ok: true,
            async json() {
              return { status: 'saved', finalChoice: { ...postedBody, updatedAt: 456 } };
            },
          };
        }

        return { ok: true, async json() { return { finalChoice: null }; } };
      },
      storage,
      loadSvg: createSvgLoader(),
    });

    await section.load();
    await section.openModal(null);

    const modal = body.querySelector('.final-choice-modal');
    assert.equal(modal.hidden, false);
    assert.match(collectText(modal), /Selectionnez une palette, un logo et deux couleurs/);

    await modal.querySelectorAll('.palette-tab')[0].click();
    await modal.querySelectorAll('.thumb-button')[0].click();
    await modal.querySelector('[data-role="bg-swatches"]').querySelectorAll('.swatch')[0].click();
    await modal.querySelector('[data-role="logo-swatches"]').querySelectorAll('.swatch')[1].click();
    await modal.querySelector('[data-role="submit"]').click();

    assert.deepEqual(postedBody, {
      logoId: 'logo1',
      paletteKey: 'palette1',
      bgColor: '#18233f',
      logoColor: '#788ce3',
      name: 'Alexis',
    });
    assert.equal(storage.getItem('syma_visitor_name'), 'Alexis');
    assert.match(collectText(root), /Choix final/);
    assert.match(collectText(root), /Modifier/);
  });
});
