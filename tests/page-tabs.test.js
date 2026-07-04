import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPageTabs } from '../js/page-tabs.js';

function createElement(id) {
  return {
    id,
    hidden: false,
    attributes: {},
    listeners: {},
    dataset: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    },
    click() {
      this.listeners.click?.({ preventDefault() {} });
    },
  };
}

test('index defines accessible logo and iconography tabs', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(index, /role="tablist"/);
  assert.match(index, /id="tab-logo-palette"/);
  assert.match(index, /id="tab-iconographie"/);
  assert.match(index, /id="tabpanel-logo-palette"/);
  assert.match(index, /id="tabpanel-iconographie"/);
  assert.match(index, /Iconographie/);
});

test('createPageTabs activates requested panel and updates body dataset', () => {
  const logoTab = createElement('tab-logo-palette');
  logoTab.dataset.tabTarget = 'tabpanel-logo-palette';
  logoTab.dataset.tabName = 'logo';
  const iconTab = createElement('tab-iconographie');
  iconTab.dataset.tabTarget = 'tabpanel-iconographie';
  iconTab.dataset.tabName = 'iconography';
  const logoPanel = createElement('tabpanel-logo-palette');
  const iconPanel = createElement('tabpanel-iconographie');
  const body = { dataset: {} };

  createPageTabs({
    tabs: [logoTab, iconTab],
    panels: [logoPanel, iconPanel],
    body,
  });

  assert.equal(logoTab.getAttribute('aria-selected'), 'true');
  assert.equal(iconPanel.hidden, true);
  assert.equal(body.dataset.activeTab, 'logo');

  iconTab.click();

  assert.equal(logoTab.getAttribute('aria-selected'), 'false');
  assert.equal(iconTab.getAttribute('aria-selected'), 'true');
  assert.equal(logoPanel.hidden, true);
  assert.equal(iconPanel.hidden, false);
  assert.equal(body.dataset.activeTab, 'iconography');
});
