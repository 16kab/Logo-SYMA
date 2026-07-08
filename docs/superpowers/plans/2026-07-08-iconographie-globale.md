# Iconographie Globale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared iconography validation screen with global approve/reject feedback and free client requests.

**Architecture:** Add a static iconography catalog for copied SVG assets, a small KV-backed API module for global state, and a browser UI module mounted in the existing `Iconographie` tab. The UI reads the global state, posts atomic actions, and rerenders cards from the server response.

**Tech Stack:** Plain HTML/CSS/ES modules, Node `http` dev server, Node test runner, existing memory KV abstraction.

---

## File Structure

- Create: `SVG/iconographie/*.svg`
  - Copied public iconography assets, renamed to ASCII-safe kebab filenames.
- Create: `js/iconography-items.js`
  - Static catalog of iconography ids, display titles, and SVG URLs.
- Create: `api/_lib/iconography.js`
  - Validation, sanitization, read and write helpers for global iconography state.
- Create: `api/iconography.js`
  - Public GET/POST handler for iconography state.
- Create: `js/iconography-section.js`
  - Public tab UI: grid, card states, feedback modal, and free requests.
- Modify: `dev-server.js`
  - Register `/api/iconography`.
- Modify: `index.html`
  - Replace the waiting empty state with `#iconography-root`.
- Modify: `js/main.js`
  - Import and mount `createIconographySection`.
- Modify: `css/style.css`
  - Base iconography layout styles.
- Modify: `css/dev-immersive.css`
  - Immersive dark theme styles for the iconography screen and modal.
- Test: `tests/iconography-items.test.js`
- Test: `tests/iconography.test.js`
- Test: `tests/api-iconography.test.js`
- Test: `tests/iconography-section.test.js`
- Modify tests: `tests/dev-immersive-css.test.js`

---

### Task 1: Copy Assets And Add Catalog

**Files:**
- Create: `SVG/iconographie/*.svg`
- Create: `js/iconography-items.js`
- Test: `tests/iconography-items.test.js`

- [ ] **Step 1: Write the failing catalog test**

Create `tests/iconography-items.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ICONOGRAPHY_ITEMS, ICONOGRAPHY_ITEM_IDS } from '../js/iconography-items.js';

const projectRoot = path.resolve(new URL('..', import.meta.url).pathname);

test('exposes the 22 copied iconography SVG assets', () => {
  assert.equal(ICONOGRAPHY_ITEMS.length, 22);
  assert.equal(ICONOGRAPHY_ITEM_IDS.length, 22);
  assert.deepEqual(ICONOGRAPHY_ITEMS[0], {
    id: 'blobs',
    title: 'Blobs',
    src: 'SVG/iconographie/blobs.svg',
  });
  assert.equal(ICONOGRAPHY_ITEMS.at(-1).id, 'sonia-tel');
});

test('iconography ids are unique and every SVG exists', () => {
  assert.equal(new Set(ICONOGRAPHY_ITEM_IDS).size, ICONOGRAPHY_ITEM_IDS.length);

  for (const item of ICONOGRAPHY_ITEMS) {
    assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(item.title.length > 0);
    assert.ok(item.src.startsWith('SVG/iconographie/'));
    assert.ok(existsSync(path.join(projectRoot, item.src)), `Missing iconography SVG: ${item.src}`);
  }
});
```

- [ ] **Step 2: Run the catalog test to verify it fails**

Run:

```bash
npm test -- tests/iconography-items.test.js
```

Expected: FAIL because `../js/iconography-items.js` does not exist.

- [ ] **Step 3: Copy the SVG files into the public project folder**

Run this PowerShell command from the worktree root:

```powershell
New-Item -ItemType Directory -Force -Path "SVG\iconographie" | Out-Null
$source = "C:\Users\alexis.kabiche\OneDrive - SPVIE\Bureau\Dossiers\Perso\Studio SYMA\SVG"
$files = @(
  @("Blobs.svg", "blobs.svg"),
  @("Bouquet.svg", "bouquet.svg"),
  @("café agité.svg", "cafe-agite.svg"),
  @("café vue haut.svg", "cafe-vue-haut.svg"),
  @("chaise.svg", "chaise.svg"),
  @("croissant.svg", "croissant.svg"),
  @("Etoiles.svg", "etoiles.svg"),
  @("fleurs.svg", "fleurs.svg"),
  @("Iphone 3_4.svg", "iphone-3-4.svg"),
  @("Iphone.svg", "iphone.svg"),
  @("Laptop 3_4.svg", "laptop-3-4.svg"),
  @("Laptop.svg", "laptop.svg"),
  @("main café.svg", "main-cafe.svg"),
  @("main machine.svg", "main-machine.svg"),
  @("P et S assises.svg", "p-et-s-assises.svg"),
  @("P et S plan large.svg", "p-et-s-plan-large.svg"),
  @("P et S.svg", "p-et-s.svg"),
  @("Perrine cc.svg", "perrine-cc.svg"),
  @("Perrine tel.svg", "perrine-tel.svg"),
  @("Pot de fleurs.svg", "pot-de-fleurs.svg"),
  @("Sonia cc.svg", "sonia-cc.svg"),
  @("Sonia tel.svg", "sonia-tel.svg")
)
foreach ($pair in $files) {
  Copy-Item -LiteralPath (Join-Path $source $pair[0]) -Destination (Join-Path "SVG\iconographie" $pair[1]) -Force
}
```

- [ ] **Step 4: Implement the catalog**

Create `js/iconography-items.js`:

```js
export const ICONOGRAPHY_ITEMS = [
  { id: 'blobs', title: 'Blobs', src: 'SVG/iconographie/blobs.svg' },
  { id: 'bouquet', title: 'Bouquet', src: 'SVG/iconographie/bouquet.svg' },
  { id: 'cafe-agite', title: 'Cafe agite', src: 'SVG/iconographie/cafe-agite.svg' },
  { id: 'cafe-vue-haut', title: 'Cafe vue haut', src: 'SVG/iconographie/cafe-vue-haut.svg' },
  { id: 'chaise', title: 'Chaise', src: 'SVG/iconographie/chaise.svg' },
  { id: 'croissant', title: 'Croissant', src: 'SVG/iconographie/croissant.svg' },
  { id: 'etoiles', title: 'Etoiles', src: 'SVG/iconographie/etoiles.svg' },
  { id: 'fleurs', title: 'Fleurs', src: 'SVG/iconographie/fleurs.svg' },
  { id: 'iphone-3-4', title: 'Iphone 3/4', src: 'SVG/iconographie/iphone-3-4.svg' },
  { id: 'iphone', title: 'Iphone', src: 'SVG/iconographie/iphone.svg' },
  { id: 'laptop-3-4', title: 'Laptop 3/4', src: 'SVG/iconographie/laptop-3-4.svg' },
  { id: 'laptop', title: 'Laptop', src: 'SVG/iconographie/laptop.svg' },
  { id: 'main-cafe', title: 'Main cafe', src: 'SVG/iconographie/main-cafe.svg' },
  { id: 'main-machine', title: 'Main machine', src: 'SVG/iconographie/main-machine.svg' },
  { id: 'p-et-s-assises', title: 'P et S assises', src: 'SVG/iconographie/p-et-s-assises.svg' },
  { id: 'p-et-s-plan-large', title: 'P et S plan large', src: 'SVG/iconographie/p-et-s-plan-large.svg' },
  { id: 'p-et-s', title: 'P et S', src: 'SVG/iconographie/p-et-s.svg' },
  { id: 'perrine-cc', title: 'Perrine cc', src: 'SVG/iconographie/perrine-cc.svg' },
  { id: 'perrine-tel', title: 'Perrine tel', src: 'SVG/iconographie/perrine-tel.svg' },
  { id: 'pot-de-fleurs', title: 'Pot de fleurs', src: 'SVG/iconographie/pot-de-fleurs.svg' },
  { id: 'sonia-cc', title: 'Sonia cc', src: 'SVG/iconographie/sonia-cc.svg' },
  { id: 'sonia-tel', title: 'Sonia tel', src: 'SVG/iconographie/sonia-tel.svg' },
];

export const ICONOGRAPHY_ITEM_IDS = ICONOGRAPHY_ITEMS.map((item) => item.id);
```

- [ ] **Step 5: Run the catalog test to verify it passes**

Run:

```bash
npm test -- tests/iconography-items.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add SVG/iconographie js/iconography-items.js tests/iconography-items.test.js
git commit -m "feat: add iconography asset catalog"
```

---

### Task 2: Add Global Iconography API

**Files:**
- Create: `api/_lib/iconography.js`
- Create: `api/iconography.js`
- Modify: `dev-server.js`
- Test: `tests/iconography.test.js`
- Test: `tests/api-iconography.test.js`

- [ ] **Step 1: Write failing library tests**

Create `tests/iconography.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ICONOGRAPHY_FIELD,
  ICONOGRAPHY_KEY,
  applyIconographyAction,
  readIconography,
  sanitizeFeedback,
  sanitizeRequestTitle,
} from '../api/_lib/iconography.js';
import { createFakeKv } from './helpers/fakeKv.js';

test('readIconography returns an empty global state by default', async () => {
  const kv = createFakeKv();
  assert.deepEqual(await readIconography(kv), { items: {}, requests: [] });
});

test('approve stores an approved global item state', async () => {
  const kv = createFakeKv();
  const state = await applyIconographyAction(kv, { action: 'approve', itemId: 'blobs' }, () => 123);

  assert.equal(ICONOGRAPHY_KEY, 'iconography');
  assert.equal(ICONOGRAPHY_FIELD, 'state');
  assert.deepEqual(state.items.blobs, { status: 'approved', feedback: '', updatedAt: 123 });
  assert.deepEqual(await kv.hget(ICONOGRAPHY_KEY, ICONOGRAPHY_FIELD), state);
});

test('reject stores trimmed feedback and replaces previous state', async () => {
  const kv = createFakeKv();
  await applyIconographyAction(kv, { action: 'approve', itemId: 'blobs' }, () => 100);

  const state = await applyIconographyAction(kv, {
    action: 'reject',
    itemId: 'blobs',
    feedback: '  A simplifier  ',
  }, () => 200);

  assert.deepEqual(state.items.blobs, { status: 'rejected', feedback: 'A simplifier', updatedAt: 200 });
});

test('reset removes one item state without deleting requests', async () => {
  const kv = createFakeKv();
  await applyIconographyAction(kv, { action: 'approve', itemId: 'blobs' }, () => 100);
  await applyIconographyAction(kv, { action: 'addRequest', title: 'Tasse vue face' }, () => 200);

  const state = await applyIconographyAction(kv, { action: 'reset', itemId: 'blobs' }, () => 300);

  assert.deepEqual(state.items, {});
  assert.equal(state.requests.length, 1);
});

test('addRequest appends a cleaned free request title', async () => {
  const kv = createFakeKv();
  const state = await applyIconographyAction(kv, { action: 'addRequest', title: '  Tasse vue face  ' }, () => 456);

  assert.deepEqual(state.requests, [{ id: 'request-456', title: 'Tasse vue face', createdAt: 456 }]);
});

test('invalid actions return null and do not store state', async () => {
  const kv = createFakeKv();

  assert.equal(await applyIconographyAction(kv, { action: 'approve', itemId: 'unknown' }), null);
  assert.equal(await applyIconographyAction(kv, { action: 'reject', itemId: 'blobs', feedback: '   ' }), null);
  assert.equal(await applyIconographyAction(kv, { action: 'addRequest', title: '   ' }), null);
  assert.equal(await applyIconographyAction(kv, { action: 'deleteAll' }), null);
  assert.equal(await kv.hget(ICONOGRAPHY_KEY, ICONOGRAPHY_FIELD), null);
});

test('sanitize helpers trim and truncate long text', () => {
  assert.equal(sanitizeFeedback('  ok  '), 'ok');
  assert.equal(sanitizeFeedback('x'.repeat(2100)).length, 2000);
  assert.equal(sanitizeRequestTitle('  Nouvelle tasse  '), 'Nouvelle tasse');
  assert.equal(sanitizeRequestTitle('x'.repeat(150)).length, 120);
});
```

- [ ] **Step 2: Run library tests to verify they fail**

Run:

```bash
npm test -- tests/iconography.test.js
```

Expected: FAIL because `api/_lib/iconography.js` does not exist.

- [ ] **Step 3: Implement the library**

Create `api/_lib/iconography.js`:

```js
import { ICONOGRAPHY_ITEM_IDS } from '../../js/iconography-items.js';

export const ICONOGRAPHY_KEY = 'iconography';
export const ICONOGRAPHY_FIELD = 'state';
const MAX_FEEDBACK_LENGTH = 2000;
const MAX_REQUEST_TITLE_LENGTH = 120;

function createEmptyState() {
  return { items: {}, requests: [] };
}

function cloneState(state) {
  return {
    items: { ...(state?.items || {}) },
    requests: Array.isArray(state?.requests) ? [...state.requests] : [],
  };
}

function isKnownItemId(itemId) {
  return ICONOGRAPHY_ITEM_IDS.includes(itemId);
}

export function sanitizeFeedback(feedback) {
  const trimmed = typeof feedback === 'string' ? feedback.trim() : '';
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_FEEDBACK_LENGTH);
}

export function sanitizeRequestTitle(title) {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_REQUEST_TITLE_LENGTH);
}

export async function readIconography(kv) {
  const stored = await kv.hget(ICONOGRAPHY_KEY, ICONOGRAPHY_FIELD);
  return stored ? cloneState(stored) : createEmptyState();
}

export async function writeIconography(kv, state) {
  const record = cloneState(state);
  await kv.hset(ICONOGRAPHY_KEY, { [ICONOGRAPHY_FIELD]: record });
  return record;
}

export async function applyIconographyAction(kv, payload, now = () => Date.now()) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const state = await readIconography(kv);
  const timestamp = now();

  if (payload.action === 'approve') {
    if (!isKnownItemId(payload.itemId)) return null;
    state.items[payload.itemId] = { status: 'approved', feedback: '', updatedAt: timestamp };
    return await writeIconography(kv, state);
  }

  if (payload.action === 'reject') {
    if (!isKnownItemId(payload.itemId)) return null;
    const feedback = sanitizeFeedback(payload.feedback);
    if (!feedback) return null;
    state.items[payload.itemId] = { status: 'rejected', feedback, updatedAt: timestamp };
    return await writeIconography(kv, state);
  }

  if (payload.action === 'reset') {
    if (!isKnownItemId(payload.itemId)) return null;
    delete state.items[payload.itemId];
    return await writeIconography(kv, state);
  }

  if (payload.action === 'addRequest') {
    const title = sanitizeRequestTitle(payload.title);
    if (!title) return null;
    state.requests.push({ id: `request-${timestamp}`, title, createdAt: timestamp });
    return await writeIconography(kv, state);
  }

  return null;
}
```

- [ ] **Step 4: Run library tests to verify they pass**

Run:

```bash
npm test -- tests/iconography.test.js
```

Expected: PASS.

- [ ] **Step 5: Write failing handler tests**

Create `tests/api-iconography.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createIconographyHandler } from '../api/iconography.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

test('GET returns the empty global iconography state', async () => {
  const handler = createIconographyHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'GET', body: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { iconography: { items: {}, requests: [] } });
});

test('POST applies an iconography action and returns the new global state', async () => {
  const handler = createIconographyHandler(createFakeKv(), () => 123);
  const res = createMockRes();

  await handler({ method: 'POST', body: { action: 'approve', itemId: 'blobs' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: 'saved',
    iconography: {
      items: { blobs: { status: 'approved', feedback: '', updatedAt: 123 } },
      requests: [],
    },
  });
});

test('POST rejects invalid iconography actions', async () => {
  const handler = createIconographyHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'POST', body: { action: 'reject', itemId: 'blobs', feedback: '   ' } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid iconography payload' });
});

test('iconography handler rejects unsupported methods', async () => {
  const handler = createIconographyHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'DELETE', body: {} }, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'Method not allowed' });
});
```

- [ ] **Step 6: Run handler tests to verify they fail**

Run:

```bash
npm test -- tests/api-iconography.test.js
```

Expected: FAIL because `api/iconography.js` does not exist.

- [ ] **Step 7: Implement handler and route**

Create `api/iconography.js`:

```js
import { getKv } from './_lib/kv.js';
import { applyIconographyAction, readIconography } from './_lib/iconography.js';

export function createIconographyHandler(kv, now = () => Date.now()) {
  return async function iconographyHandler(req, res) {
    if (req.method === 'GET') {
      res.status(200).json({ iconography: await readIconography(kv) });
      return;
    }

    if (req.method === 'POST') {
      const iconography = await applyIconographyAction(kv, req.body || {}, now);
      if (!iconography) {
        res.status(400).json({ error: 'Invalid iconography payload' });
        return;
      }

      res.status(200).json({ status: 'saved', iconography });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  };
}

export default createIconographyHandler(getKv());
```

Modify `dev-server.js`:

```js
import { createIconographyHandler } from './api/iconography.js';

const routes = {
  '/api/vote': createVoteHandler(kv),
  '/api/votes': createVotesHandler(kv, getAdminPassword),
  '/api/visit': createVisitHandler(kv),
  '/api/visits': createVisitsHandler(kv, getAdminPassword),
  '/api/final-choice': createFinalChoiceHandler(kv),
  '/api/iconography': createIconographyHandler(kv),
  '/api/admin-login': createAdminLoginHandler(getAdminPassword),
};
```

- [ ] **Step 8: Run handler and full API tests**

Run:

```bash
npm test -- tests/iconography.test.js tests/api-iconography.test.js
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add api/_lib/iconography.js api/iconography.js dev-server.js tests/iconography.test.js tests/api-iconography.test.js
git commit -m "feat: add global iconography API"
```

---

### Task 3: Build Public Iconography UI Module

**Files:**
- Create: `js/iconography-section.js`
- Test: `tests/iconography-section.test.js`

- [ ] **Step 1: Write failing UI tests**

Create `tests/iconography-section.test.js` with a fake DOM helper copied from `tests/final-choice-section.test.js`, then add these tests:

```js
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

    assert.match(collectText(root), /Selection iconographique/);
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
    assert.match(collectText(firstCard), /Valide/);
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

    assert.match(collectText(root), /Demandes ajoutees/);
    assert.match(collectText(root), /Tasse vue face/);
  });
});
```

- [ ] **Step 2: Run UI tests to verify they fail**

Run:

```bash
npm test -- tests/iconography-section.test.js
```

Expected: FAIL because `js/iconography-section.js` does not exist.

- [ ] **Step 3: Implement `js/iconography-section.js`**

Implement these exported pieces:

```js
import { ICONOGRAPHY_ITEMS } from './iconography-items.js';
import { loadInlineSvg, recolorSvg } from './svg-loader.js';

const ICON_COLOR = '#18233f';
const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

function clear(element) {
  element.innerHTML = '';
}

function createButton(label, className, { action = '', icon = '' } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  if (action) button.setAttribute('data-action', action);
  if (icon) button.innerHTML = icon;
  else button.textContent = label;
  return button;
}
```

Then implement `createIconographySection({ root, fetcher = globalThis.fetch, loadSvg = loadInlineSvg, recolor = recolorSvg } = {})` with:

- `load()` fetches `/api/iconography`, stores `state = data.iconography || { items: {}, requests: [] }`, then renders.
- `postAction(payload)` posts JSON to `/api/iconography`, updates state from `data.iconography`, and rerenders.
- `render()` creates header, request input, SVG grid, optional request list, and status text.
- `renderCard(item)` creates one card, loads its SVG into `.iconography-card__visual`, and calls `recolor(svg, '#18233f')`.
- `openFeedbackModal(itemId)` opens a reusable modal with existing feedback.
- `submitFeedback()` posts `{ action: 'reject', itemId, feedback }`.
- `resetItem(itemId)` posts `{ action: 'reset', itemId }`.

Return:

```js
return { load, openFeedbackModal };
```

- [ ] **Step 4: Run UI tests to verify they pass**

Run:

```bash
npm test -- tests/iconography-section.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/iconography-section.js tests/iconography-section.test.js
git commit -m "feat: render iconography validation UI"
```

---

### Task 4: Integrate Screen And Styles

**Files:**
- Modify: `index.html`
- Modify: `js/main.js`
- Modify: `css/style.css`
- Modify: `css/dev-immersive.css`
- Modify: `tests/dev-immersive-css.test.js`

- [ ] **Step 1: Write failing integration/style expectations**

Modify `tests/dev-immersive-css.test.js`:

```js
test('index mounts the iconography app root', () => {
  assert.match(index, /id="iconography-root"/);
  assert.doesNotMatch(index, /class="iconography-empty"/);
});

test('immersive theme styles the iconography grid, states, requests, and feedback modal', () => {
  assert.match(css, /\.dev-immersive\s+\.iconography-section\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.iconography-grid\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.iconography-card\.is-approved/);
  assert.match(css, /\.dev-immersive\s+\.iconography-card\.is-rejected/);
  assert.match(css, /\.dev-immersive\s+\.iconography-feedback-modal\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.iconography-requests\s*\{/);
});
```

Update the older test named `index includes final choice and iconography roots` so it expects `id="iconography-root"` instead of `class="iconography-empty"`.

- [ ] **Step 2: Run style tests to verify they fail**

Run:

```bash
npm test -- tests/dev-immersive-css.test.js
```

Expected: FAIL because the root and CSS classes are not present.

- [ ] **Step 3: Wire the UI into HTML and main module**

Modify `index.html` inside `#tabpanel-iconographie`:

```html
<div id="iconography-root"></div>
```

Modify `js/main.js`:

```js
import { createIconographySection } from './iconography-section.js';

createIconographySection({
  root: document.getElementById('iconography-root'),
}).load();
```

- [ ] **Step 4: Add base styles**

Append focused base styles to `css/style.css` for:

- `.iconography-section`
- `.iconography-section__header`
- `.iconography-add-request`
- `.iconography-grid`
- `.iconography-card`
- `.iconography-card__visual`
- `.iconography-card__actions`
- `.iconography-card__icon-action`
- `.iconography-card__secondary`
- `.iconography-feedback-modal`
- `.iconography-feedback-modal__dialog`
- `.iconography-feedback-modal__input`
- `.iconography-requests`

Minimum required CSS properties:

```css
.iconography-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.iconography-card__visual {
  aspect-ratio: 1 / 1;
  background: #ffffff;
}

.iconography-card__icon-action,
.iconography-card__secondary,
.iconography-add-request__button {
  min-height: 44px;
}
```

- [ ] **Step 5: Add immersive theme styles**

Append scoped styles to `css/dev-immersive.css` for the same classes. Required visual states:

```css
.dev-immersive .iconography-card.is-approved {
  border-color: rgba(159, 178, 156, 0.95);
}

.dev-immersive .iconography-card.is-rejected {
  border-color: rgba(215, 125, 114, 0.95);
}
```

The modal must use `z-index: 90` or higher so it sits above the existing final-choice modal layer.

- [ ] **Step 6: Run style tests to verify they pass**

Run:

```bash
npm test -- tests/dev-immersive-css.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html js/main.js css/style.css css/dev-immersive.css tests/dev-immersive-css.test.js
git commit -m "feat: integrate iconography screen"
```

---

### Task 5: Final Verification

**Files:**
- All files touched in Tasks 1-4

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Start the local dev server**

Run:

```bash
npm run dev
```

Expected output includes:

```text
Dev server ready at http://localhost:3000
```

- [ ] **Step 3: Manual browser smoke test**

Open `http://localhost:3000`, go to `Iconographie`, and verify:

- 22 SVG cards render.
- SVGs are dark navy on white squares.
- Check makes a card green and shows `Valide` plus `Modifier`.
- Cross opens the feedback popup.
- Saving feedback makes a card red and shows `Voir le retour` plus `Modifier`.
- `Voir le retour` reopens the saved text.
- `Modifier` lets the item be changed again.
- Adding a free request renders a simple titled card without SVG validation actions.

- [ ] **Step 4: Check git status**

Run:

```bash
git status --short
```

Expected: clean after final commit, or only intentional uncommitted verification logs if the dev server wrote them.
