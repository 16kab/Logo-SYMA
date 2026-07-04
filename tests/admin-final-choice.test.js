import test from 'node:test';
import assert from 'node:assert/strict';
import { createFinalChoiceAdminCard } from '../js/admin-final-choice.js';

function createFakeElement(tagName = 'div') {
  let inner = '';
  return {
    tagName,
    children: [],
    className: '',
    textContent: '',
    style: {},
    src: '',
    alt: '',
    loading: '',
    appendChild(child) {
      this.children.push(child);
      return child;
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
    },
    get innerHTML() {
      return inner;
    },
  };
}

function collectText(element) {
  return [element.textContent, ...element.children.map(collectText)].filter(Boolean).join(' ');
}

test('admin card shows an empty state without final choice', () => {
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: createFakeElement };
  try {
    const card = createFinalChoiceAdminCard({ finalChoice: null });
    assert.match(collectText(card), /Choix final/);
    assert.match(collectText(card), /Aucun choix final valide/);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('admin card shows logo, palette, colors, name and date', () => {
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: createFakeElement };
  try {
    const card = createFinalChoiceAdminCard({
      finalChoice: {
        logoId: 'logo2',
        paletteKey: 'palette1',
        bgColor: '#18233f',
        logoColor: '#ffffff',
        name: 'Alexis',
        updatedAt: Date.UTC(2026, 6, 3, 10, 30),
      },
    });

    const text = collectText(card);
    assert.match(text, /Choix final/);
    assert.match(text, /Logo 2/);
    assert.match(text, /Palette 1/);
    assert.match(text, /#18233f/);
    assert.match(text, /#ffffff/);
    assert.match(text, /Alexis/);
    assert.equal(card.children.some((child) => child.className === 'admin-final-choice'), true);
  } finally {
    globalThis.document = originalDocument;
  }
});
