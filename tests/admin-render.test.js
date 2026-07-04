import test from 'node:test';
import assert from 'node:assert/strict';

function createFakeElement(tagName = 'div') {
  let inner = '';
  const classes = new Set();
  return {
    tagName,
    attributes: {},
    className: '',
    children: [],
    style: {},
    textContent: '',
    src: '',
    alt: '',
    loading: '',
    classList: {
      add(name) {
        classes.add(name);
      },
      contains(name) {
        return classes.has(name);
      },
    },
    appendChild(child) {
      this.children.push(child);
    },
    addEventListener() {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    querySelector(selector) {
      if (selector === '.admin-list') {
        return this.children.find((child) => child.className === 'admin-list') || null;
      }
      if (selector.startsWith('.')) {
        const className = selector.slice(1);
        return findByClass(this, className)[0] || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector.startsWith('.')) {
        return findByClass(this, selector.slice(1));
      }
      return [];
    },
    set innerHTML(value) {
      inner = value;
      this.children = [];

      const heading = value.match(/<h3>(.*?)<\/h3>/);
      if (heading) {
        const h3 = createFakeElement('h3');
        h3.textContent = heading[1];
        this.appendChild(h3);
      }

      if (value.includes('admin-list')) {
        const list = createFakeElement('ul');
        list.className = 'admin-list';
        this.appendChild(list);
      }
    },
    get innerHTML() {
      return inner;
    },
  };
}

function findByClass(element, className) {
  const matches = [];
  for (const child of element.children) {
    const classNames = String(child.className || '').split(/\s+/).filter(Boolean);
    if (classNames.includes(className) || child.classList?.contains(className)) {
      matches.push(child);
    }
    matches.push(...findByClass(child, className));
  }
  return matches;
}

function collectText(element) {
  return [element.textContent, ...element.children.map(collectText)].filter(Boolean).join(' ');
}

async function loadAdminModule() {
  const originalDocument = globalThis.document;
  globalThis.document = { addEventListener() {} };
  try {
    return await import(`../js/admin.js?admin-render=${Date.now()}`);
  } finally {
    globalThis.document = originalDocument;
  }
}

async function loadAdminModuleWithDom(document) {
  const originalDocument = globalThis.document;
  globalThis.document = document;
  try {
    await import(`../js/admin.js?admin-render=${Date.now()}`);
  } finally {
    globalThis.document = originalDocument;
  }
}

function createAdminDocument(elements) {
  return {
    createElement: createFakeElement,
    getElementById(id) {
      return elements[id] || null;
    },
    addEventListener(eventName, callback) {
      if (eventName === 'DOMContentLoaded') {
        callback();
      }
    },
  };
}

async function flushAsyncDashboardLoad() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('renderVotes shows a visual logo ranking ordered by ascending average rank', async () => {
  const { renderVotes } = await loadAdminModule();
  const container = createFakeElement();
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: createFakeElement,
    getElementById(id) {
      return id === 'votes-summary' ? container : null;
    },
  };

  try {
    renderVotes({
      palettes: { palette1: 1, palette2: 0 },
      logos: {
        logo1: { averageRank: 2.5, voteCount: 2 },
        logo2: { averageRank: 1.25, voteCount: 2 },
        logo3: { averageRank: null, voteCount: 0 },
        logo7: { averageRank: 1.1, voteCount: 2 },
      },
      voters: [],
    });
  } finally {
    globalThis.document = originalDocument;
  }

  const text = collectText(container);
  const cards = container.querySelectorAll('.admin-logo-ranking__item');
  assert.equal(cards.length, 7);
  assert.match(text, /Classement des logos/);
  assert.equal(cards[0].getAttribute('data-logo-id'), 'logo7');
  assert.equal(cards[1].getAttribute('data-logo-id'), 'logo2');
  assert.equal(cards[2].getAttribute('data-logo-id'), 'logo1');
  assert.equal(cards.at(-1).getAttribute('data-logo-id'), 'logo6');
  assert.equal(cards[0].querySelector('.admin-logo-ranking__image').src, 'SVG/Logo fluid.svg');
  assert.equal(cards[0].querySelector('.admin-logo-ranking__image').alt, 'Logo 7');
  assert.match(text, /Moyenne 1\.10/);
  assert.match(text, /2 votes/);
  assert.doesNotMatch(text, /Votes individuels/);
});

test('renderVotes shows visual palettes and each voter logo ranking with images', async () => {
  const { renderVotes } = await loadAdminModule();
  const container = createFakeElement();
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: createFakeElement,
    getElementById(id) {
      return id === 'votes-summary' ? container : null;
    },
  };

  try {
    renderVotes({
      palettes: { palette1: 1, palette2: 1 },
      logos: {
        logo1: { averageRank: 2, voteCount: 2 },
        logo2: { averageRank: 1, voteCount: 2 },
      },
      voters: [
        {
          visitorId: 'v1',
          name: 'Alexis',
          paletteKey: 'palette2',
          ranking: {
            logo1: 2,
            logo2: 1,
            logo3: 3,
            logo4: 4,
            logo5: 5,
            logo6: 6,
            logo7: 7,
          },
          ts: 12345,
        },
      ],
    });
  } finally {
    globalThis.document = originalDocument;
  }

  const text = collectText(container);
  const paletteCards = container.querySelectorAll('.admin-palette-card');
  const voterCards = container.querySelectorAll('.admin-voter-card');
  const singleLineLists = container.querySelectorAll('.admin-logo-ranking--single-line');
  const voterLogoItems = voterCards[0].querySelectorAll('.admin-logo-ranking__item');

  assert.equal(paletteCards.length, 2);
  assert.equal(paletteCards[0].querySelectorAll('.admin-palette-preview__swatch').length, 7);
  assert.match(text, /Votes par personne/);
  assert.match(text, /Alexis/);
  assert.match(text, /Palette 2/);
  assert.equal(voterCards.length, 1);
  assert.equal(singleLineLists.length, 2);
  assert.equal(voterLogoItems.length, 7);
  assert.equal(voterLogoItems[0].getAttribute('data-logo-id'), 'logo2');
  assert.equal(voterLogoItems[0].querySelector('.admin-logo-ranking__image').src, 'SVG/Goofy.svg');
  assert.equal(voterLogoItems[0].querySelector('.admin-logo-ranking__image').alt, 'Logo 2');
  assert.equal(voterLogoItems.at(-1).getAttribute('data-logo-id'), 'logo7');
  assert.equal(voterLogoItems.at(-1).querySelector('.admin-logo-ranking__image').src, 'SVG/Logo fluid.svg');
});

test('renderVotes shows a voter message when present', async () => {
  const { renderVotes } = await loadAdminModule();
  const container = createFakeElement();
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: createFakeElement,
    getElementById(id) {
      return id === 'votes-summary' ? container : null;
    },
  };

  try {
    renderVotes({
      palettes: { palette1: 1, palette2: 0 },
      logos: {},
      voters: [{
        name: 'Marie',
        paletteKey: 'palette1',
        ranking: { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5, logo6: 6, logo7: 7 },
        message: "J'adore le logo 3",
        ts: 1,
      }],
    });
  } finally {
    globalThis.document = originalDocument;
  }

  const text = collectText(container);
  assert.match(text, /J'adore le logo 3/);
});

test('renderDashboard prepends final choice and visit analytics before vote summaries', async () => {
  const { renderDashboard } = await loadAdminModule();
  const container = createFakeElement();
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: createFakeElement,
    getElementById(id) {
      return id === 'votes-summary' ? container : null;
    },
  };

  try {
    renderDashboard({
      finalChoiceData: { finalChoice: null },
      visitsData: {
        summary: { totalVisits: 3, averageDurationMs: 30000, activeNow: 1 },
        daily: [{ date: '2026-07-03', visits: 3, averageDurationMs: 30000 }],
        recent: [],
      },
      votesData: {
        palettes: { palette1: 1, palette2: 0 },
        logos: {},
        voters: [],
      },
    });
  } finally {
    globalThis.document = originalDocument;
  }

  const text = collectText(container);
  assert.match(text, /Choix final/);
  assert.match(text, /Visites du site/);
  assert.match(text, /3 visites/);
  assert.match(text, /Palettes préférées/);
  assert.equal(container.children[0].className, 'admin-card admin-final-choice-card');
  assert.equal(container.children[1].className, 'admin-card admin-visits-card');
});

test('dashboard still renders votes when visit analytics request fails', async () => {
  const elements = {
    'login-section': createFakeElement('section'),
    'dashboard-section': createFakeElement('section'),
    'login-status': createFakeElement('p'),
    'votes-summary': createFakeElement('div'),
    'login-form': createFakeElement('form'),
    'admin-password': createFakeElement('input'),
  };
  const document = createAdminDocument(elements);
  const originalFetch = globalThis.fetch;
  const originalSessionStorage = globalThis.sessionStorage;
  globalThis.sessionStorage = {
    getItem(key) {
      return key === 'syma_admin_token' ? 'admin-token' : null;
    },
    setItem() {},
    removeItem() {},
  };
  globalThis.fetch = async (path) => {
    if (path === '/api/final-choice') {
      return {
        ok: true,
        status: 200,
        async json() {
          return { finalChoice: null };
        },
      };
    }

    if (path === '/api/votes') {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            palettes: { palette1: 1, palette2: 0 },
            logos: {
              logo1: { averageRank: 1, voteCount: 1 },
            },
            voters: [{
              name: 'Alexis',
              paletteKey: 'palette1',
              ranking: { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5, logo6: 6, logo7: 7 },
            }],
          };
        },
      };
    }

    assert.equal(path, '/api/visits');
    return {
      ok: false,
      status: 500,
      async json() {
        throw new Error('visits unavailable');
      },
    };
  };

  try {
    await loadAdminModuleWithDom(document);
    await flushAsyncDashboardLoad();
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.sessionStorage = originalSessionStorage;
  }

  const text = collectText(elements['votes-summary']);
  assert.equal(elements['login-section'].hidden, true);
  assert.equal(elements['dashboard-section'].hidden, false);
  assert.match(text, /Palettes préférées/);
  assert.match(text, /Alexis/);
  assert.doesNotMatch(text, /Visites du site/);
  assert.equal(elements['votes-summary'].querySelector('.admin-visits-card'), null);
});
