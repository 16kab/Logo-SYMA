# Final Logo Choice Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global final logo/palette choice, visible and editable by everyone on the public site, visible in admin, plus a second `Iconographie` tab prepared for a later vote.

**Architecture:** Store one global record under the existing KV hash key `finalChoice` and field `current`. Keep API validation in `api/_lib/finalChoice.js`, public UI in focused client modules, and admin display in a separate renderer that `js/admin.js` composes before visits and votes.

**Tech Stack:** Static HTML/CSS, browser ES modules, Node/Vercel-style API handlers, Redis-compatible KV, `node:test`, existing SVG/palette/comparator helpers.

---

## File Structure

Create:
- `api/_lib/finalChoice.js`: validates and normalizes the global final choice payload, reads/writes the KV record.
- `api/final-choice.js`: public `GET`/`POST` endpoint for the global final choice.
- `js/page-tabs.js`: accessible public tab switching for `Logo & palette` and `Iconographie`.
- `js/final-choice-state.js`: small pure state helpers for a blank or prefilled final-choice draft.
- `js/final-choice-section.js`: public final-choice section, modal, preview rendering, API calls.
- `js/admin-final-choice.js`: admin card renderer for the final choice.
- `tests/finalChoice.test.js`: pure model validation tests.
- `tests/api-final-choice.test.js`: endpoint tests.
- `tests/page-tabs.test.js`: public tab behavior tests.
- `tests/final-choice-state.test.js`: final-choice draft behavior tests.
- `tests/final-choice-section.test.js`: public section/modal behavior tests.
- `tests/admin-final-choice.test.js`: admin final-choice card tests.

Modify:
- `dev-server.js`: register `/api/final-choice` in local dev.
- `index.html`: add tablist, tabpanels, final-choice roots, and `Iconographie` waiting state.
- `js/main.js`: initialize tabs and final-choice section before existing comparator/vote setup.
- `js/admin.js`: fetch final-choice data and render the new admin card before visits/votes.
- `css/dev-immersive.css`: styles for tabs, final-choice CTA, final section, modal, iconography waiting state.
- `css/admin.css`: styles for the admin final-choice card.
- Existing tests where render order changes: `tests/admin-render.test.js`, `tests/dev-immersive-css.test.js`, `tests/admin-css.test.js`.

## Data Contracts

API `POST /api/final-choice` accepts:

```json
{
  "logoId": "logo1",
  "paletteKey": "palette1",
  "bgColor": "#18233f",
  "logoColor": "#ffffff",
  "name": "Alexis"
}
```

Stored record:

```json
{
  "logoId": "logo1",
  "paletteKey": "palette1",
  "bgColor": "#18233f",
  "logoColor": "#ffffff",
  "name": "Alexis",
  "updatedAt": 1783100000000
}
```

API `GET /api/final-choice` returns:

```json
{ "finalChoice": null }
```

or:

```json
{
  "finalChoice": {
    "logoId": "logo1",
    "paletteKey": "palette1",
    "bgColor": "#18233f",
    "logoColor": "#ffffff",
    "name": "Alexis",
    "updatedAt": 1783100000000
  }
}
```

## Tasks

### Task 1: Final Choice Model

**Files:**
- Create: `api/_lib/finalChoice.js`
- Test: `tests/finalChoice.test.js`

- [ ] **Step 1: Write the failing model tests**

Create `tests/finalChoice.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINAL_CHOICE_FIELD,
  FINAL_CHOICE_KEY,
  isValidFinalChoicePayload,
  normalizeFinalChoicePayload,
  readFinalChoice,
  writeFinalChoice,
} from '../api/_lib/finalChoice.js';
import { createFakeKv } from './helpers/fakeKv.js';

const validPayload = {
  logoId: 'logo1',
  paletteKey: 'palette1',
  bgColor: '#18233f',
  logoColor: '#ffffff',
  name: '  Alexis  ',
};

test('validates a complete final choice payload', () => {
  assert.equal(isValidFinalChoicePayload(validPayload), true);
});

test('rejects unknown logo, palette, and colors outside selected palette', () => {
  assert.equal(isValidFinalChoicePayload({ ...validPayload, logoId: 'logo9' }), false);
  assert.equal(isValidFinalChoicePayload({ ...validPayload, paletteKey: 'palette9' }), false);
  assert.equal(isValidFinalChoicePayload({ ...validPayload, bgColor: '#ff00ff' }), false);
  assert.equal(isValidFinalChoicePayload({ ...validPayload, logoColor: '#ff00ff' }), false);
});

test('normalizes name and adds updatedAt', () => {
  assert.deepEqual(normalizeFinalChoicePayload(validPayload, () => 12345), {
    logoId: 'logo1',
    paletteKey: 'palette1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    name: 'Alexis',
    updatedAt: 12345,
  });
});

test('empty final choice name becomes Anonyme', () => {
  const normalized = normalizeFinalChoicePayload({ ...validPayload, name: '   ' }, () => 12345);
  assert.equal(normalized.name, 'Anonyme');
});

test('writeFinalChoice stores one current global record', async () => {
  const kv = createFakeKv();
  const record = await writeFinalChoice(kv, validPayload, () => 987);

  assert.equal(FINAL_CHOICE_KEY, 'finalChoice');
  assert.equal(FINAL_CHOICE_FIELD, 'current');
  assert.deepEqual(record, {
    logoId: 'logo1',
    paletteKey: 'palette1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    name: 'Alexis',
    updatedAt: 987,
  });
  assert.deepEqual(await kv.hget(FINAL_CHOICE_KEY, FINAL_CHOICE_FIELD), record);
});

test('writeFinalChoice rejects invalid payload without storing', async () => {
  const kv = createFakeKv();
  const record = await writeFinalChoice(kv, { ...validPayload, logoId: 'bad' }, () => 987);

  assert.equal(record, null);
  assert.equal(await readFinalChoice(kv), null);
});
```

- [ ] **Step 2: Run the failing model tests**

Run:

```powershell
npm test -- tests/finalChoice.test.js
```

Expected: fail with an import error for `../api/_lib/finalChoice.js`.

- [ ] **Step 3: Implement the model**

Create `api/_lib/finalChoice.js`:

```js
import { PALETTES } from '../../js/palettes.js';
import { isValidLogoId, isValidPaletteKey, sanitizeName } from './validate.js';

export const FINAL_CHOICE_KEY = 'finalChoice';
export const FINAL_CHOICE_FIELD = 'current';

function isPaletteColor(paletteKey, color) {
  return Boolean(PALETTES[paletteKey]?.colors.includes(color));
}

export function isValidFinalChoicePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;

  const { logoId, paletteKey, bgColor, logoColor } = payload;
  return isValidLogoId(logoId)
    && isValidPaletteKey(paletteKey)
    && isPaletteColor(paletteKey, bgColor)
    && isPaletteColor(paletteKey, logoColor);
}

export function normalizeFinalChoicePayload(payload, now = () => Date.now()) {
  if (!isValidFinalChoicePayload(payload)) return null;

  return {
    logoId: payload.logoId,
    paletteKey: payload.paletteKey,
    bgColor: payload.bgColor,
    logoColor: payload.logoColor,
    name: sanitizeName(payload.name),
    updatedAt: now(),
  };
}

export async function readFinalChoice(kv) {
  return await kv.hget(FINAL_CHOICE_KEY, FINAL_CHOICE_FIELD);
}

export async function writeFinalChoice(kv, payload, now = () => Date.now()) {
  const record = normalizeFinalChoicePayload(payload, now);
  if (!record) return null;

  await kv.hset(FINAL_CHOICE_KEY, { [FINAL_CHOICE_FIELD]: record });
  return record;
}
```

- [ ] **Step 4: Verify the model tests pass**

Run:

```powershell
npm test -- tests/finalChoice.test.js
```

Expected: all tests in `tests/finalChoice.test.js` pass.

- [ ] **Step 5: Commit model work**

Run:

```powershell
git add api/_lib/finalChoice.js tests/finalChoice.test.js
git commit -m "feat: add final choice model"
```

### Task 2: Final Choice API Endpoint

**Files:**
- Create: `api/final-choice.js`
- Modify: `dev-server.js`
- Test: `tests/api-final-choice.test.js`

- [ ] **Step 1: Write failing API tests**

Create `tests/api-final-choice.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFinalChoiceHandler } from '../api/final-choice.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

const payload = {
  logoId: 'logo1',
  paletteKey: 'palette1',
  bgColor: '#18233f',
  logoColor: '#ffffff',
  name: 'Alexis',
};

test('GET returns null when no final choice exists', async () => {
  const handler = createFinalChoiceHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'GET', body: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { finalChoice: null });
});

test('POST saves and returns the global final choice', async () => {
  const kv = createFakeKv();
  const handler = createFinalChoiceHandler(kv, () => 12345);
  const res = createMockRes();

  await handler({ method: 'POST', body: payload }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: 'saved',
    finalChoice: { ...payload, updatedAt: 12345 },
  });
});

test('POST replaces the previous global final choice', async () => {
  const kv = createFakeKv();
  const handler = createFinalChoiceHandler(kv, () => 999);
  await handler({ method: 'POST', body: payload }, createMockRes());
  const res = createMockRes();

  await handler({
    method: 'POST',
    body: {
      logoId: 'logo2',
      paletteKey: 'palette2',
      bgColor: '#111111',
      logoColor: '#f6f0df',
      name: 'Camille',
    },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.finalChoice.logoId, 'logo2');
  assert.equal(res.body.finalChoice.name, 'Camille');
  assert.equal(res.body.finalChoice.updatedAt, 999);

  const getRes = createMockRes();
  await handler({ method: 'GET', body: {} }, getRes);
  assert.equal(getRes.body.finalChoice.logoId, 'logo2');
});

test('POST rejects invalid payloads', async () => {
  const handler = createFinalChoiceHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'POST', body: { ...payload, bgColor: '#ff00ff' } }, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: 'Invalid final choice payload' });
});

test('rejects unsupported methods', async () => {
  const handler = createFinalChoiceHandler(createFakeKv());
  const res = createMockRes();

  await handler({ method: 'DELETE', body: {} }, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: 'Method not allowed' });
});
```

- [ ] **Step 2: Run the failing API tests**

Run:

```powershell
npm test -- tests/api-final-choice.test.js
```

Expected: fail with an import error for `../api/final-choice.js`.

- [ ] **Step 3: Implement the endpoint**

Create `api/final-choice.js`:

```js
import { getKv } from './_lib/kv.js';
import { readFinalChoice, writeFinalChoice } from './_lib/finalChoice.js';

export function createFinalChoiceHandler(kv, now = () => Date.now()) {
  return async function finalChoiceHandler(req, res) {
    if (req.method === 'GET') {
      res.status(200).json({ finalChoice: await readFinalChoice(kv) });
      return;
    }

    if (req.method === 'POST') {
      const finalChoice = await writeFinalChoice(kv, req.body || {}, now);
      if (!finalChoice) {
        res.status(400).json({ error: 'Invalid final choice payload' });
        return;
      }

      res.status(200).json({ status: 'saved', finalChoice });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  };
}

export default createFinalChoiceHandler(getKv());
```

Modify `dev-server.js`:

```diff
 import { createVisitsHandler } from './api/visits.js';
 import { createAdminLoginHandler } from './api/admin-login.js';
+import { createFinalChoiceHandler } from './api/final-choice.js';
```

```diff
   '/api/visit': createVisitHandler(kv),
   '/api/visits': createVisitsHandler(kv, getAdminPassword),
+  '/api/final-choice': createFinalChoiceHandler(kv),
   '/api/admin-login': createAdminLoginHandler(getAdminPassword),
```

- [ ] **Step 4: Verify API tests pass**

Run:

```powershell
npm test -- tests/api-final-choice.test.js
```

Expected: all tests in `tests/api-final-choice.test.js` pass.

- [ ] **Step 5: Commit API work**

Run:

```powershell
git add api/final-choice.js dev-server.js tests/api-final-choice.test.js
git commit -m "feat: add final choice api"
```

### Task 3: Public Tabs Shell

**Files:**
- Create: `js/page-tabs.js`
- Modify: `index.html`
- Modify: `js/main.js`
- Test: `tests/page-tabs.test.js`
- Test: `tests/dev-immersive-css.test.js`

- [ ] **Step 1: Write failing tab tests**

Create `tests/page-tabs.test.js`:

```js
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
```

Add to `tests/dev-immersive-css.test.js`:

```js
test('index includes final choice and iconography roots', () => {
  assert.match(index, /id="final-choice-root"/);
  assert.match(index, /id="final-choice-action-root"/);
  assert.match(index, /class="iconography-empty"/);
});
```

- [ ] **Step 2: Run the failing tab tests**

Run:

```powershell
npm test -- tests/page-tabs.test.js tests/dev-immersive-css.test.js
```

Expected: fail because `js/page-tabs.js` does not exist and `index.html` has no tab markup yet.

- [ ] **Step 3: Implement tab behavior**

Create `js/page-tabs.js`:

```js
export function createPageTabs({
  tabs = Array.from(document.querySelectorAll('[role="tab"][data-tab-target]')),
  panels = Array.from(document.querySelectorAll('[role="tabpanel"]')),
  body = document.body,
} = {}) {
  const panelsById = new Map(panels.map((panel) => [panel.id, panel]));

  function activate(tab) {
    for (const item of tabs) {
      const isActive = item === tab;
      item.setAttribute('aria-selected', String(isActive));
      item.setAttribute('tabindex', isActive ? '0' : '-1');

      const panel = panelsById.get(item.dataset.tabTarget);
      if (panel) panel.hidden = !isActive;
    }

    body.dataset.activeTab = tab.dataset.tabName || tab.dataset.tabTarget;
  }

  for (const tab of tabs) {
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      activate(tab);
    });

    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const index = tabs.indexOf(tab);
      const next = tabs[(index + direction + tabs.length) % tabs.length];
      activate(next);
      next.focus?.();
    });
  }

  activate(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
}
```

Modify `index.html` so `<main>` contains the tabs and both panels:

```html
  <main>
    <nav class="page-tabs" aria-label="Sections SYMA">
      <div class="page-tabs__list" role="tablist">
        <button
          class="page-tabs__tab is-active"
          id="tab-logo-palette"
          type="button"
          role="tab"
          aria-selected="true"
          aria-controls="tabpanel-logo-palette"
          data-tab-target="tabpanel-logo-palette"
          data-tab-name="logo"
        >Logo & palette</button>
        <button
          class="page-tabs__tab"
          id="tab-iconographie"
          type="button"
          role="tab"
          aria-selected="false"
          aria-controls="tabpanel-iconographie"
          data-tab-target="tabpanel-iconographie"
          data-tab-name="iconography"
        >Iconographie</button>
      </div>
    </nav>

    <section
      class="tab-panel tab-panel--logo"
      id="tabpanel-logo-palette"
      role="tabpanel"
      aria-labelledby="tab-logo-palette"
    >
      <section class="intro" aria-labelledby="intro-title">
        <p class="eyebrow">Proposition d'identite</p>
        <h2 class="intro-title" id="intro-title">Sept directions de logo pour <span class="intro-accent">SYMA</span></h2>
        <p class="intro-lede">Comparez les directions, projetez-les sur les couleurs de la marque, puis classez vos preferees.</p>
      </section>

      <div id="final-choice-root"></div>

      <section class="comparator-section" aria-labelledby="comparator-title">
        <div class="section-heading section-heading--with-action">
          <div>
            <p class="eyebrow">Comparateur</p>
            <h2 id="comparator-title">Comparez les directions de logo</h2>
          </div>
          <div id="final-choice-action-root"></div>
        </div>
        <div class="comparator" aria-label="Comparateur de logos">
          <div class="comparator-panel" id="panel-left"></div>
          <div class="comparator-panel" id="panel-right"></div>
        </div>
      </section>
    </section>

    <section
      class="tab-panel tab-panel--iconography"
      id="tabpanel-iconographie"
      role="tabpanel"
      aria-labelledby="tab-iconographie"
      hidden
    >
      <div class="iconography-empty">
        <p class="eyebrow">Iconographie</p>
        <h2>La selection iconographique arrive ensuite</h2>
        <p>Ce second vote sera active quand les pistes visuelles seront pretes.</p>
      </div>
    </section>
  </main>
```

Modify `js/main.js` imports and initialization:

```diff
 import { activateDevTheme } from './dev-theme.js';
 import { startVisitTracking } from './visit-tracker.js';
+import { createPageTabs } from './page-tabs.js';
 
 document.addEventListener('DOMContentLoaded', () => {
   startVisitTracking();
   activateDevTheme();
+  createPageTabs();
```

- [ ] **Step 4: Verify tab tests pass**

Run:

```powershell
npm test -- tests/page-tabs.test.js tests/dev-immersive-css.test.js
```

Expected: all tests in those files pass.

- [ ] **Step 5: Commit tabs work**

Run:

```powershell
git add index.html js/main.js js/page-tabs.js tests/page-tabs.test.js tests/dev-immersive-css.test.js
git commit -m "feat: add public logo and iconography tabs"
```

### Task 4: Public Final Choice Draft State

**Files:**
- Create: `js/final-choice-state.js`
- Test: `tests/final-choice-state.test.js`

- [ ] **Step 1: Write failing state tests**

Create `tests/final-choice-state.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFinalChoicePalette,
  createBlankFinalChoiceDraft,
  createDraftFromFinalChoice,
  getFinalChoicePayload,
  isCompleteFinalChoiceDraft,
} from '../js/final-choice-state.js';

test('creates a blank final choice draft with reused name only', () => {
  assert.deepEqual(createBlankFinalChoiceDraft('Alexis'), {
    logoId: null,
    paletteKey: null,
    bgColor: null,
    logoColor: null,
    name: 'Alexis',
  });
});

test('creates a prefilled draft from an existing final choice', () => {
  const draft = createDraftFromFinalChoice({
    logoId: 'logo2',
    paletteKey: 'palette1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    name: 'Camille',
  }, 'Alexis');

  assert.equal(draft.logoId, 'logo2');
  assert.equal(draft.name, 'Camille');
});

test('palette selection resets colors until the user chooses them', () => {
  const draft = applyFinalChoicePalette(createBlankFinalChoiceDraft('Alexis'), 'palette1');

  assert.equal(draft.paletteKey, 'palette1');
  assert.equal(draft.bgColor, null);
  assert.equal(draft.logoColor, null);
});

test('complete drafts require logo, palette, and both selected colors', () => {
  assert.equal(isCompleteFinalChoiceDraft({ logoId: 'logo1', paletteKey: 'palette1', bgColor: '#18233f', logoColor: null, name: 'Alexis' }), false);
  assert.equal(isCompleteFinalChoiceDraft({ logoId: 'logo1', paletteKey: 'palette1', bgColor: '#18233f', logoColor: '#ffffff', name: 'Alexis' }), true);
});

test('payload trims the visible name field', () => {
  const payload = getFinalChoicePayload({
    logoId: 'logo1',
    paletteKey: 'palette1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    name: '  Alexis  ',
  });

  assert.deepEqual(payload, {
    logoId: 'logo1',
    paletteKey: 'palette1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    name: 'Alexis',
  });
});
```

- [ ] **Step 2: Run the failing state tests**

Run:

```powershell
npm test -- tests/final-choice-state.test.js
```

Expected: fail because `js/final-choice-state.js` does not exist.

- [ ] **Step 3: Implement the draft state helpers**

Create `js/final-choice-state.js`:

```js
export function createBlankFinalChoiceDraft(name = '') {
  return {
    logoId: null,
    paletteKey: null,
    bgColor: null,
    logoColor: null,
    name: name || '',
  };
}

export function createDraftFromFinalChoice(finalChoice, fallbackName = '') {
  if (!finalChoice) return createBlankFinalChoiceDraft(fallbackName);

  return {
    logoId: finalChoice.logoId || null,
    paletteKey: finalChoice.paletteKey || null,
    bgColor: finalChoice.bgColor || null,
    logoColor: finalChoice.logoColor || null,
    name: finalChoice.name || fallbackName || '',
  };
}

export function applyFinalChoicePalette(draft, paletteKey) {
  return {
    ...draft,
    paletteKey,
    bgColor: null,
    logoColor: null,
  };
}

export function isCompleteFinalChoiceDraft(draft) {
  return Boolean(draft?.logoId && draft?.paletteKey && draft?.bgColor && draft?.logoColor);
}

export function getFinalChoicePayload(draft) {
  return {
    logoId: draft.logoId,
    paletteKey: draft.paletteKey,
    bgColor: draft.bgColor,
    logoColor: draft.logoColor,
    name: typeof draft.name === 'string' ? draft.name.trim() : '',
  };
}
```

- [ ] **Step 4: Verify state tests pass**

Run:

```powershell
npm test -- tests/final-choice-state.test.js
```

Expected: all tests in `tests/final-choice-state.test.js` pass.

- [ ] **Step 5: Commit state work**

Run:

```powershell
git add js/final-choice-state.js tests/final-choice-state.test.js
git commit -m "feat: add final choice draft state"
```

### Task 5: Public Final Choice Section And Modal

**Files:**
- Create: `js/final-choice-section.js`
- Modify: `js/main.js`
- Test: `tests/final-choice-section.test.js`

- [ ] **Step 1: Write failing public UI tests**

Create `tests/final-choice-section.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFinalChoiceSection } from '../js/final-choice-section.js';

function createFakeElement(tagName = 'div') {
  const classes = new Set();
  return {
    tagName,
    children: [],
    attributes: {},
    dataset: {},
    style: {},
    hidden: false,
    value: '',
    textContent: '',
    className: '',
    innerHTML: '',
    classList: {
      add(name) {
        classes.add(name);
      },
      remove(name) {
        classes.delete(name);
      },
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
      contains(name) {
        return classes.has(name);
      },
    },
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
    addEventListener() {},
    querySelector() {
      return null;
    },
  };
}

function collectText(element) {
  return [element.textContent, ...element.children.map(collectText)].filter(Boolean).join(' ');
}

function withFakeDocument(run) {
  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: createFakeElement,
    body: createFakeElement('body'),
  };
  try {
    return run();
  } finally {
    globalThis.document = originalDocument;
  }
}

test('renders only the validate button when no final choice exists', async () => {
  await withFakeDocument(async () => {
    const root = createFakeElement();
    const actionRoot = createFakeElement();
    const section = createFinalChoiceSection({
      root,
      actionRoot,
      fetcher: async () => ({ ok: true, async json() { return { finalChoice: null }; } }),
      storage: { getItem() { return null; }, setItem() {} },
    });

    await section.load();

    assert.equal(root.children.length, 0);
    assert.match(collectText(actionRoot), /Valider notre choix/);
  });
});

test('renders the global final choice section with edit action', async () => {
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
      storage: { getItem() { return 'Alexis'; }, setItem() {} },
    });

    await section.load();

    const text = collectText(root);
    assert.match(text, /Choix final/);
    assert.match(text, /Modifier/);
    assert.match(text, /Noir sur blanc/);
    assert.match(text, /Blanc sur noir/);
  });
});
```

- [ ] **Step 2: Run the failing public UI tests**

Run:

```powershell
npm test -- tests/final-choice-section.test.js
```

Expected: fail because `js/final-choice-section.js` does not exist.

- [ ] **Step 3: Implement public final-choice UI**

Create `js/final-choice-section.js`:

```js
import { LOGOS } from './logos.js';
import { PALETTES, PALETTE_KEYS } from './palettes.js';
import { renderLogoThumbs } from './comparator-panel.js';
import { renderPaletteTabs, renderSwatches } from './palette-controls.js';
import { loadInlineSvg, recolorSvg } from './svg-loader.js';
import { getIdentity, setName } from './identity.js';
import {
  applyFinalChoicePalette,
  createBlankFinalChoiceDraft,
  createDraftFromFinalChoice,
  getFinalChoicePayload,
  isCompleteFinalChoiceDraft,
} from './final-choice-state.js';

function findLogo(logoId) {
  return LOGOS.find((logo) => logo.id === logoId) || LOGOS[0];
}

function createButton(label, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

async function renderLogoSurface(container, choice, { label, className = '' } = {}) {
  const logo = findLogo(choice.logoId);
  container.className = className;
  container.style.backgroundColor = choice.bgColor;
  container.innerHTML = '';

  const logoWrap = document.createElement('div');
  logoWrap.className = 'final-choice-logo-wrap';
  container.appendChild(logoWrap);
  const svg = await loadInlineSvg(logo.src, logoWrap);
  recolorSvg(svg, choice.logoColor);

  if (label) {
    const caption = document.createElement('p');
    caption.className = 'final-choice-variant__label';
    caption.textContent = label;
    container.appendChild(caption);
  }
}

export function createFinalChoiceSection({
  root,
  actionRoot,
  fetcher = globalThis.fetch,
  storage = globalThis.localStorage,
} = {}) {
  let currentChoice = null;
  let draft = null;
  let modal = null;

  function renderAction() {
    actionRoot.innerHTML = '';
    const button = createButton('Valider notre choix', 'final-choice-cta');
    button.addEventListener('click', () => openModal(null));
    actionRoot.appendChild(button);
  }

  async function renderSection() {
    root.innerHTML = '';
    if (!currentChoice) return;

    const section = document.createElement('section');
    section.className = 'final-choice-section';
    section.setAttribute('aria-labelledby', 'final-choice-title');

    const header = document.createElement('div');
    header.className = 'final-choice-section__header';

    const titleBlock = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Choix final';
    const title = document.createElement('h2');
    title.id = 'final-choice-title';
    title.textContent = 'Direction retenue';
    titleBlock.appendChild(eyebrow);
    titleBlock.appendChild(title);

    const edit = createButton('Modifier', 'final-choice-edit');
    edit.addEventListener('click', () => openModal(currentChoice));

    header.appendChild(titleBlock);
    header.appendChild(edit);
    section.appendChild(header);

    const hero = document.createElement('div');
    await renderLogoSurface(hero, currentChoice, { className: 'final-choice-hero' });
    section.appendChild(hero);

    const variants = document.createElement('div');
    variants.className = 'final-choice-variants';
    const blackOnWhite = document.createElement('article');
    const whiteOnBlack = document.createElement('article');
    variants.appendChild(blackOnWhite);
    variants.appendChild(whiteOnBlack);
    section.appendChild(variants);
    root.appendChild(section);

    await renderLogoSurface(blackOnWhite, { ...currentChoice, bgColor: '#ffffff', logoColor: '#000000' }, {
      label: 'Noir sur blanc',
      className: 'final-choice-variant',
    });
    await renderLogoSurface(whiteOnBlack, { ...currentChoice, bgColor: '#000000', logoColor: '#ffffff' }, {
      label: 'Blanc sur noir',
      className: 'final-choice-variant',
    });
  }

  function ensureModal() {
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'final-choice-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="final-choice-modal__backdrop" data-role="close"></div>
      <section class="final-choice-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="final-choice-modal-title">
        <div class="final-choice-modal__header">
          <div>
            <p class="eyebrow">Validation finale</p>
            <h2 id="final-choice-modal-title">Valider notre choix</h2>
          </div>
          <button class="final-choice-modal__close" type="button" aria-label="Fermer" data-role="close">x</button>
        </div>
        <div class="final-choice-modal__body">
          <div class="final-choice-modal__preview" data-role="modal-preview"></div>
          <div class="final-choice-modal__controls">
            <label class="final-choice-modal__field">Prenom
              <input class="final-choice-modal__input" data-role="name" autocomplete="given-name" />
            </label>
            <div class="control-group">
              <p class="control-label">Palette</p>
              <div class="palette-tabs" data-role="palette-tabs"></div>
            </div>
            <div class="control-group">
              <p class="control-label">Modele</p>
              <div class="thumb-row" data-role="logo-tabs"></div>
            </div>
            <div class="control-group color-control">
              <p class="control-label">Fond</p>
              <div class="swatch-row" data-role="bg-swatches"></div>
            </div>
            <div class="control-group color-control">
              <p class="control-label">Logo</p>
              <div class="swatch-row" data-role="logo-swatches"></div>
            </div>
            <p class="final-choice-modal__status" role="status" data-role="status"></p>
          </div>
        </div>
        <div class="final-choice-modal__footer">
          <button class="final-choice-modal__secondary" type="button" data-role="close">Annuler</button>
          <button class="final-choice-modal__primary" type="button" data-role="submit">Valider notre choix</button>
        </div>
      </section>
    `;

    modal.querySelectorAll('[data-role="close"]').forEach((button) => {
      button.addEventListener('click', closeModal);
    });
    modal.querySelector('[data-role="submit"]').addEventListener('click', submitDraft);
    document.body.appendChild(modal);
    return modal;
  }

  async function renderModalControls() {
    const modalEl = ensureModal();
    const preview = modalEl.querySelector('[data-role="modal-preview"]');
    const paletteTabs = modalEl.querySelector('[data-role="palette-tabs"]');
    const logoTabs = modalEl.querySelector('[data-role="logo-tabs"]');
    const bgSwatches = modalEl.querySelector('[data-role="bg-swatches"]');
    const logoSwatches = modalEl.querySelector('[data-role="logo-swatches"]');
    const nameInput = modalEl.querySelector('[data-role="name"]');

    nameInput.value = draft.name || '';

    renderPaletteTabs(paletteTabs, draft.paletteKey, (paletteKey) => {
      draft = applyFinalChoicePalette(draft, paletteKey);
      renderModalControls();
    });

    renderLogoThumbs(logoTabs, draft.logoId, (logoId) => {
      draft = { ...draft, logoId };
      renderModalControls();
    });

    if (draft.paletteKey && PALETTE_KEYS.includes(draft.paletteKey)) {
      renderSwatches(bgSwatches, draft.paletteKey, draft.bgColor, (color) => {
        draft = { ...draft, bgColor: color };
        renderModalControls();
      }, 'Fond');
      renderSwatches(logoSwatches, draft.paletteKey, draft.logoColor, (color) => {
        draft = { ...draft, logoColor: color };
        renderModalControls();
      }, 'Logo');
    } else {
      bgSwatches.innerHTML = '';
      logoSwatches.innerHTML = '';
    }

    preview.innerHTML = '';
    if (isCompleteFinalChoiceDraft(draft)) {
      await renderLogoSurface(preview, draft, { className: 'final-choice-modal__preview-surface' });
    } else {
      const empty = document.createElement('p');
      empty.className = 'final-choice-modal__empty';
      empty.textContent = 'Selectionnez une palette, un logo et deux couleurs.';
      preview.appendChild(empty);
    }
  }

  function openModal(choice) {
    const modalEl = ensureModal();
    const name = getIdentity(storage).name || '';
    draft = choice ? createDraftFromFinalChoice(choice, name) : createBlankFinalChoiceDraft(name);
    modalEl.hidden = false;
    renderModalControls();
  }

  function closeModal() {
    if (modal) modal.hidden = true;
  }

  async function submitDraft() {
    const modalEl = ensureModal();
    const status = modalEl.querySelector('[data-role="status"]');
    const nameInput = modalEl.querySelector('[data-role="name"]');
    draft = { ...draft, name: nameInput.value };

    if (!isCompleteFinalChoiceDraft(draft)) {
      status.setAttribute('role', 'alert');
      status.textContent = 'Choisissez une palette, un logo, une couleur de fond et une couleur de logo.';
      return;
    }

    const payload = getFinalChoicePayload(draft);
    const response = await fetcher('/api/final-choice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      status.setAttribute('role', 'alert');
      status.textContent = 'Le choix final n a pas pu etre enregistre.';
      return;
    }

    const data = await response.json();
    currentChoice = data.finalChoice;
    if (payload.name) setName(payload.name, storage);
    closeModal();
    renderSection();
  }

  async function load() {
    renderAction();
    try {
      const response = await fetcher('/api/final-choice');
      if (response.ok) {
        const data = await response.json();
        currentChoice = data.finalChoice || null;
      }
    } catch (error) {
      currentChoice = null;
    }
    await renderSection();
  }

  return { load, openModal };
}
```

Modify `js/main.js`:

```diff
 import { startVisitTracking } from './visit-tracker.js';
 import { createPageTabs } from './page-tabs.js';
+import { createFinalChoiceSection } from './final-choice-section.js';
 
 document.addEventListener('DOMContentLoaded', () => {
   startVisitTracking();
   activateDevTheme();
   createPageTabs();
+  createFinalChoiceSection({
+    root: document.getElementById('final-choice-root'),
+    actionRoot: document.getElementById('final-choice-action-root'),
+  }).load();
```

- [ ] **Step 4: Verify public UI tests pass**

Run:

```powershell
npm test -- tests/final-choice-section.test.js
```

Expected: all tests in `tests/final-choice-section.test.js` pass.

- [ ] **Step 5: Commit public UI logic**

Run:

```powershell
git add js/final-choice-section.js js/main.js tests/final-choice-section.test.js
git commit -m "feat: add public final choice modal"
```

### Task 6: Admin Final Choice Card

**Files:**
- Create: `js/admin-final-choice.js`
- Modify: `js/admin.js`
- Test: `tests/admin-final-choice.test.js`
- Test: `tests/admin-render.test.js`

- [ ] **Step 1: Write failing admin-card tests**

Create `tests/admin-final-choice.test.js`:

```js
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
    assert.equal(card.children.some((child) => child.className === 'admin-final-choice__preview'), true);
  } finally {
    globalThis.document = originalDocument;
  }
});
```

Modify `tests/admin-render.test.js`:

```diff
-test('renderDashboard prepends visit analytics before vote summaries', async () => {
+test('renderDashboard prepends final choice and visit analytics before vote summaries', async () => {
```

Inside that test call `renderDashboard` with `finalChoiceData`:

```diff
     renderDashboard({
+      finalChoiceData: { finalChoice: null },
       visitsData: {
```

Update the assertions:

```diff
+  assert.match(text, /Choix final/);
   assert.match(text, /Visites du site/);
   assert.match(text, /3 visites/);
   assert.match(text, /Palettes preferees|Palettes pr.f.r.es/);
-  assert.equal(container.children[0].className, 'admin-card admin-visits-card');
+  assert.equal(container.children[0].className, 'admin-card admin-final-choice-card');
+  assert.equal(container.children[1].className, 'admin-card admin-visits-card');
```

Add a fetch branch in the `dashboard still renders votes when visit analytics request fails` test:

```diff
   globalThis.fetch = async (path) => {
+    if (path === '/api/final-choice') {
+      return {
+        ok: true,
+        status: 200,
+        async json() {
+          return { finalChoice: null };
+        },
+      };
+    }
     if (path === '/api/votes') {
```

- [ ] **Step 2: Run failing admin tests**

Run:

```powershell
npm test -- tests/admin-final-choice.test.js tests/admin-render.test.js
```

Expected: fail because `js/admin-final-choice.js` does not exist and `renderDashboard` has no `finalChoiceData` support.

- [ ] **Step 3: Implement admin final-choice renderer**

Create `js/admin-final-choice.js`:

```js
import { LOGOS } from './logos.js';
import { PALETTES } from './palettes.js';
import { formatPaletteLabel } from './admin-format.js';

function findLogo(logoId) {
  return LOGOS.find((logo) => logo.id === logoId) || null;
}

function createMeta(label, value) {
  const item = document.createElement('div');
  item.className = 'admin-final-choice__meta-item';
  const key = document.createElement('p');
  key.className = 'admin-final-choice__meta-label';
  key.textContent = label;
  const val = document.createElement('p');
  val.className = 'admin-final-choice__meta-value';
  val.textContent = value;
  item.appendChild(key);
  item.appendChild(val);
  return item;
}

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(updatedAt));
}

export function createFinalChoiceAdminCard({ finalChoice } = {}) {
  const card = document.createElement('div');
  card.className = 'admin-card admin-final-choice-card';
  card.innerHTML = '<h3>Choix final</h3>';

  if (!finalChoice) {
    const empty = document.createElement('p');
    empty.className = 'admin-empty';
    empty.textContent = 'Aucun choix final valide pour le moment.';
    card.appendChild(empty);
    return card;
  }

  const logo = findLogo(finalChoice.logoId);
  const layout = document.createElement('div');
  layout.className = 'admin-final-choice';

  const preview = document.createElement('div');
  preview.className = 'admin-final-choice__preview';
  preview.style.backgroundColor = finalChoice.bgColor;
  if (logo) {
    const img = document.createElement('img');
    img.src = logo.src;
    img.alt = logo.name;
    img.loading = 'lazy';
    preview.appendChild(img);
  }

  const meta = document.createElement('div');
  meta.className = 'admin-final-choice__meta';
  meta.appendChild(createMeta('Logo', logo?.name || finalChoice.logoId));
  meta.appendChild(createMeta('Palette', formatPaletteLabel(finalChoice.paletteKey)));
  meta.appendChild(createMeta('Fond', finalChoice.bgColor));
  meta.appendChild(createMeta('Logo couleur', finalChoice.logoColor));
  meta.appendChild(createMeta('Valide par', finalChoice.name || 'Anonyme'));
  meta.appendChild(createMeta('Derniere modification', formatUpdatedAt(finalChoice.updatedAt)));

  const swatches = document.createElement('div');
  swatches.className = 'admin-final-choice__swatches';
  for (const color of PALETTES[finalChoice.paletteKey]?.colors || []) {
    const swatch = document.createElement('span');
    swatch.className = 'admin-palette-preview__swatch';
    swatch.style.backgroundColor = color;
    swatches.appendChild(swatch);
  }
  meta.appendChild(swatches);

  layout.appendChild(preview);
  layout.appendChild(meta);
  card.appendChild(layout);
  return card;
}
```

Modify `js/admin.js`:

```diff
 import { formatPaletteLabel } from './admin-format.js';
 import { createVisitAnalyticsCard } from './admin-visits.js';
+import { createFinalChoiceAdminCard } from './admin-final-choice.js';
```

```diff
-export function renderDashboard({ votesData, visitsData }) {
+export function renderDashboard({ votesData, visitsData, finalChoiceData }) {
   const container = document.getElementById('votes-summary');
   container.innerHTML = '';
 
+  container.appendChild(createFinalChoiceAdminCard(finalChoiceData || { finalChoice: null }));
+
   if (visitsData) {
     container.appendChild(createVisitAnalyticsCard(visitsData));
   }
```

Update `showDashboard`:

```diff
   let votesData;
   let visitsData = null;
+  let finalChoiceData = { finalChoice: null };
   try {
-    const [votesResult, visitsResult] = await Promise.allSettled([
+    const [votesResult, visitsResult, finalChoiceResult] = await Promise.allSettled([
       fetchAdminJson('/api/votes', token),
       fetchAdminJson('/api/visits', token),
+      fetch('/api/final-choice'),
     ]);
 
     const votesResponse = votesResult.status === 'fulfilled' ? votesResult.value : null;
     const visitsResponse = visitsResult.status === 'fulfilled' ? visitsResult.value : null;
+    const finalChoiceResponse = finalChoiceResult.status === 'fulfilled' ? finalChoiceResult.value : null;
```

After visits JSON handling:

```diff
     if (visitsResponse?.ok) {
       try {
         visitsData = await visitsResponse.json();
       } catch (error) {
         visitsData = null;
       }
     }
+
+    if (finalChoiceResponse?.ok) {
+      try {
+        finalChoiceData = await finalChoiceResponse.json();
+      } catch (error) {
+        finalChoiceData = { finalChoice: null };
+      }
+    }
```

Final render call:

```diff
-  renderDashboard({ votesData, visitsData });
+  renderDashboard({ votesData, visitsData, finalChoiceData });
```

- [ ] **Step 4: Verify admin tests pass**

Run:

```powershell
npm test -- tests/admin-final-choice.test.js tests/admin-render.test.js
```

Expected: all tests in those files pass.

- [ ] **Step 5: Commit admin work**

Run:

```powershell
git add js/admin-final-choice.js js/admin.js tests/admin-final-choice.test.js tests/admin-render.test.js
git commit -m "feat: show final choice in admin"
```

### Task 7: Public And Admin Styling

**Files:**
- Modify: `css/dev-immersive.css`
- Modify: `css/admin.css`
- Test: `tests/dev-immersive-css.test.js`
- Test: `tests/admin-css.test.js`

- [ ] **Step 1: Write failing CSS tests**

Add to `tests/dev-immersive-css.test.js`:

```js
test('immersive theme styles tabs, final choice, modal, and iconography state', () => {
  assert.match(css, /\.dev-immersive\s+\.page-tabs\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.final-choice-section\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.final-choice-modal\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.iconography-empty\s*\{/);
  assert.match(css, /body\.dev-immersive\[data-active-tab="iconography"\]\s+#submission-bar-root/);
});
```

Add to `tests/admin-css.test.js`:

```js
test('admin final choice card has stable preview and metadata layout', () => {
  const cardBlock = cssBlock('.admin-final-choice-card');
  const previewBlock = cssBlock('.admin-final-choice__preview');
  const metaBlock = cssBlock('.admin-final-choice__meta');

  assert.match(cardBlock, /display:\s*grid/);
  assert.match(previewBlock, /min-height:\s*180px/);
  assert.match(metaBlock, /grid-template-columns:\s*repeat/);
});
```

- [ ] **Step 2: Run failing CSS tests**

Run:

```powershell
npm test -- tests/dev-immersive-css.test.js tests/admin-css.test.js
```

Expected: fail because the selectors are not present yet.

- [ ] **Step 3: Add public styles**

Append to `css/dev-immersive.css` before the first `@media (max-width: 560px)` block:

```css
.dev-immersive .page-tabs {
  position: sticky;
  top: 0;
  z-index: 15;
  padding: 0.2rem 0 1rem;
  background: rgba(11, 13, 16, 0.88);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.dev-immersive .page-tabs__list {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid rgba(202, 211, 225, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
}

.dev-immersive .page-tabs__tab {
  min-height: 44px;
  border: none;
  border-radius: 999px;
  padding: 0.65rem 1rem;
  background: transparent;
  color: var(--muted);
  font-family: var(--font-display);
  font-weight: 700;
  cursor: pointer;
}

.dev-immersive .page-tabs__tab[aria-selected="true"] {
  background: var(--brand-accent);
  color: #0d1016;
}

.dev-immersive .section-heading--with-action {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
}

.dev-immersive .final-choice-cta,
.dev-immersive .final-choice-edit,
.dev-immersive .final-choice-modal__primary,
.dev-immersive .final-choice-modal__secondary {
  min-height: 44px;
  border-radius: 12px;
  padding: 0.68rem 1rem;
  font-family: var(--font-display);
  font-weight: 700;
  cursor: pointer;
}

.dev-immersive .final-choice-cta,
.dev-immersive .final-choice-edit,
.dev-immersive .final-choice-modal__primary {
  border: none;
  background: var(--brand-accent);
  color: #0d1016;
}

.dev-immersive .final-choice-section {
  display: grid;
  gap: 1rem;
  margin: 1.2rem 0 clamp(2rem, 4vw, 4rem);
}

.dev-immersive .final-choice-section__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
}

.dev-immersive .final-choice-section__header h2 {
  margin: 0.15rem 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 2.4vw, 2.8rem);
  font-weight: 600;
}

.dev-immersive .final-choice-hero {
  min-height: clamp(340px, 42vw, 720px);
  border: 1px solid rgba(202, 211, 225, 0.14);
  border-radius: 22px;
  display: grid;
  place-items: center;
  padding: clamp(2rem, 5vw, 5rem);
  overflow: hidden;
}

.dev-immersive .final-choice-logo-wrap {
  width: min(620px, 72%);
}

.dev-immersive .final-choice-logo-wrap svg {
  display: block;
  width: 100%;
  height: auto;
}

.dev-immersive .final-choice-variants {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.dev-immersive .final-choice-variant {
  min-height: 190px;
  border: 1px solid rgba(202, 211, 225, 0.14);
  border-radius: 16px;
  display: grid;
  place-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
}

.dev-immersive .final-choice-variant__label {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dev-immersive .final-choice-modal {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.dev-immersive .final-choice-modal[hidden] {
  display: none;
}

.dev-immersive .final-choice-modal__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
}

.dev-immersive .final-choice-modal__dialog {
  position: relative;
  z-index: 1;
  width: min(1040px, 100%);
  max-height: min(860px, calc(100vh - 2rem));
  display: grid;
  grid-template-rows: auto 1fr auto;
  border: 1px solid rgba(202, 211, 225, 0.18);
  border-radius: 20px;
  background: #10151f;
  box-shadow: 0 34px 100px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}

.dev-immersive .final-choice-modal__header,
.dev-immersive .final-choice-modal__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.15rem;
  border-bottom: 1px solid rgba(202, 211, 225, 0.12);
}

.dev-immersive .final-choice-modal__footer {
  border-top: 1px solid rgba(202, 211, 225, 0.12);
  border-bottom: none;
}

.dev-immersive .final-choice-modal__close {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(202, 211, 225, 0.16);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text);
  cursor: pointer;
}

.dev-immersive .final-choice-modal__body {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(300px, 380px);
  gap: 1rem;
  padding: 1rem;
  overflow: auto;
}

.dev-immersive .final-choice-modal__preview {
  min-height: 360px;
  display: grid;
}

.dev-immersive .final-choice-modal__preview-surface {
  min-height: 360px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  padding: 2rem;
}

.dev-immersive .final-choice-modal__controls {
  display: grid;
  gap: 0.85rem;
  align-content: start;
}

.dev-immersive .final-choice-modal__field {
  display: grid;
  gap: 0.35rem;
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dev-immersive .final-choice-modal__input {
  min-height: 44px;
  border: 1px solid rgba(202, 211, 225, 0.18);
  border-radius: 10px;
  padding: 0.7rem 0.85rem;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font: inherit;
  letter-spacing: 0;
  text-transform: none;
}

.dev-immersive .final-choice-modal__empty,
.dev-immersive .final-choice-modal__status {
  margin: 0;
  color: var(--muted);
}

.dev-immersive .iconography-empty {
  min-height: min(520px, 58vh);
  display: grid;
  align-content: center;
  gap: 0.8rem;
  border: 1px solid rgba(202, 211, 225, 0.14);
  border-radius: 22px;
  padding: clamp(2rem, 6vw, 5rem);
  background: rgba(255, 255, 255, 0.035);
}

.dev-immersive .iconography-empty h2,
.dev-immersive .iconography-empty p {
  margin: 0;
}

.dev-immersive .iconography-empty h2 {
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 3vw, 3.2rem);
  font-weight: 600;
}

.dev-immersive .iconography-empty p:not(.eyebrow) {
  color: var(--muted);
  font-size: 1rem;
}

body.dev-immersive[data-active-tab="iconography"] #submission-bar-root {
  display: none;
}
```

Add responsive rules before the final `@media (prefers-reduced-motion: reduce)` block:

```css
@media (max-width: 820px) {
  .dev-immersive .section-heading--with-action,
  .dev-immersive .final-choice-section__header,
  .dev-immersive .final-choice-modal__header,
  .dev-immersive .final-choice-modal__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .dev-immersive .final-choice-variants,
  .dev-immersive .final-choice-modal__body {
    grid-template-columns: 1fr;
  }

  .dev-immersive .final-choice-modal__dialog {
    max-height: calc(100vh - 1rem);
  }
}
```

- [ ] **Step 4: Add admin styles**

Append to `css/admin.css` before `@media (max-width: 700px)`:

```css
.admin-final-choice-card {
  display: grid;
  gap: 1rem;
}

.admin-final-choice {
  display: grid;
  grid-template-columns: minmax(260px, 0.9fr) minmax(320px, 1.1fr);
  gap: 1rem;
}

.admin-final-choice__preview {
  min-height: 180px;
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  overflow: hidden;
}

.admin-final-choice__preview img {
  display: block;
  max-width: 88%;
  max-height: 130px;
  object-fit: contain;
}

.admin-final-choice__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.admin-final-choice__meta-item {
  border: 1px solid var(--admin-border);
  border-radius: 12px;
  background: var(--admin-inner);
  padding: 0.7rem 0.8rem;
  min-width: 0;
}

.admin-final-choice__meta-label,
.admin-final-choice__meta-value {
  margin: 0;
}

.admin-final-choice__meta-label {
  color: var(--admin-muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-final-choice__meta-value {
  margin-top: 0.25rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.admin-final-choice__swatches {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  padding: 0.4rem 0 0 0.28rem;
}
```

Add inside the existing `@media (max-width: 700px)` block:

```css
  .admin-final-choice,
  .admin-final-choice__meta {
    grid-template-columns: 1fr;
  }
```

- [ ] **Step 5: Verify CSS tests pass**

Run:

```powershell
npm test -- tests/dev-immersive-css.test.js tests/admin-css.test.js
```

Expected: all tests in those files pass.

- [ ] **Step 6: Commit styling work**

Run:

```powershell
git add css/dev-immersive.css css/admin.css tests/dev-immersive-css.test.js tests/admin-css.test.js
git commit -m "style: add final choice and tab layouts"
```

### Task 8: Full Verification And Local Smoke

**Files:**
- Modify only if verification finds a concrete defect.

- [ ] **Step 1: Run the full test suite**

Run:

```powershell
npm test
```

Expected: every `node:test` test passes.

- [ ] **Step 2: Start the local server**

Run:

```powershell
$env:PORT='3000'; npm run dev
```

Expected console line:

```text
Dev server ready at http://localhost:3000 (admin password: admin)
```

If port 3000 is busy, run:

```powershell
$env:PORT='3001'; npm run dev
```

- [ ] **Step 3: Smoke test the final-choice endpoint**

In a second terminal while the dev server is running:

```powershell
$body = @{
  logoId = 'logo1'
  paletteKey = 'palette1'
  bgColor = '#18233f'
  logoColor = '#ffffff'
  name = 'Alexis'
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/final-choice -ContentType 'application/json' -Body $body
Invoke-RestMethod -Method Get -Uri http://localhost:3000/api/final-choice
```

Expected: first command returns `status: saved`; second command returns the same `finalChoice.logoId`, colors, name, and a numeric `updatedAt`.

- [ ] **Step 4: Browser smoke test**

Open `http://localhost:3000/`.

Check:
- `Logo & palette` tab is active by default.
- `Iconographie` tab hides the vote side panel and shows the waiting state.
- `Valider notre choix` opens a blank modal except for the reused first name if local storage has one.
- Selecting palette, logo, background color, and logo color enables a valid save.
- After saving, the final section appears above the comparator.
- `Modifier` opens the modal prefilled with the saved global choice.
- `admin.html` shows the `Choix final` card after login with password `admin`.

- [ ] **Step 5: Commit verification fixes if any**

If verification required code changes, run:

```powershell
git add <changed-files>
git commit -m "fix: stabilize final choice flow"
```

If verification passed without changes, do not create an empty commit.

## Self-Review

Spec coverage:
- Global final choice storage and replacement: Tasks 1 and 2.
- Public `GET`/`POST /api/final-choice`: Task 2.
- Tablist, default logo tab, iconography waiting state, hidden inactive panels: Task 3 and Task 7.
- Blank popup from `Valider notre choix`, prefilled popup from `Modifier`: Task 4 and Task 5.
- Palette/logo/background/logo color controls using existing comparator helpers: Task 5.
- Reuse first name from existing identity and store trimmed name on save: Task 5.
- Public final section with large preview plus black/white variants: Task 5 and Task 7.
- Modifier accessible to everyone: Task 5.
- Admin card with empty state and filled state: Task 6 and Task 7.
- Existing vote and analytics flows stay separate: Tasks modify new modules and compose admin without changing vote storage.

Placeholder scan:
- The plan uses concrete filenames, selectors, command lines, response shapes, commit messages, and test names.
- No step relies on deferred implementation text.

Type consistency:
- The API and client use the same field names: `logoId`, `paletteKey`, `bgColor`, `logoColor`, `name`, `updatedAt`.
- KV constants are `FINAL_CHOICE_KEY = 'finalChoice'` and `FINAL_CHOICE_FIELD = 'current'`.
- Admin and public renderers both consume `{ finalChoice }` from `GET /api/final-choice`.
