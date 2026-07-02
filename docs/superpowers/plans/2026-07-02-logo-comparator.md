# Comparateur de logos SYMA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static mini-site (no framework) where clients compare two independently-configurable logo displays, vote 👍/👎 on 5 logo proposals, and leave text feedback — all retrievable by the site owner via a password-protected `/admin` page, backed by Vercel serverless functions + Vercel KV.

**Architecture:** Vanilla HTML/CSS/JS frontend using native ES modules (no bundler). Pure-logic modules (color/state reducers, validation, vote aggregation, admin auth) are unit-tested with Node's built-in test runner. Vercel serverless functions under `/api` read/write Vercel KV (Upstash Redis) through a thin wrapper, with all handler business logic written as dependency-injected factories (`createXHandler(kv, ...)`) so they're testable with an in-memory fake — the same in-memory implementation also powers a local `dev-server.js` for full manual verification without needing real Vercel/KV credentials during development.

**Tech Stack:** Vanilla JavaScript (ES modules), HTML5, CSS3, Node.js serverless functions (Vercel), Vercel KV (`@vercel/kv`), Node's built-in `node:test` test runner. No frontend framework, no bundler, no CSS framework.

## Global Constraints

- Node.js >= 18 required (native `fetch`, `node:test`, `crypto.randomUUID` in-browser).
- No frontend build step: all JS is loaded via `<script type="module">` and runs unmodified in the browser.
- Single production dependency for the whole project: `@vercel/kv` (added in Task 6). No other npm dependencies, dev or prod.
- Tests run via `node --test tests/` (or `npm test`) — no Jest/Mocha/etc.
- Palette 1 (exact hex, in this order): `#18233f`, `#788ce3`, `#92bad4`, `#f7f3e7`, `#e0f479`, `#000000`, `#ffffff`.
- Palette 2 (exact hex, in this order): `#f35b43`, `#610023`, `#9f9536`, `#f7c6dc`, `#f7eee5`, `#000000`, `#ffffff`.
- Logo mapping (id → display name → source file), fixed order:
  - `logo1` → "Logo 1" → `SVG/FAT.svg`
  - `logo2` → "Logo 2" → `SVG/Goofy.svg`
  - `logo3` → "Logo 3" → `SVG/Journal.svg`
  - `logo4` → "Logo 4" → `SVG/le beau.svg`
  - `logo5` → "Logo 5" → `SVG/manuscrit.svg`
- Vote rule: clicking the currently-active thumb again removes the vote (toggle off); clicking the opposite thumb replaces the vote. One active vote per visitor per logo.
- Visitor identity: a UUID + display name stored in the browser's `localStorage`, generated with `crypto.randomUUID()`; the name is requested via the native `window.prompt()` the first time it's needed (first vote or first message) — no custom modal, per YAGNI.
- Admin auth: no cookies/sessions. The login endpoint returns a static token computed as `sha256(password + ':syma-logo-admin')`; the frontend stores it in `sessionStorage` and sends it as `Authorization: Bearer <token>` on protected requests; the server recomputes and compares it on every protected request.
- Site title (used in both `index.html` and as the header text): "SYMA Studio — Proposition de logo".

---

### Task 1: Project scaffolding + palette & logo data modules

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `js/palettes.js`
- Create: `js/logos.js`
- Test: `tests/palettes.test.js`
- Test: `tests/logos.test.js`

**Interfaces:**
- Produces: `PALETTES` (object keyed by `'palette1' | 'palette2'`, each `{ key, label, colors: string[7] }`), `PALETTE_KEYS` (`['palette1', 'palette2']`) from `js/palettes.js`.
- Produces: `LOGOS` (array of `{ id, name, src }`, 5 entries), `LOGO_IDS` (`['logo1', ..., 'logo5']`) from `js/logos.js`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "syma-logo-comparator",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "dev": "node dev-server.js"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.vercel/
```

- [ ] **Step 3: Write the failing tests**

`tests/palettes.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTES, PALETTE_KEYS } from '../js/palettes.js';

test('exposes exactly two palettes', () => {
  assert.deepEqual(PALETTE_KEYS, ['palette1', 'palette2']);
});

test('palette1 has the 7 expected colors', () => {
  assert.deepEqual(PALETTES.palette1.colors, [
    '#18233f', '#788ce3', '#92bad4', '#f7f3e7', '#e0f479', '#000000', '#ffffff',
  ]);
});

test('palette2 has the 7 expected colors', () => {
  assert.deepEqual(PALETTES.palette2.colors, [
    '#f35b43', '#610023', '#9f9536', '#f7c6dc', '#f7eee5', '#000000', '#ffffff',
  ]);
});

test('every palette includes black and white', () => {
  for (const key of PALETTE_KEYS) {
    assert.ok(PALETTES[key].colors.includes('#000000'));
    assert.ok(PALETTES[key].colors.includes('#ffffff'));
  }
});
```

`tests/logos.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LOGOS, LOGO_IDS } from '../js/logos.js';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('exposes exactly 5 logos with sequential ids', () => {
  assert.deepEqual(LOGO_IDS, ['logo1', 'logo2', 'logo3', 'logo4', 'logo5']);
});

test('each logo file exists on disk', () => {
  for (const logo of LOGOS) {
    const fullPath = path.join(projectRoot, logo.src);
    assert.ok(existsSync(fullPath), `Missing file for ${logo.id}: ${fullPath}`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL with "Cannot find module '../js/palettes.js'" (and similarly for logos.js) — the modules don't exist yet.

- [ ] **Step 5: Implement `js/palettes.js`**

```js
export const PALETTES = {
  palette1: {
    key: 'palette1',
    label: 'Palette 1',
    colors: ['#18233f', '#788ce3', '#92bad4', '#f7f3e7', '#e0f479', '#000000', '#ffffff'],
  },
  palette2: {
    key: 'palette2',
    label: 'Palette 2',
    colors: ['#f35b43', '#610023', '#9f9536', '#f7c6dc', '#f7eee5', '#000000', '#ffffff'],
  },
};

export const PALETTE_KEYS = Object.keys(PALETTES);
```

- [ ] **Step 6: Implement `js/logos.js`**

```js
export const LOGOS = [
  { id: 'logo1', name: 'Logo 1', src: 'SVG/FAT.svg' },
  { id: 'logo2', name: 'Logo 2', src: 'SVG/Goofy.svg' },
  { id: 'logo3', name: 'Logo 3', src: 'SVG/Journal.svg' },
  { id: 'logo4', name: 'Logo 4', src: 'SVG/le beau.svg' },
  { id: 'logo5', name: 'Logo 5', src: 'SVG/manuscrit.svg' },
];

export const LOGO_IDS = LOGOS.map((logo) => logo.id);
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS (6 tests)

- [ ] **Step 8: Commit**

```bash
git add package.json .gitignore js/palettes.js js/logos.js tests/palettes.test.js tests/logos.test.js
git commit -m "feat: add palette and logo data modules"
```

---

### Task 2: Comparator state reducer (pure logic)

**Files:**
- Create: `js/comparator-state.js`
- Test: `tests/comparator-state.test.js`

**Interfaces:**
- Consumes: `PALETTES` from `js/palettes.js` (Task 1), `LOGOS` from `js/logos.js` (Task 1).
- Produces: `initialState(paletteKey = 'palette1', logoId = LOGOS[0].id)`, `withPaletteChange(state, paletteKey)`, `withLogoChange(state, logoId)`, `withBgColor(state, bgColor)`, `withLogoColor(state, logoColor)` — all pure, return new `{ logoId, paletteKey, bgColor, logoColor }` objects without mutating their input.

- [ ] **Step 1: Write the failing test**

`tests/comparator-state.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState,
  withPaletteChange,
  withLogoChange,
  withBgColor,
  withLogoColor,
} from '../js/comparator-state.js';

test('initialState defaults to palette1 first color for bg and logo', () => {
  const state = initialState();
  assert.equal(state.paletteKey, 'palette1');
  assert.equal(state.bgColor, '#18233f');
  assert.equal(state.logoColor, '#18233f');
});

test('initialState accepts a custom palette and logo', () => {
  const state = initialState('palette2', 'logo3');
  assert.equal(state.logoId, 'logo3');
  assert.equal(state.bgColor, '#f35b43');
});

test('withPaletteChange resets colors to the new palette first color', () => {
  const state = { logoId: 'logo2', paletteKey: 'palette1', bgColor: '#e0f479', logoColor: '#ffffff' };
  const next = withPaletteChange(state, 'palette2');
  assert.equal(next.paletteKey, 'palette2');
  assert.equal(next.bgColor, '#f35b43');
  assert.equal(next.logoColor, '#f35b43');
  assert.equal(next.logoId, 'logo2');
});

test('withPaletteChange does not mutate the input state', () => {
  const state = initialState();
  withPaletteChange(state, 'palette2');
  assert.equal(state.paletteKey, 'palette1');
});

test('withLogoChange only changes logoId', () => {
  const state = initialState();
  const next = withLogoChange(state, 'logo5');
  assert.equal(next.logoId, 'logo5');
  assert.equal(next.bgColor, state.bgColor);
});

test('withBgColor and withLogoColor update independently', () => {
  const state = initialState();
  const withBg = withBgColor(state, '#ffffff');
  assert.equal(withBg.bgColor, '#ffffff');
  assert.equal(withBg.logoColor, state.logoColor);

  const withLogo = withLogoColor(state, '#000000');
  assert.equal(withLogo.logoColor, '#000000');
  assert.equal(withLogo.bgColor, state.bgColor);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/comparator-state.test.js`
Expected: FAIL with "Cannot find module '../js/comparator-state.js'"

- [ ] **Step 3: Implement `js/comparator-state.js`**

```js
import { PALETTES } from './palettes.js';
import { LOGOS } from './logos.js';

export function initialState(paletteKey = 'palette1', logoId = LOGOS[0].id) {
  const palette = PALETTES[paletteKey];
  return {
    logoId,
    paletteKey,
    bgColor: palette.colors[0],
    logoColor: palette.colors[0],
  };
}

export function withPaletteChange(state, paletteKey) {
  const palette = PALETTES[paletteKey];
  return {
    ...state,
    paletteKey,
    bgColor: palette.colors[0],
    logoColor: palette.colors[0],
  };
}

export function withLogoChange(state, logoId) {
  return { ...state, logoId };
}

export function withBgColor(state, bgColor) {
  return { ...state, bgColor };
}

export function withLogoColor(state, logoColor) {
  return { ...state, logoColor };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/comparator-state.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add js/comparator-state.js tests/comparator-state.test.js
git commit -m "feat: add comparator state reducer"
```

---

### Task 3: Visitor identity module

**Files:**
- Create: `js/identity.js`
- Test: `tests/identity.test.js`

**Interfaces:**
- Produces: `getIdentity(storage = globalThis.localStorage)` → `{ id, name }`; `setName(name, storage = globalThis.localStorage)`; `ensureIdentity({ storage, generateId, promptForName } = {})` → `{ id, name }`, generating/persisting an id via `generateId` if missing, and prompting for a name via `promptForName` only if missing.

- [ ] **Step 1: Write the failing test**

`tests/identity.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getIdentity, setName, ensureIdentity } from '../js/identity.js';

function createFakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = value; },
  };
}

test('getIdentity returns nulls when storage is empty', () => {
  const storage = createFakeStorage();
  assert.deepEqual(getIdentity(storage), { id: null, name: null });
});

test('setName writes the name to storage', () => {
  const storage = createFakeStorage();
  setName('Alexis', storage);
  assert.equal(storage.getItem('syma_visitor_name'), 'Alexis');
});

test('ensureIdentity generates and persists an id when missing', () => {
  const storage = createFakeStorage();
  const identity = ensureIdentity({
    storage,
    generateId: () => 'fixed-id-123',
    promptForName: () => 'Camille',
  });
  assert.equal(identity.id, 'fixed-id-123');
  assert.equal(storage.getItem('syma_visitor_id'), 'fixed-id-123');
});

test('ensureIdentity prompts for a name only when missing, and persists it', () => {
  const storage = createFakeStorage({ syma_visitor_id: 'existing-id' });
  let promptCalls = 0;
  const identity = ensureIdentity({
    storage,
    generateId: () => 'should-not-be-used',
    promptForName: () => { promptCalls += 1; return 'Dana'; },
  });
  assert.equal(identity.id, 'existing-id');
  assert.equal(identity.name, 'Dana');
  assert.equal(promptCalls, 1);
  assert.equal(storage.getItem('syma_visitor_name'), 'Dana');
});

test('ensureIdentity does not prompt again once a name exists', () => {
  const storage = createFakeStorage({ syma_visitor_id: 'id-1', syma_visitor_name: 'Existing' });
  let promptCalls = 0;
  const identity = ensureIdentity({
    storage,
    promptForName: () => { promptCalls += 1; return 'New Name'; },
  });
  assert.equal(identity.name, 'Existing');
  assert.equal(promptCalls, 0);
});

test('ensureIdentity leaves name null if the prompt is cancelled', () => {
  const storage = createFakeStorage({ syma_visitor_id: 'id-1' });
  const identity = ensureIdentity({
    storage,
    promptForName: () => null,
  });
  assert.equal(identity.name, null);
  assert.equal(storage.getItem('syma_visitor_name'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/identity.test.js`
Expected: FAIL with "Cannot find module '../js/identity.js'"

- [ ] **Step 3: Implement `js/identity.js`**

```js
const STORAGE_KEY_ID = 'syma_visitor_id';
const STORAGE_KEY_NAME = 'syma_visitor_name';

export function getIdentity(storage = globalThis.localStorage) {
  return {
    id: storage.getItem(STORAGE_KEY_ID),
    name: storage.getItem(STORAGE_KEY_NAME),
  };
}

export function setName(name, storage = globalThis.localStorage) {
  storage.setItem(STORAGE_KEY_NAME, name);
}

export function ensureIdentity({
  storage = globalThis.localStorage,
  generateId = () => globalThis.crypto.randomUUID(),
  promptForName = () => globalThis.prompt('Votre prénom ?'),
} = {}) {
  let { id, name } = getIdentity(storage);

  if (!id) {
    id = generateId();
    storage.setItem(STORAGE_KEY_ID, id);
  }

  if (!name) {
    name = promptForName();
    if (name) {
      storage.setItem(STORAGE_KEY_NAME, name);
    }
  }

  return { id, name };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/identity.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add js/identity.js tests/identity.test.js
git commit -m "feat: add visitor identity module"
```

---

### Task 4: Vote aggregation & toggle logic (pure)

**Files:**
- Create: `api/_lib/voteLogic.js`
- Test: `tests/voteLogic.test.js`

**Interfaces:**
- Produces: `resolveVoteAction(existingEntry, requestedValue)` → `{ action: 'delete' }` or `{ action: 'set', value }`; `computeVoteSummary(entries)` where `entries` is an array of `[visitorId, { name, value, ts }]` pairs → `{ up, down, voters: [{ visitorId, name, value, ts }] }` sorted by `ts` ascending.

- [ ] **Step 1: Write the failing test**

`tests/voteLogic.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveVoteAction, computeVoteSummary } from '../api/_lib/voteLogic.js';

test('resolveVoteAction sets a new vote when none exists', () => {
  assert.deepEqual(resolveVoteAction(null, 'up'), { action: 'set', value: 'up' });
});

test('resolveVoteAction deletes when clicking the same active vote again', () => {
  assert.deepEqual(resolveVoteAction({ value: 'up' }, 'up'), { action: 'delete' });
});

test('resolveVoteAction replaces an opposite vote', () => {
  assert.deepEqual(resolveVoteAction({ value: 'up' }, 'down'), { action: 'set', value: 'down' });
});

test('computeVoteSummary counts up and down votes', () => {
  const entries = [
    ['v1', { name: 'Alexis', value: 'up', ts: 200 }],
    ['v2', { name: 'Camille', value: 'down', ts: 100 }],
    ['v3', { name: 'Dana', value: 'up', ts: 300 }],
  ];
  const summary = computeVoteSummary(entries);
  assert.equal(summary.up, 2);
  assert.equal(summary.down, 1);
});

test('computeVoteSummary orders voters chronologically', () => {
  const entries = [
    ['v1', { name: 'Alexis', value: 'up', ts: 200 }],
    ['v2', { name: 'Camille', value: 'down', ts: 100 }],
  ];
  const summary = computeVoteSummary(entries);
  assert.deepEqual(summary.voters.map((voter) => voter.name), ['Camille', 'Alexis']);
});

test('computeVoteSummary returns zero counts for empty entries', () => {
  const summary = computeVoteSummary([]);
  assert.deepEqual(summary, { up: 0, down: 0, voters: [] });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/voteLogic.test.js`
Expected: FAIL with "Cannot find module '../api/_lib/voteLogic.js'"

- [ ] **Step 3: Implement `api/_lib/voteLogic.js`**

```js
export function resolveVoteAction(existingEntry, requestedValue) {
  if (existingEntry && existingEntry.value === requestedValue) {
    return { action: 'delete' };
  }
  return { action: 'set', value: requestedValue };
}

export function computeVoteSummary(entries) {
  let up = 0;
  let down = 0;
  const voters = [];

  for (const [visitorId, entry] of entries) {
    if (entry.value === 'up') up += 1;
    if (entry.value === 'down') down += 1;
    voters.push({ visitorId, name: entry.name, value: entry.value, ts: entry.ts });
  }

  voters.sort((a, b) => a.ts - b.ts);

  return { up, down, voters };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/voteLogic.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add api/_lib/voteLogic.js tests/voteLogic.test.js
git commit -m "feat: add vote toggle and aggregation logic"
```

---

### Task 5: Validation, admin auth helpers, and the admin-login handler

**Files:**
- Create: `api/_lib/validate.js`
- Create: `api/_lib/adminAuth.js`
- Create: `api/admin-login.js`
- Create: `tests/helpers/http.js`
- Test: `tests/validate.test.js`
- Test: `tests/adminAuth.test.js`
- Test: `tests/api-adminLogin.test.js`

**Interfaces:**
- Consumes: `LOGO_IDS` from `js/logos.js` (Task 1).
- Produces: `isValidLogoId(logoId)`, `isValidVoteValue(value)`, `sanitizeName(name)` (trims, defaults to `'Anonyme'`, max 60 chars), `sanitizeMessage(message)` (trims, returns `null` if empty, max 2000 chars) from `api/_lib/validate.js`.
- Produces: `computeAdminToken(password)`, `isAuthorizedToken(token, adminPassword)`, `extractBearerToken(authorizationHeader)` from `api/_lib/adminAuth.js`.
- Produces: `createAdminLoginHandler(getAdminPassword = () => process.env.ADMIN_PASSWORD)` from `api/admin-login.js` (default export is `createAdminLoginHandler()`), a Vercel-style `(req, res) => void` handler.
- Produces: `createMockRes()` from `tests/helpers/http.js` — a fake Vercel `res` object with chainable `.status(code)` and `.json(payload)`, exposing `.statusCode` and `.body` for assertions. Used by this task and all later API handler tests.

- [ ] **Step 1: Write the failing tests**

`tests/helpers/http.js` (test helper, not a test file itself):

```js
export function createMockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}
```

`tests/validate.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidLogoId, isValidVoteValue, sanitizeName, sanitizeMessage } from '../api/_lib/validate.js';

test('isValidLogoId accepts known ids and rejects others', () => {
  assert.equal(isValidLogoId('logo1'), true);
  assert.equal(isValidLogoId('logo5'), true);
  assert.equal(isValidLogoId('logo6'), false);
  assert.equal(isValidLogoId(''), false);
});

test('isValidVoteValue accepts only up or down', () => {
  assert.equal(isValidVoteValue('up'), true);
  assert.equal(isValidVoteValue('down'), true);
  assert.equal(isValidVoteValue('maybe'), false);
});

test('sanitizeName trims whitespace and defaults to Anonyme', () => {
  assert.equal(sanitizeName('  Alexis  '), 'Alexis');
  assert.equal(sanitizeName(''), 'Anonyme');
  assert.equal(sanitizeName(undefined), 'Anonyme');
});

test('sanitizeName truncates overly long names', () => {
  const longName = 'a'.repeat(100);
  assert.equal(sanitizeName(longName).length, 60);
});

test('sanitizeMessage returns null for empty input', () => {
  assert.equal(sanitizeMessage('   '), null);
  assert.equal(sanitizeMessage(undefined), null);
});

test('sanitizeMessage trims and truncates', () => {
  assert.equal(sanitizeMessage('  hello  '), 'hello');
  const longMessage = 'a'.repeat(2100);
  assert.equal(sanitizeMessage(longMessage).length, 2000);
});
```

`tests/adminAuth.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAdminToken, isAuthorizedToken, extractBearerToken } from '../api/_lib/adminAuth.js';

test('computeAdminToken is deterministic for the same password', () => {
  assert.equal(computeAdminToken('secret'), computeAdminToken('secret'));
});

test('computeAdminToken differs for different passwords', () => {
  assert.notEqual(computeAdminToken('secret'), computeAdminToken('other'));
});

test('isAuthorizedToken accepts a token matching the admin password', () => {
  const token = computeAdminToken('secret');
  assert.equal(isAuthorizedToken(token, 'secret'), true);
});

test('isAuthorizedToken rejects a mismatched token', () => {
  assert.equal(isAuthorizedToken('wrong-token', 'secret'), false);
});

test('isAuthorizedToken rejects when password or token is missing', () => {
  assert.equal(isAuthorizedToken(null, 'secret'), false);
  assert.equal(isAuthorizedToken(computeAdminToken('secret'), undefined), false);
});

test('extractBearerToken parses the Authorization header', () => {
  assert.equal(extractBearerToken('Bearer abc123'), 'abc123');
  assert.equal(extractBearerToken('Basic abc123'), null);
  assert.equal(extractBearerToken(undefined), null);
});
```

`tests/api-adminLogin.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminLoginHandler } from '../api/admin-login.js';
import { computeAdminToken } from '../api/_lib/adminAuth.js';
import { createMockRes } from './helpers/http.js';

test('returns a token for the correct password', () => {
  const handler = createAdminLoginHandler(() => 'secret');
  const res = createMockRes();
  handler({ method: 'POST', body: { password: 'secret' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.token, computeAdminToken('secret'));
});

test('rejects an incorrect password', () => {
  const handler = createAdminLoginHandler(() => 'secret');
  const res = createMockRes();
  handler({ method: 'POST', body: { password: 'wrong' } }, res);
  assert.equal(res.statusCode, 401);
});

test('rejects a missing password', () => {
  const handler = createAdminLoginHandler(() => 'secret');
  const res = createMockRes();
  handler({ method: 'POST', body: {} }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects non-POST methods', () => {
  const handler = createAdminLoginHandler(() => 'secret');
  const res = createMockRes();
  handler({ method: 'GET', body: {} }, res);
  assert.equal(res.statusCode, 405);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL — `Cannot find module '../api/_lib/validate.js'`, `'../api/_lib/adminAuth.js'`, `'../api/admin-login.js'`.

- [ ] **Step 3: Implement `api/_lib/validate.js`**

```js
import { LOGO_IDS } from '../../js/logos.js';

const MAX_NAME_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 2000;

export function isValidLogoId(logoId) {
  return LOGO_IDS.includes(logoId);
}

export function isValidVoteValue(value) {
  return value === 'up' || value === 'down';
}

export function sanitizeName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return 'Anonyme';
  return trimmed.slice(0, MAX_NAME_LENGTH);
}

export function sanitizeMessage(message) {
  const trimmed = typeof message === 'string' ? message.trim() : '';
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_MESSAGE_LENGTH);
}
```

- [ ] **Step 4: Implement `api/_lib/adminAuth.js`**

```js
import { createHash, timingSafeEqual } from 'node:crypto';

const TOKEN_SALT = 'syma-logo-admin';

export function computeAdminToken(password) {
  return createHash('sha256').update(`${password}:${TOKEN_SALT}`).digest('hex');
}

export function isAuthorizedToken(token, adminPassword) {
  if (!token || !adminPassword) return false;
  const expected = computeAdminToken(adminPassword);
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);
  if (tokenBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(tokenBuffer, expectedBuffer);
}

export function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) return null;
  return authorizationHeader.slice('Bearer '.length).trim() || null;
}
```

- [ ] **Step 5: Implement `api/admin-login.js`**

```js
import { computeAdminToken } from './_lib/adminAuth.js';

export function createAdminLoginHandler(getAdminPassword = () => process.env.ADMIN_PASSWORD) {
  return function adminLoginHandler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const adminPassword = getAdminPassword();
    const submittedPassword = req.body && req.body.password;

    if (!submittedPassword) {
      res.status(400).json({ error: 'Password required' });
      return;
    }

    if (!adminPassword || submittedPassword !== adminPassword) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    res.status(200).json({ token: computeAdminToken(adminPassword) });
  };
}

export default createAdminLoginHandler();
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS (all tests, including the 16 new ones from this task)

- [ ] **Step 7: Commit**

```bash
git add api/_lib/validate.js api/_lib/adminAuth.js api/admin-login.js tests/helpers/http.js tests/validate.test.js tests/adminAuth.test.js tests/api-adminLogin.test.js
git commit -m "feat: add validation, admin auth helpers and admin-login handler"
```

---

### Task 6: KV client wrapper + in-memory KV implementation

**Files:**
- Modify: `package.json` (add `@vercel/kv` dependency)
- Create: `api/_lib/kv.js`
- Create: `api/_lib/memoryKv.js`
- Create: `tests/helpers/fakeKv.js`
- Test: `tests/memoryKv.test.js`

**Interfaces:**
- Produces: `getKv()` from `api/_lib/kv.js` — returns the real `@vercel/kv` `kv` client (used only by production handler default exports).
- Produces: `createMemoryKv()` from `api/_lib/memoryKv.js` — returns an in-memory object implementing the subset of the Redis/`@vercel/kv` API used by this project: `async hset(key, fieldValues)`, `async hdel(key, field)`, `async hgetall(key)` (returns `null` if the hash is empty/missing), `async rpush(key, value)`, `async lrange(key, start, stop)` (Redis semantics: `stop === -1` means "to the end"). Used both by `dev-server.js` (Task 9) and by tests (via the re-export below).
- Produces: `createFakeKv` from `tests/helpers/fakeKv.js`, a re-export of `createMemoryKv` for use in API handler tests (Tasks 7 and 8).

- [ ] **Step 1: Add the `@vercel/kv` dependency to `package.json`**

Modify `package.json` so it reads:

```json
{
  "name": "syma-logo-comparator",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "dev": "node dev-server.js"
  },
  "dependencies": {
    "@vercel/kv": "^2.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: `@vercel/kv` added to `node_modules/` and `package-lock.json` created.

- [ ] **Step 3: Write the failing test**

`tests/memoryKv.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryKv } from '../api/_lib/memoryKv.js';

test('hset then hgetall returns stored fields', async () => {
  const kv = createMemoryKv();
  await kv.hset('vote:logo1', { v1: { value: 'up' } });
  const all = await kv.hgetall('vote:logo1');
  assert.deepEqual(all, { v1: { value: 'up' } });
});

test('hgetall returns null for an unknown key', async () => {
  const kv = createMemoryKv();
  assert.equal(await kv.hgetall('vote:unknown'), null);
});

test('hdel removes a field and reports whether it existed', async () => {
  const kv = createMemoryKv();
  await kv.hset('vote:logo1', { v1: { value: 'up' } });
  assert.equal(await kv.hdel('vote:logo1', 'v1'), 1);
  assert.equal(await kv.hdel('vote:logo1', 'v1'), 0);
  assert.equal(await kv.hgetall('vote:logo1'), null);
});

test('rpush and lrange preserve insertion order', async () => {
  const kv = createMemoryKv();
  await kv.rpush('messages', { message: 'first' });
  await kv.rpush('messages', { message: 'second' });
  const all = await kv.lrange('messages', 0, -1);
  assert.deepEqual(all.map((m) => m.message), ['first', 'second']);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `node --test tests/memoryKv.test.js`
Expected: FAIL with "Cannot find module '../api/_lib/memoryKv.js'"

- [ ] **Step 5: Implement `api/_lib/memoryKv.js`**

```js
export function createMemoryKv() {
  const hashes = new Map();
  const lists = new Map();

  return {
    async hset(key, fieldValues) {
      const hash = hashes.get(key) || new Map();
      for (const [field, value] of Object.entries(fieldValues)) {
        hash.set(field, value);
      }
      hashes.set(key, hash);
      return Object.keys(fieldValues).length;
    },

    async hdel(key, field) {
      const hash = hashes.get(key);
      if (!hash) return 0;
      const existed = hash.delete(field);
      return existed ? 1 : 0;
    },

    async hgetall(key) {
      const hash = hashes.get(key);
      if (!hash || hash.size === 0) return null;
      return Object.fromEntries(hash.entries());
    },

    async rpush(key, value) {
      const list = lists.get(key) || [];
      list.push(value);
      lists.set(key, list);
      return list.length;
    },

    async lrange(key, start, stop) {
      const list = lists.get(key) || [];
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end);
    },
  };
}
```

- [ ] **Step 6: Implement `api/_lib/kv.js`**

```js
import { kv } from '@vercel/kv';

export function getKv() {
  return kv;
}
```

- [ ] **Step 7: Implement `tests/helpers/fakeKv.js`**

```js
export { createMemoryKv as createFakeKv } from '../../api/_lib/memoryKv.js';
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS (all tests, including the 4 new ones from this task)

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json api/_lib/kv.js api/_lib/memoryKv.js tests/helpers/fakeKv.js tests/memoryKv.test.js
git commit -m "feat: add KV client wrapper and in-memory KV implementation"
```

---

### Task 7: `/api/vote` and `/api/votes` handlers

**Files:**
- Create: `api/vote.js`
- Create: `api/votes.js`
- Test: `tests/api-vote.test.js`
- Test: `tests/api-votes.test.js`

**Interfaces:**
- Consumes: `getKv` (`api/_lib/kv.js`, Task 6), `isValidLogoId`/`isValidVoteValue`/`sanitizeName` (`api/_lib/validate.js`, Task 5), `resolveVoteAction`/`computeVoteSummary` (`api/_lib/voteLogic.js`, Task 4), `extractBearerToken`/`isAuthorizedToken` (`api/_lib/adminAuth.js`, Task 5), `LOGO_IDS` (`js/logos.js`, Task 1), `createFakeKv` (`tests/helpers/fakeKv.js`, Task 6), `createMockRes` (`tests/helpers/http.js`, Task 5).
- Produces: `createVoteHandler(kv, now = () => Date.now())` from `api/vote.js` (default export: `createVoteHandler(getKv())`). POST body `{ logoId, visitorId, name, value }` → `200 { status: 'saved', value }` or `200 { status: 'removed' }` or `400` on invalid input or `405` on wrong method.
- Produces: `createVotesHandler(kv, getAdminPassword = () => process.env.ADMIN_PASSWORD)` from `api/votes.js` (default export: `createVotesHandler(getKv())`). GET → `200` object keyed by each of the 5 logo ids, each `{ up, down }` (plus `voters` array when a valid admin Bearer token is supplied), or `405` on wrong method.

- [ ] **Step 1: Write the failing tests**

`tests/api-vote.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoteHandler } from '../api/vote.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

test('records a new vote', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv, () => 12345);
  const res = createMockRes();
  await handler({ method: 'POST', body: { logoId: 'logo1', visitorId: 'v1', name: 'Alexis', value: 'up' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: 'saved', value: 'up' });
  const stored = await kv.hgetall('vote:logo1');
  assert.deepEqual(stored, { v1: { name: 'Alexis', value: 'up', ts: 12345 } });
});

test('toggles off a vote when clicking the same value again', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv, () => 12345);
  await handler({ method: 'POST', body: { logoId: 'logo1', visitorId: 'v1', name: 'Alexis', value: 'up' } }, createMockRes());
  const res2 = createMockRes();
  await handler({ method: 'POST', body: { logoId: 'logo1', visitorId: 'v1', name: 'Alexis', value: 'up' } }, res2);
  assert.deepEqual(res2.body, { status: 'removed' });
  assert.equal(await kv.hgetall('vote:logo1'), null);
});

test('changes an existing vote to the opposite value', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv, () => 999);
  await handler({ method: 'POST', body: { logoId: 'logo1', visitorId: 'v1', name: 'Alexis', value: 'up' } }, createMockRes());
  const res = createMockRes();
  await handler({ method: 'POST', body: { logoId: 'logo1', visitorId: 'v1', name: 'Alexis', value: 'down' } }, res);
  assert.deepEqual(res.body, { status: 'saved', value: 'down' });
});

test('rejects an invalid logoId', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', body: { logoId: 'logo9', visitorId: 'v1', value: 'up' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects an invalid vote value', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', body: { logoId: 'logo1', visitorId: 'v1', value: 'maybe' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects a missing visitorId', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', body: { logoId: 'logo1', value: 'up' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects non-POST methods', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv);
  const res = createMockRes();
  await handler({ method: 'GET', body: {} }, res);
  assert.equal(res.statusCode, 405);
});
```

`tests/api-votes.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createVotesHandler } from '../api/votes.js';
import { createVoteHandler } from '../api/vote.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';
import { computeAdminToken } from '../api/_lib/adminAuth.js';

async function seedVote(kv, logoId, visitorId, name, value) {
  const voteHandler = createVoteHandler(kv, () => 1);
  await voteHandler({ method: 'POST', body: { logoId, visitorId, name, value } }, createMockRes());
}

test('returns aggregated counts without voter detail for anonymous requests', async () => {
  const kv = createFakeKv();
  await seedVote(kv, 'logo1', 'v1', 'Alexis', 'up');
  await seedVote(kv, 'logo1', 'v2', 'Camille', 'down');
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();
  await handler({ method: 'GET', headers: {} }, res);
  assert.deepEqual(res.body.logo1, { up: 1, down: 1 });
  assert.equal(res.body.logo1.voters, undefined);
});

test('includes voter detail when a valid admin token is provided', async () => {
  const kv = createFakeKv();
  await seedVote(kv, 'logo1', 'v1', 'Alexis', 'up');
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();
  const token = computeAdminToken('secret');
  await handler({ method: 'GET', headers: { authorization: `Bearer ${token}` } }, res);
  assert.equal(res.body.logo1.voters.length, 1);
  assert.equal(res.body.logo1.voters[0].name, 'Alexis');
});

test('every known logo id is present even with no votes', async () => {
  const kv = createFakeKv();
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();
  await handler({ method: 'GET', headers: {} }, res);
  assert.deepEqual(Object.keys(res.body).sort(), ['logo1', 'logo2', 'logo3', 'logo4', 'logo5']);
});

test('rejects non-GET methods', async () => {
  const kv = createFakeKv();
  const handler = createVotesHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL with "Cannot find module '../api/vote.js'" / "'../api/votes.js'"

- [ ] **Step 3: Implement `api/vote.js`**

```js
import { getKv } from './_lib/kv.js';
import { isValidLogoId, isValidVoteValue, sanitizeName } from './_lib/validate.js';
import { resolveVoteAction } from './_lib/voteLogic.js';

export function createVoteHandler(kv, now = () => Date.now()) {
  return async function voteHandler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { logoId, visitorId, name, value } = req.body || {};

    if (!isValidLogoId(logoId) || !visitorId || !isValidVoteValue(value)) {
      res.status(400).json({ error: 'Invalid vote payload' });
      return;
    }

    const key = `vote:${logoId}`;
    const hash = (await kv.hgetall(key)) || {};
    const existingEntry = hash[visitorId] || null;
    const action = resolveVoteAction(existingEntry, value);

    if (action.action === 'delete') {
      await kv.hdel(key, visitorId);
      res.status(200).json({ status: 'removed' });
      return;
    }

    await kv.hset(key, {
      [visitorId]: { name: sanitizeName(name), value: action.value, ts: now() },
    });
    res.status(200).json({ status: 'saved', value: action.value });
  };
}

export default createVoteHandler(getKv());
```

- [ ] **Step 4: Implement `api/votes.js`**

```js
import { getKv } from './_lib/kv.js';
import { LOGO_IDS } from '../js/logos.js';
import { computeVoteSummary } from './_lib/voteLogic.js';
import { extractBearerToken, isAuthorizedToken } from './_lib/adminAuth.js';

export function createVotesHandler(kv, getAdminPassword = () => process.env.ADMIN_PASSWORD) {
  return async function votesHandler(req, res) {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const token = extractBearerToken(req.headers && req.headers.authorization);
    const isAdmin = isAuthorizedToken(token, getAdminPassword());

    const result = {};
    for (const logoId of LOGO_IDS) {
      const hash = (await kv.hgetall(`vote:${logoId}`)) || {};
      const summary = computeVoteSummary(Object.entries(hash));
      result[logoId] = isAdmin ? summary : { up: summary.up, down: summary.down };
    }

    res.status(200).json(result);
  };
}

export default createVotesHandler(getKv());
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS (all tests, including the 11 new ones from this task)

- [ ] **Step 6: Commit**

```bash
git add api/vote.js api/votes.js tests/api-vote.test.js tests/api-votes.test.js
git commit -m "feat: add vote and votes API handlers"
```

---

### Task 8: `/api/message` and `/api/messages` handlers

**Files:**
- Create: `api/message.js`
- Create: `api/messages.js`
- Test: `tests/api-message.test.js`
- Test: `tests/api-messages.test.js`

**Interfaces:**
- Consumes: `getKv` (`api/_lib/kv.js`, Task 6), `sanitizeName`/`sanitizeMessage` (`api/_lib/validate.js`, Task 5), `extractBearerToken`/`isAuthorizedToken` (`api/_lib/adminAuth.js`, Task 5), `createFakeKv`/`createMockRes` (Tasks 5–6).
- Produces: `createMessageHandler(kv, now = () => Date.now())` from `api/message.js` (default export: `createMessageHandler(getKv())`). POST body `{ name, message }` → `200 { status: 'saved' }` or `400` if the message is empty or `405` on wrong method.
- Produces: `createMessagesHandler(kv, getAdminPassword = () => process.env.ADMIN_PASSWORD)` from `api/messages.js` (default export: `createMessagesHandler(getKv())`). GET with a valid admin Bearer token → `200` array of `{ name, message, ts }`, most-recent-first; `401` without a valid token; `405` on wrong method.

- [ ] **Step 1: Write the failing tests**

`tests/api-message.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMessageHandler } from '../api/message.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

test('stores a valid message', async () => {
  const kv = createFakeKv();
  const handler = createMessageHandler(kv, () => 555);
  const res = createMockRes();
  await handler({ method: 'POST', body: { name: 'Alexis', message: 'Superbe travail' } }, res);
  assert.equal(res.statusCode, 200);
  const stored = await kv.lrange('messages', 0, -1);
  assert.deepEqual(stored, [{ name: 'Alexis', message: 'Superbe travail', ts: 555 }]);
});

test('defaults the name to Anonyme when missing', async () => {
  const kv = createFakeKv();
  const handler = createMessageHandler(kv, () => 1);
  await handler({ method: 'POST', body: { message: 'Salut' } }, createMockRes());
  const [stored] = await kv.lrange('messages', 0, -1);
  assert.equal(stored.name, 'Anonyme');
});

test('rejects an empty message', async () => {
  const kv = createFakeKv();
  const handler = createMessageHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', body: { message: '   ' } }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects non-POST methods', async () => {
  const kv = createFakeKv();
  const handler = createMessageHandler(kv);
  const res = createMockRes();
  await handler({ method: 'GET', body: {} }, res);
  assert.equal(res.statusCode, 405);
});
```

`tests/api-messages.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMessagesHandler } from '../api/messages.js';
import { createMessageHandler } from '../api/message.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';
import { computeAdminToken } from '../api/_lib/adminAuth.js';

test('rejects requests without a valid admin token', async () => {
  const kv = createFakeKv();
  const handler = createMessagesHandler(kv, () => 'secret');
  const res = createMockRes();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 401);
});

test('returns messages most-recent-first for an authorized admin', async () => {
  const kv = createFakeKv();
  const addMessage = createMessageHandler(kv, () => 1);
  await addMessage({ method: 'POST', body: { name: 'Alexis', message: 'first' } }, createMockRes());
  await addMessage({ method: 'POST', body: { name: 'Camille', message: 'second' } }, createMockRes());

  const handler = createMessagesHandler(kv, () => 'secret');
  const res = createMockRes();
  const token = computeAdminToken('secret');
  await handler({ method: 'GET', headers: { authorization: `Bearer ${token}` } }, res);

  assert.deepEqual(res.body.map((m) => m.message), ['second', 'first']);
});

test('rejects non-GET methods', async () => {
  const kv = createFakeKv();
  const handler = createMessagesHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL with "Cannot find module '../api/message.js'" / "'../api/messages.js'"

- [ ] **Step 3: Implement `api/message.js`**

```js
import { getKv } from './_lib/kv.js';
import { sanitizeName, sanitizeMessage } from './_lib/validate.js';

export function createMessageHandler(kv, now = () => Date.now()) {
  return async function messageHandler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { name, message } = req.body || {};
    const cleanMessage = sanitizeMessage(message);

    if (!cleanMessage) {
      res.status(400).json({ error: 'Message required' });
      return;
    }

    await kv.rpush('messages', {
      name: sanitizeName(name),
      message: cleanMessage,
      ts: now(),
    });

    res.status(200).json({ status: 'saved' });
  };
}

export default createMessageHandler(getKv());
```

- [ ] **Step 4: Implement `api/messages.js`**

```js
import { getKv } from './_lib/kv.js';
import { extractBearerToken, isAuthorizedToken } from './_lib/adminAuth.js';

export function createMessagesHandler(kv, getAdminPassword = () => process.env.ADMIN_PASSWORD) {
  return async function messagesHandler(req, res) {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const token = extractBearerToken(req.headers && req.headers.authorization);
    if (!isAuthorizedToken(token, getAdminPassword())) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const messages = await kv.lrange('messages', 0, -1);
    res.status(200).json(messages.slice().reverse());
  };
}

export default createMessagesHandler(getKv());
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS (all tests, including the 7 new ones from this task)

- [ ] **Step 6: Commit**

```bash
git add api/message.js api/messages.js tests/api-message.test.js tests/api-messages.test.js
git commit -m "feat: add message and messages API handlers"
```

---

### Task 9: Local dev server for manual testing

**Files:**
- Create: `dev-server.js`

**Interfaces:**
- Consumes: `createMemoryKv` (`api/_lib/memoryKv.js`, Task 6); `createVoteHandler` (`api/vote.js`), `createVotesHandler` (`api/votes.js`) from Task 7; `createMessageHandler` (`api/message.js`), `createMessagesHandler` (`api/messages.js`) from Task 8; `createAdminLoginHandler` (`api/admin-login.js`, Task 5).
- Produces: a runnable script (`npm run dev`) serving static files from the project root and routing `/api/vote`, `/api/votes`, `/api/message`, `/api/messages`, `/api/admin-login` to their handlers backed by a single shared in-memory KV instance. No automated test — this task's own deliverable is manually verified via HTTP calls (Step 2 below); it becomes the tool later tasks use for their browser-based manual verification.

- [ ] **Step 1: Implement `dev-server.js`**

```js
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMemoryKv } from './api/_lib/memoryKv.js';
import { createVoteHandler } from './api/vote.js';
import { createVotesHandler } from './api/votes.js';
import { createMessageHandler } from './api/message.js';
import { createMessagesHandler } from './api/messages.js';
import { createAdminLoginHandler } from './api/admin-login.js';

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const kv = createMemoryKv();
const getAdminPassword = () => ADMIN_PASSWORD;

const routes = {
  '/api/vote': createVoteHandler(kv),
  '/api/votes': createVotesHandler(kv, getAdminPassword),
  '/api/message': createMessageHandler(kv),
  '/api/messages': createMessagesHandler(kv, getAdminPassword),
  '/api/admin-login': createAdminLoginHandler(getAdminPassword),
};

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function createResAdapter(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    },
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

async function serveStatic(req, res, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const filePath = path.join(projectRoot, relativePath);
  if (!filePath.startsWith(projectRoot)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const handler = routes[pathname];

  if (handler) {
    req.body = await readBody(req);
    await handler(req, createResAdapter(res));
    return;
  }

  await serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Dev server ready at http://localhost:${PORT} (admin password: ${ADMIN_PASSWORD})`);
});
```

- [ ] **Step 2: Manually verify the dev server serves the API routes**

Run in the background: `npm run dev`

Then, in a separate PowerShell session:

```powershell
(Invoke-RestMethod -Uri http://localhost:3000/api/votes -Method GET) | ConvertTo-Json
```

Expected: JSON with `logo1` through `logo5`, each `{ "up": 0, "down": 0 }`.

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/vote -Method POST -ContentType "application/json" -Body '{"logoId":"logo1","visitorId":"tester","name":"Test","value":"up"}'
```

Expected: `{ "status": "saved", "value": "up" }`.

```powershell
(Invoke-RestMethod -Uri http://localhost:3000/api/votes -Method GET).logo1
```

Expected: `up: 1, down: 0`.

Stop the server afterward (Ctrl+C, or stop the background job).

- [ ] **Step 3: Commit**

```bash
git add dev-server.js
git commit -m "feat: add local dev server for manual testing"
```

---

### Task 10: HTML/CSS skeleton for the main page

**Files:**
- Create: `index.html`
- Create: `css/style.css`

**Interfaces:**
- Produces: DOM containers that later tasks attach behavior to — `#panel-left`, `#panel-right` (comparator panels, Task 11), `#votes-color-control`, `#votes-grid` (votes section, Task 12), `#feedback-form` with child inputs `#feedback-name`, `#feedback-message`, and `#feedback-status` (feedback form, Task 13). Produces CSS classes consumed by later JS-rendered markup: `.preview-box`, `.thumb-row`, `.thumb-button`, `.is-active`, `.palette-tabs`, `.palette-tab`, `.swatch-row`, `.swatch`, `.votes-grid`, `.vote-card`, `.vote-card-name`, `.vote-buttons`, `.vote-button.up`, `.vote-button.down`, `.vote-counts`.

- [ ] **Step 1: Implement `index.html`**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SYMA Studio — Proposition de logo</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <header class="site-header">
    <h1>SYMA Studio — Proposition de logo</h1>
  </header>

  <main>
    <section class="comparator" aria-label="Comparateur de logos">
      <div class="comparator-panel" id="panel-left"></div>
      <div class="comparator-panel" id="panel-right"></div>
    </section>

    <section class="votes-section" aria-label="Votes">
      <h2>Votez pour vos logos préférés</h2>
      <div class="votes-color-control" id="votes-color-control"></div>
      <div class="votes-grid" id="votes-grid"></div>
    </section>

    <section class="feedback-section" aria-label="Message">
      <h2>Un message pour nous ?</h2>
      <form id="feedback-form">
        <label for="feedback-name">Votre prénom</label>
        <input type="text" id="feedback-name" name="name" />
        <label for="feedback-message">Votre message</label>
        <textarea id="feedback-message" name="message" required></textarea>
        <button type="submit">Envoyer</button>
      </form>
      <p id="feedback-status" role="status"></p>
    </section>
  </main>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Implement `css/style.css`**

```css
:root {
  --gap: 1rem;
  --radius: 8px;
  --border: #d8d8d8;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: #1a1a1a;
  background: #fafafa;
}

.site-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border);
  background: #fff;
}

.site-header h1 {
  margin: 0;
  font-size: 1.4rem;
}

main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.comparator {
  display: flex;
  gap: var(--gap);
  flex-wrap: wrap;
}

.comparator-panel {
  flex: 1 1 320px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-box {
  aspect-ratio: 16 / 9;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.preview-box svg {
  max-width: 100%;
  max-height: 100%;
}

.thumb-row,
.swatch-row,
.palette-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.thumb-button {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #fff;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
}

.thumb-button.is-active,
.palette-tab.is-active {
  border-color: #1a1a1a;
  font-weight: 600;
}

.palette-tab {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: #fff;
  padding: 0.3rem 0.9rem;
  cursor: pointer;
}

.swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border);
  cursor: pointer;
  padding: 0;
}

.swatch.is-active {
  border-color: #1a1a1a;
  box-shadow: 0 0 0 2px #fff inset;
}

.votes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--gap);
}

.vote-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #fff;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.vote-card .preview-box {
  width: 100%;
}

.vote-card-name {
  margin: 0;
  font-weight: 600;
}

.vote-buttons {
  display: flex;
  gap: 0.75rem;
}

.vote-button {
  border: none;
  border-radius: var(--radius);
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-size: 1.1rem;
}

.vote-button.up {
  background: #e4f7e9;
}

.vote-button.down {
  background: #fbe6e6;
}

.vote-button.is-active.up {
  background: #34a853;
  color: #fff;
}

.vote-button.is-active.down {
  background: #ea4335;
  color: #fff;
}

.vote-counts {
  margin: 0;
  color: #555;
}

#feedback-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 480px;
}

#feedback-form textarea {
  min-height: 100px;
  font-family: inherit;
}

@media (max-width: 640px) {
  .comparator {
    flex-direction: column;
  }
}
```

- [ ] **Step 3: Manually verify the page loads**

Run in the background: `npm run dev`. Open `http://localhost:3000` in a browser.
Expected: header "SYMA Studio — Proposition de logo" renders, two empty bordered comparator panels are visible side by side, an empty votes section heading is visible, and the feedback form (name field, message textarea, "Envoyer" button) renders correctly.

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: add HTML/CSS skeleton for the main page"
```

---

### Task 11: SVG loader/recolor + comparator panel wiring

**Files:**
- Create: `js/svg-loader.js`
- Create: `js/palette-controls.js`
- Create: `js/comparator-panel.js`
- Create: `js/main.js`

**Interfaces:**
- Consumes: `LOGOS` (`js/logos.js`), `PALETTES`/`PALETTE_KEYS` (`js/palettes.js`) from Task 1; `initialState`/`withPaletteChange`/`withLogoChange`/`withBgColor`/`withLogoColor` (`js/comparator-state.js`) from Task 2; `#panel-left`/`#panel-right` DOM containers from Task 10.
- Produces: `loadInlineSvg(url, container)` (fetches and inlines the SVG into `container`, returns the injected `<svg>` element) and `recolorSvg(svgElement, color)` (sets `style.fill` on every `path`/`text`/`polygon`/`circle`/`rect` descendant) from `js/svg-loader.js`.
- Produces: `renderPaletteTabs(container, activePaletteKey, onSelect)` and `renderSwatches(container, paletteKey, activeColor, onPick)` from `js/palette-controls.js` — both clear and rebuild `container`'s content, used by this task and by Task 12.
- Produces: `createComparatorPanel(root, { paletteKey, logoId } = {})` from `js/comparator-panel.js`, returning `{ getState }`.
- Produces: `js/main.js`, the page entry point wired via `<script type="module" src="js/main.js">` in `index.html` (already in place from Task 10), instantiating the left and right comparator panels on `DOMContentLoaded`.

- [ ] **Step 1: Implement `js/svg-loader.js`**

```js
export async function loadInlineSvg(url, container) {
  const response = await fetch(url);
  const svgText = await response.text();
  container.innerHTML = svgText;
  return container.querySelector('svg');
}

export function recolorSvg(svgElement, color) {
  if (!svgElement) return;
  const targets = svgElement.querySelectorAll('path, text, polygon, circle, rect');
  targets.forEach((el) => {
    el.style.fill = color;
  });
}
```

- [ ] **Step 2: Implement `js/palette-controls.js`**

```js
import { PALETTES, PALETTE_KEYS } from './palettes.js';

export function renderPaletteTabs(container, activePaletteKey, onSelect) {
  container.innerHTML = '';
  for (const key of PALETTE_KEYS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-tab';
    button.textContent = PALETTES[key].label;
    button.classList.toggle('is-active', key === activePaletteKey);
    button.addEventListener('click', () => onSelect(key));
    container.appendChild(button);
  }
}

export function renderSwatches(container, paletteKey, activeColor, onPick) {
  container.innerHTML = '';
  for (const color of PALETTES[paletteKey].colors) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.style.backgroundColor = color;
    button.classList.toggle('is-active', color === activeColor);
    button.setAttribute('aria-label', color);
    button.addEventListener('click', () => onPick(color));
    container.appendChild(button);
  }
}
```

- [ ] **Step 3: Implement `js/comparator-panel.js`**

```js
import { LOGOS } from './logos.js';
import {
  initialState,
  withPaletteChange,
  withLogoChange,
  withBgColor,
  withLogoColor,
} from './comparator-state.js';
import { renderPaletteTabs, renderSwatches } from './palette-controls.js';
import { loadInlineSvg, recolorSvg } from './svg-loader.js';

export function createComparatorPanel(root, { paletteKey = 'palette1', logoId = LOGOS[0].id } = {}) {
  let state = initialState(paletteKey, logoId);
  let svgElement = null;

  root.innerHTML = `
    <div class="preview-box" data-role="preview"></div>
    <div class="thumb-row" data-role="thumbs"></div>
    <div class="palette-tabs" data-role="palette-tabs"></div>
    <div class="swatch-row" data-role="bg-swatches"></div>
    <div class="swatch-row" data-role="logo-swatches"></div>
  `;

  const previewEl = root.querySelector('[data-role="preview"]');
  const thumbsEl = root.querySelector('[data-role="thumbs"]');
  const paletteTabsEl = root.querySelector('[data-role="palette-tabs"]');
  const bgSwatchesEl = root.querySelector('[data-role="bg-swatches"]');
  const logoSwatchesEl = root.querySelector('[data-role="logo-swatches"]');

  function renderThumbs() {
    thumbsEl.innerHTML = '';
    for (const logo of LOGOS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumb-button';
      button.textContent = logo.name;
      button.classList.toggle('is-active', logo.id === state.logoId);
      button.addEventListener('click', () => {
        state = withLogoChange(state, logo.id);
        renderAll();
      });
      thumbsEl.appendChild(button);
    }
  }

  function renderColorPickers() {
    renderPaletteTabs(paletteTabsEl, state.paletteKey, (key) => {
      state = withPaletteChange(state, key);
      renderAll();
    });

    renderSwatches(bgSwatchesEl, state.paletteKey, state.bgColor, (color) => {
      state = withBgColor(state, color);
      renderAll();
    });

    renderSwatches(logoSwatchesEl, state.paletteKey, state.logoColor, (color) => {
      state = withLogoColor(state, color);
      renderAll();
    });
  }

  async function renderPreview() {
    previewEl.style.backgroundColor = state.bgColor;
    const logo = LOGOS.find((item) => item.id === state.logoId);

    if (!svgElement || previewEl.dataset.loadedLogo !== logo.id) {
      svgElement = await loadInlineSvg(logo.src, previewEl);
      previewEl.dataset.loadedLogo = logo.id;
    }

    recolorSvg(svgElement, state.logoColor);
  }

  function renderAll() {
    renderThumbs();
    renderColorPickers();
    renderPreview();
  }

  renderAll();

  return {
    getState: () => state,
  };
}
```

- [ ] **Step 4: Implement `js/main.js`**

```js
import { createComparatorPanel } from './comparator-panel.js';

document.addEventListener('DOMContentLoaded', () => {
  createComparatorPanel(document.getElementById('panel-left'), {
    paletteKey: 'palette1',
    logoId: 'logo1',
  });

  createComparatorPanel(document.getElementById('panel-right'), {
    paletteKey: 'palette1',
    logoId: 'logo2',
  });
});
```

- [ ] **Step 5: Manually verify the comparator in a browser**

Run in the background: `npm run dev`. Open `http://localhost:3000`.

Expected:
- Both panels show a logo (left = Logo 1, right = Logo 2) on a dark-blue background (`#18233f`), logo colored the same dark blue (matching the "swatch is active" state for that color).
- Clicking a different logo thumbnail in the left panel swaps only the left preview; the right panel is unaffected.
- Clicking "Palette 2" in the right panel switches its swatches to Palette 2's colors and resets its background/logo color to `#f35b43`; the left panel stays on Palette 1.
- Clicking any background or logo swatch immediately updates that panel's preview.

- [ ] **Step 6: Commit**

```bash
git add js/svg-loader.js js/palette-controls.js js/comparator-panel.js js/main.js
git commit -m "feat: wire up the two-panel logo comparator"
```

---

### Task 12: Votes section wiring

**Files:**
- Create: `js/votes-section.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `LOGOS` (`js/logos.js`, Task 1); `initialState`/`withPaletteChange`/`withBgColor`/`withLogoColor` (`js/comparator-state.js`, Task 2); `ensureIdentity` (`js/identity.js`, Task 3); `renderPaletteTabs`/`renderSwatches` (`js/palette-controls.js`, Task 11); `loadInlineSvg`/`recolorSvg` (`js/svg-loader.js`, Task 11); `#votes-color-control`/`#votes-grid` DOM containers (Task 10); the `/api/vote` and `/api/votes` endpoints (Task 7).
- Produces: `createVotesSection({ colorControlRoot, gridRoot })` from `js/votes-section.js`, called from `js/main.js`.

- [ ] **Step 1: Implement `js/votes-section.js`**

```js
import { LOGOS } from './logos.js';
import { initialState, withPaletteChange, withBgColor, withLogoColor } from './comparator-state.js';
import { renderPaletteTabs, renderSwatches } from './palette-controls.js';
import { loadInlineSvg, recolorSvg } from './svg-loader.js';
import { ensureIdentity } from './identity.js';

export function createVotesSection({ colorControlRoot, gridRoot }) {
  let colorState = initialState('palette1', LOGOS[0].id);
  const myVotes = {};
  const cards = new Map();

  function renderColorControl() {
    colorControlRoot.innerHTML = `
      <div class="palette-tabs" data-role="palette-tabs"></div>
      <div class="swatch-row" data-role="bg-swatches"></div>
      <div class="swatch-row" data-role="logo-swatches"></div>
    `;

    renderPaletteTabs(
      colorControlRoot.querySelector('[data-role="palette-tabs"]'),
      colorState.paletteKey,
      (key) => {
        colorState = withPaletteChange(colorState, key);
        renderColorControl();
        applyColorsToCards();
      }
    );

    renderSwatches(
      colorControlRoot.querySelector('[data-role="bg-swatches"]'),
      colorState.paletteKey,
      colorState.bgColor,
      (color) => {
        colorState = withBgColor(colorState, color);
        renderColorControl();
        applyColorsToCards();
      }
    );

    renderSwatches(
      colorControlRoot.querySelector('[data-role="logo-swatches"]'),
      colorState.paletteKey,
      colorState.logoColor,
      (color) => {
        colorState = withLogoColor(colorState, color);
        renderColorControl();
        applyColorsToCards();
      }
    );
  }

  function applyColorsToCards() {
    for (const card of cards.values()) {
      card.previewEl.style.backgroundColor = colorState.bgColor;
      recolorSvg(card.svgElement, colorState.logoColor);
    }
  }

  async function castVote(logoId, value) {
    const identity = ensureIdentity();

    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logoId, visitorId: identity.id, name: identity.name, value }),
    });
    const result = await response.json();
    myVotes[logoId] = result.status === 'removed' ? undefined : result.value;
    await refreshCounts();
    updateButtonStates();
  }

  function updateButtonStates() {
    for (const [logoId, card] of cards.entries()) {
      const active = myVotes[logoId];
      card.upButton.classList.toggle('is-active', active === 'up');
      card.downButton.classList.toggle('is-active', active === 'down');
    }
  }

  async function refreshCounts() {
    const response = await fetch('/api/votes');
    const data = await response.json();
    for (const [logoId, card] of cards.entries()) {
      const counts = data[logoId] || { up: 0, down: 0 };
      card.countsEl.textContent = `👍 ${counts.up} · 👎 ${counts.down}`;
    }
  }

  async function renderGrid() {
    gridRoot.innerHTML = '';
    for (const logo of LOGOS) {
      const card = document.createElement('div');
      card.className = 'vote-card';
      card.innerHTML = `
        <div class="preview-box" data-role="preview"></div>
        <p class="vote-card-name">${logo.name}</p>
        <div class="vote-buttons">
          <button type="button" class="vote-button up" data-role="up">👍</button>
          <button type="button" class="vote-button down" data-role="down">👎</button>
        </div>
        <p class="vote-counts" data-role="counts"></p>
      `;
      gridRoot.appendChild(card);

      const previewEl = card.querySelector('[data-role="preview"]');
      const upButton = card.querySelector('[data-role="up"]');
      const downButton = card.querySelector('[data-role="down"]');
      const countsEl = card.querySelector('[data-role="counts"]');

      previewEl.style.backgroundColor = colorState.bgColor;
      const svgElement = await loadInlineSvg(logo.src, previewEl);
      recolorSvg(svgElement, colorState.logoColor);

      upButton.addEventListener('click', () => castVote(logo.id, 'up'));
      downButton.addEventListener('click', () => castVote(logo.id, 'down'));

      cards.set(logo.id, { previewEl, svgElement, upButton, downButton, countsEl });
    }

    updateButtonStates();
    await refreshCounts();
  }

  renderColorControl();
  renderGrid();
}
```

- [ ] **Step 2: Modify `js/main.js`**

Replace the full contents of `js/main.js` with:

```js
import { createComparatorPanel } from './comparator-panel.js';
import { createVotesSection } from './votes-section.js';

document.addEventListener('DOMContentLoaded', () => {
  createComparatorPanel(document.getElementById('panel-left'), {
    paletteKey: 'palette1',
    logoId: 'logo1',
  });

  createComparatorPanel(document.getElementById('panel-right'), {
    paletteKey: 'palette1',
    logoId: 'logo2',
  });

  createVotesSection({
    colorControlRoot: document.getElementById('votes-color-control'),
    gridRoot: document.getElementById('votes-grid'),
  });
});
```

- [ ] **Step 3: Manually verify voting in a browser**

Run in the background: `npm run dev`. Open `http://localhost:3000` and scroll to the votes section.

Expected:
- All 5 logos render side by side using the shared color control (defaults to Palette 1, dark-blue background).
- Changing the shared palette/colors updates all 5 logo cards at once.
- Clicking 👍 on a logo triggers a browser name prompt (first time only); after entering a name, the counter shows "👍 1 · 👎 0" and the thumb button is visually highlighted.
- Clicking the same 👍 again removes the vote (counter back to "👍 0 · 👎 0", button un-highlighted).
- Clicking 👎 after 👍 was active switches the vote (counter shows "👍 0 · 👎 1").
- Reloading the page preserves the visitor's identity (no new name prompt) since it's stored in `localStorage`; vote counts persist too, since the dev server's in-memory KV survives page reloads (but resets if the server itself is restarted).

- [ ] **Step 4: Commit**

```bash
git add js/votes-section.js js/main.js
git commit -m "feat: wire up the votes section"
```

---

### Task 13: Feedback message form wiring

**Files:**
- Create: `js/feedback-form.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `ensureIdentity`/`setName` (`js/identity.js`, Task 3); `#feedback-form`, `#feedback-name`, `#feedback-message`, `#feedback-status` DOM elements (Task 10); the `/api/message` endpoint (Task 8).
- Produces: `createFeedbackForm(formEl, statusEl)` from `js/feedback-form.js`, called from `js/main.js`.

- [ ] **Step 1: Implement `js/feedback-form.js`**

```js
import { ensureIdentity, setName } from './identity.js';

export function createFeedbackForm(formEl, statusEl) {
  const nameInput = formEl.querySelector('#feedback-name');
  const messageInput = formEl.querySelector('#feedback-message');

  const identity = ensureIdentity({ promptForName: () => null });
  if (identity.name) {
    nameInput.value = identity.name;
  }

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!message) {
      statusEl.textContent = "Merci d'écrire un message avant d'envoyer.";
      return;
    }

    if (name) {
      setName(name);
    }

    const response = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, message }),
    });

    if (response.ok) {
      statusEl.textContent = 'Merci, votre message a bien été envoyé !';
      messageInput.value = '';
    } else {
      statusEl.textContent = 'Une erreur est survenue, réessayez.';
    }
  });
}
```

- [ ] **Step 2: Modify `js/main.js`**

Replace the full contents of `js/main.js` with:

```js
import { createComparatorPanel } from './comparator-panel.js';
import { createVotesSection } from './votes-section.js';
import { createFeedbackForm } from './feedback-form.js';

document.addEventListener('DOMContentLoaded', () => {
  createComparatorPanel(document.getElementById('panel-left'), {
    paletteKey: 'palette1',
    logoId: 'logo1',
  });

  createComparatorPanel(document.getElementById('panel-right'), {
    paletteKey: 'palette1',
    logoId: 'logo2',
  });

  createVotesSection({
    colorControlRoot: document.getElementById('votes-color-control'),
    gridRoot: document.getElementById('votes-grid'),
  });

  createFeedbackForm(document.getElementById('feedback-form'), document.getElementById('feedback-status'));
});
```

- [ ] **Step 3: Manually verify the feedback form in a browser**

Run in the background: `npm run dev`. Open `http://localhost:3000` and scroll to the message section.

Expected:
- If a name was already entered in the votes section, the "Votre prénom" field is pre-filled with it.
- Submitting with an empty message shows "Merci d'écrire un message avant d'envoyer." and sends nothing.
- Submitting with a message shows "Merci, votre message a bien été envoyé !" and clears the textarea.

- [ ] **Step 4: Commit**

```bash
git add js/feedback-form.js js/main.js
git commit -m "feat: wire up the feedback message form"
```

---

### Task 14: Admin page

**Files:**
- Create: `admin.html`
- Create: `css/admin.css`
- Create: `js/admin.js`

**Interfaces:**
- Consumes: `LOGOS` (`js/logos.js`, Task 1); the `/api/admin-login`, `/api/votes`, `/api/messages` endpoints (Tasks 5, 7, 8).
- Produces: a standalone admin page at `admin.html`, no other task depends on it.

- [ ] **Step 1: Implement `admin.html`**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin — SYMA Studio</title>
  <link rel="stylesheet" href="css/style.css" />
  <link rel="stylesheet" href="css/admin.css" />
</head>
<body>
  <header class="site-header">
    <h1>Retours clients — SYMA Studio</h1>
  </header>

  <main class="admin-main">
    <section id="login-section">
      <form id="login-form">
        <label for="admin-password">Mot de passe</label>
        <input type="password" id="admin-password" required />
        <button type="submit">Se connecter</button>
      </form>
      <p id="login-status" role="status"></p>
    </section>

    <section id="dashboard-section" hidden>
      <h2>Votes par logo</h2>
      <div id="votes-summary"></div>

      <h2>Messages</h2>
      <ul id="messages-list"></ul>
    </section>
  </main>

  <script type="module" src="js/admin.js"></script>
</body>
</html>
```

- [ ] **Step 2: Implement `css/admin.css`**

```css
.admin-main {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

#login-form {
  display: flex;
  gap: 0.5rem;
  align-items: end;
}

.logo-summary {
  border: 1px solid var(--border, #d8d8d8);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.logo-summary h3 {
  margin: 0 0 0.5rem;
}

.voter-list {
  margin: 0;
  padding-left: 1.2rem;
}

#messages-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

#messages-list li {
  border: 1px solid var(--border, #d8d8d8);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: #fff;
}

.message-meta {
  font-size: 0.85rem;
  color: #666;
}
```

- [ ] **Step 3: Implement `js/admin.js`**

```js
import { LOGOS } from './logos.js';

const TOKEN_STORAGE_KEY = 'syma_admin_token';

function getStoredToken() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

function storeToken(token) {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

async function login(password) {
  const response = await fetch('/api/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.token;
}

async function fetchVotes(token) {
  const response = await fetch('/api/votes', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

async function fetchMessages(token) {
  const response = await fetch('/api/messages', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) return null;
  return response.json();
}

function renderVotes(votesData) {
  const container = document.getElementById('votes-summary');
  container.innerHTML = '';

  for (const logo of LOGOS) {
    const summary = votesData[logo.id] || { up: 0, down: 0, voters: [] };
    const block = document.createElement('div');
    block.className = 'logo-summary';
    const votersList = (summary.voters || [])
      .map((voter) => `<li>${voter.name} — ${voter.value === 'up' ? '👍' : '👎'}</li>`)
      .join('');
    block.innerHTML = `
      <h3>${logo.name} — 👍 ${summary.up} · 👎 ${summary.down}</h3>
      <ul class="voter-list">${votersList}</ul>
    `;
    container.appendChild(block);
  }
}

function renderMessages(messages) {
  const list = document.getElementById('messages-list');
  list.innerHTML = '';

  for (const item of messages) {
    const li = document.createElement('li');
    const date = new Date(item.ts).toLocaleString('fr-FR');
    li.innerHTML = `
      <p>${item.message}</p>
      <p class="message-meta">${item.name} — ${date}</p>
    `;
    list.appendChild(li);
  }
}

async function showDashboard(token) {
  const [votesData, messages] = await Promise.all([fetchVotes(token), fetchMessages(token)]);

  if (messages === null) {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    document.getElementById('login-section').hidden = false;
    document.getElementById('dashboard-section').hidden = true;
    document.getElementById('login-status').textContent = 'Session expirée, reconnectez-vous.';
    return;
  }

  document.getElementById('login-section').hidden = true;
  document.getElementById('dashboard-section').hidden = false;
  renderVotes(votesData);
  renderMessages(messages);
}

document.addEventListener('DOMContentLoaded', () => {
  const existingToken = getStoredToken();
  if (existingToken) {
    showDashboard(existingToken);
  }

  document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = document.getElementById('admin-password').value;
    const token = await login(password);

    if (!token) {
      document.getElementById('login-status').textContent = 'Mot de passe incorrect.';
      return;
    }

    storeToken(token);
    showDashboard(token);
  });
});
```

- [ ] **Step 4: Manually verify the admin page in a browser**

Set an admin password and start the dev server:

```powershell
$env:ADMIN_PASSWORD = "test1234"
npm run dev
```

Open `http://localhost:3000/admin.html`.

Expected:
- Submitting a wrong password shows "Mot de passe incorrect."
- Submitting `test1234` shows the dashboard with a "👍/👎" summary block per logo (matching the votes cast during Task 12's manual test) including the voter's name, and a messages list showing the message submitted during Task 13's manual test, most recent first.
- Reloading `admin.html` keeps the session (token in `sessionStorage`), without asking for the password again.

- [ ] **Step 5: Commit**

```bash
git add admin.html css/admin.css js/admin.js
git commit -m "feat: add admin dashboard page"
```

---

### Task 15: Deployment documentation and final review

**Files:**
- Create: `DEPLOY.md`

**Interfaces:**
- None — this is documentation plus a final verification pass over the whole project.

- [ ] **Step 1: Implement `DEPLOY.md`**

```markdown
# Déploiement sur Vercel

## 1. Créer le repo GitHub

1. Créer un nouveau repo sur GitHub (vide, sans README).
2. Depuis ce dossier :
   ```bash
   git remote add origin <url-du-repo>
   git branch -M main
   git push -u origin main
   ```

## 2. Importer le projet dans Vercel

1. Sur vercel.com, "Add New Project" → sélectionner le repo GitHub.
2. Aucune configuration de build nécessaire (site statique + fonctions serverless détectées automatiquement).
3. Cliquer sur "Deploy".

## 3. Ajouter le stockage Vercel KV

1. Dans le projet Vercel, onglet **Storage** → **Create Database** → **KV** (Upstash Redis).
2. Une fois créée, la connecter au projet : Vercel ajoute automatiquement les variables d'environnement `KV_REST_API_URL`, `KV_REST_API_TOKEN` (et autres) à tous les environnements (Production/Preview/Development).

## 4. Définir le mot de passe admin

1. Dans le projet Vercel, **Settings → Environment Variables**.
2. Ajouter `ADMIN_PASSWORD` avec la valeur de votre choix, pour les environnements Production et Preview.
3. Redéployer (Settings → Deployments → "Redeploy") pour que la variable soit prise en compte.

## 5. Vérifier

- Ouvrir l'URL de production : le comparateur et les votes doivent fonctionner (stockés dans Vercel KV).
- Ouvrir `/admin.html`, se connecter avec `ADMIN_PASSWORD`, vérifier que les votes et messages remontent.

## Développement local

\`\`\`bash
npm install
npm run dev
\`\`\`

Ouvre `http://localhost:3000`. Le serveur de développement utilise un stockage en mémoire (réinitialisé à chaque redémarrage) — aucune connexion à Vercel KV n'est nécessaire en local. Pour tester la page admin en local, définir un mot de passe avant de lancer le serveur :

\`\`\`bash
# PowerShell
$env:ADMIN_PASSWORD = "test1234"
npm run dev
\`\`\`

## Lancer les tests

\`\`\`bash
npm test
\`\`\`
```

- [ ] **Step 2: Run the full test suite one last time**

Run: `npm test`
Expected: PASS, all tests across every task green.

- [ ] **Step 3: Commit**

```bash
git add DEPLOY.md
git commit -m "docs: add Vercel deployment guide"
```
