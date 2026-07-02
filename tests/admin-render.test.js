import test from 'node:test';
import assert from 'node:assert/strict';

function createFakeElement(tagName = 'div') {
  let inner = '';
  return {
    tagName,
    className: '',
    children: [],
    textContent: '',
    appendChild(child) {
      this.children.push(child);
    },
    querySelector(selector) {
      if (selector === '.admin-list') {
        return this.children.find((child) => child.className === 'admin-list') || null;
      }
      return null;
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

test('renderVotes shows individual admin votes without average ranking', async () => {
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
        logo1: { averageRank: 1, voteCount: 1 },
      },
      voters: [{
        name: 'Alexis',
        paletteKey: 'palette1',
        ranking: { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5, logo6: 6 },
        ts: 1782986400000,
      }],
    });
  } finally {
    globalThis.document = originalDocument;
  }

  const text = collectText(container);
  assert.match(text, /Votes individuels/);
  assert.match(text, /Alexis/);
  assert.match(text, /1\. Logo 1/);
  assert.doesNotMatch(text, /Classement moyen/);
  assert.doesNotMatch(text, /moyenne/);
});
