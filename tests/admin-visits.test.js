import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisitAnalyticsCard, formatDuration } from '../js/admin-visits.js';

function createFakeElement(tagName = 'div') {
  return {
    tagName,
    attributes: {},
    className: '',
    children: [],
    style: {},
    textContent: '',
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    querySelector(selector) {
      if (selector.startsWith('.')) {
        return findByClass(this, selector.slice(1))[0] || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector.startsWith('.')) {
        return findByClass(this, selector.slice(1));
      }
      return [];
    },
  };
}

function findByClass(element, className) {
  const matches = [];
  for (const child of element.children) {
    const classNames = String(child.className || '').split(/\s+/).filter(Boolean);
    if (classNames.includes(className)) matches.push(child);
    matches.push(...findByClass(child, className));
  }
  return matches;
}

function collectText(element) {
  return [element.textContent, ...element.children.map(collectText)].filter(Boolean).join(' ');
}

const fakeDocument = { createElement: createFakeElement };

test('formatDuration formats seconds and minutes', () => {
  assert.equal(formatDuration(0), '0 s');
  assert.equal(formatDuration(42000), '42 s');
  assert.equal(formatDuration(125000), '2 min 5 s');
});

test('createVisitAnalyticsCard renders metrics and a labelled chart', () => {
  const card = createVisitAnalyticsCard({
    summary: {
      totalVisits: 12,
      averageDurationMs: 42000,
      activeNow: 2,
    },
    daily: [
      { date: '2026-07-02', visits: 3, averageDurationMs: 30000 },
      { date: '2026-07-03', visits: 9, averageDurationMs: 60000 },
    ],
    recent: [],
  }, fakeDocument);

  const text = collectText(card);
  const chart = card.querySelector('.admin-visits-chart');
  const bars = card.querySelectorAll('.admin-visits-chart__bar');

  assert.equal(card.className, 'admin-card admin-visits-card');
  assert.match(text, /Visites du site/);
  assert.match(text, /12 visites/);
  assert.match(text, /42 s/);
  assert.match(text, /2 actives/);
  assert.equal(chart.getAttribute('role'), 'img');
  assert.match(chart.getAttribute('aria-label'), /Visites anonymes par jour/);
  assert.equal(bars.length, 2);
  assert.equal(bars[1].style.height, '100%');
});

test('createVisitAnalyticsCard renders an empty state without visits', () => {
  const card = createVisitAnalyticsCard({
    summary: {
      totalVisits: 0,
      averageDurationMs: 0,
      activeNow: 0,
    },
    daily: [],
    recent: [],
  }, fakeDocument);

  assert.match(collectText(card), /Aucune visite enregistree/);
});
