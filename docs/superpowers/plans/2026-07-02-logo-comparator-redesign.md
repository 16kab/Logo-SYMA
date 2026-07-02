# Logo Comparator Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the SYMA logo site into a premium two-panel comparator with explicit color controls, palette-first voting, ranked logo voting, a custom first-name modal, and updated admin results.

**Architecture:** Keep the current vanilla HTML/CSS/JS and Vercel API shape. Replace the old per-logo `up/down` vote model with a single visitor vote entry containing `paletteKey` and a complete logo `ranking`; derive public aggregates and admin detail from that stored entry. Keep UI modules small: comparator rendering, palette controls, identity modal, ranked voting, message form, and admin rendering each own their section.

**Tech Stack:** HTML, CSS, vanilla ES modules, Node.js serverless handlers, Redis-like KV abstraction, `node:test`.

---

## File Map

- Modify `api/_lib/validate.js`: add palette and ranking validation helpers while keeping existing message/name helpers.
- Modify `api/_lib/voteLogic.js`: replace old up/down vote helpers with ranked-vote aggregation helpers.
- Modify `api/vote.js`: accept `{ visitorId, name, paletteKey, ranking }` and store one entry in `votes`.
- Modify `api/votes.js`: return public aggregate data and admin voter detail from `votes`.
- Modify `tests/validate.test.js`, `tests/voteLogic.test.js`, `tests/api-vote.test.js`, `tests/api-votes.test.js`: update behavior tests before implementation.
- Modify `js/identity.js`: expose an id-only helper so UI can create ids without using native `prompt`.
- Create `js/identity-modal.js`: custom modal flow for missing first names.
- Modify `js/palette-controls.js`: support labeled color rows and accessible palette/swatch controls.
- Modify `js/comparator-panel.js`: render premium control groups under each preview.
- Modify `js/votes-section.js`: replace thumbs with palette choice, ranking controls, validation, and submit.
- Modify `js/feedback-form.js`: use the custom identity modal before sending messages when name is missing.
- Modify `js/main.js`: pass the identity modal dependency into vote/message modules.
- Modify `index.html`: update copy and add modal root.
- Modify `js/admin.js`, `admin.html`, `css/admin.css`: show palette and ranked vote results.
- Modify `css/style.css`: implement the minimal premium redesign and responsive layout.

---

### Task 1: Ranked Vote Domain Logic

**Files:**
- Modify: `tests/validate.test.js`
- Modify: `tests/voteLogic.test.js`
- Modify: `api/_lib/validate.js`
- Modify: `api/_lib/voteLogic.js`

- [ ] **Step 1: Write failing validation tests**

Add these imports in `tests/validate.test.js`:

```js
import {
  isValidLogoId,
  isValidPaletteKey,
  isValidRanking,
  isValidVoteValue,
  sanitizeName,
  sanitizeMessage,
} from '../api/_lib/validate.js';
```

Add these tests:

```js
test('isValidPaletteKey accepts known palette keys only', () => {
  assert.equal(isValidPaletteKey('palette1'), true);
  assert.equal(isValidPaletteKey('palette2'), true);
  assert.equal(isValidPaletteKey('palette3'), false);
  assert.equal(isValidPaletteKey(''), false);
});

test('isValidRanking accepts a complete one-to-five logo ranking', () => {
  assert.equal(isValidRanking({
    logo1: 1,
    logo2: 2,
    logo3: 3,
    logo4: 4,
    logo5: 5,
  }), true);
});

test('isValidRanking rejects missing logos, duplicate ranks, and invalid ranks', () => {
  assert.equal(isValidRanking({ logo1: 1, logo2: 2, logo3: 3, logo4: 4 }), false);
  assert.equal(isValidRanking({ logo1: 1, logo2: 1, logo3: 3, logo4: 4, logo5: 5 }), false);
  assert.equal(isValidRanking({ logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 6 }), false);
  assert.equal(isValidRanking({ logo1: 1, logo2: 2, logo3: 3, logo4: 4, fake: 5 }), false);
});
```

- [ ] **Step 2: Run validation tests to verify they fail**

Run: `node --test tests/validate.test.js`

Expected: FAIL because `isValidPaletteKey` and `isValidRanking` are not exported.

- [ ] **Step 3: Implement minimal validation helpers**

In `api/_lib/validate.js`, add `PALETTE_KEYS` import and helpers:

```js
import { LOGO_IDS } from '../../js/logos.js';
import { PALETTE_KEYS } from '../../js/palettes.js';

export function isValidPaletteKey(paletteKey) {
  return PALETTE_KEYS.includes(paletteKey);
}

export function isValidRanking(ranking) {
  if (!ranking || typeof ranking !== 'object' || Array.isArray(ranking)) return false;
  const keys = Object.keys(ranking).sort();
  if (keys.length !== LOGO_IDS.length) return false;
  if (keys.join('|') !== [...LOGO_IDS].sort().join('|')) return false;
  const ranks = Object.values(ranking);
  const expectedRanks = Array.from({ length: LOGO_IDS.length }, (_, index) => index + 1);
  return expectedRanks.every((rank) => ranks.includes(rank)) && new Set(ranks).size === LOGO_IDS.length;
}
```

Keep `isValidVoteValue` for now so old tests fail only after the vote API test update.

- [ ] **Step 4: Run validation tests to verify they pass**

Run: `node --test tests/validate.test.js`

Expected: PASS.

- [ ] **Step 5: Write failing vote aggregation tests**

Replace `tests/voteLogic.test.js` with:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRankedVoteSummary } from '../api/_lib/voteLogic.js';

test('computeRankedVoteSummary counts palette choices', () => {
  const summary = computeRankedVoteSummary([
    ['v1', { name: 'Alexis', paletteKey: 'palette1', ranking: { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5 }, ts: 200 }],
    ['v2', { name: 'Camille', paletteKey: 'palette2', ranking: { logo1: 2, logo2: 1, logo3: 3, logo4: 4, logo5: 5 }, ts: 100 }],
    ['v3', { name: 'Dana', paletteKey: 'palette1', ranking: { logo1: 3, logo2: 2, logo3: 1, logo4: 4, logo5: 5 }, ts: 300 }],
  ]);

  assert.deepEqual(summary.palettes, { palette1: 2, palette2: 1 });
});

test('computeRankedVoteSummary aggregates logo rank scores', () => {
  const summary = computeRankedVoteSummary([
    ['v1', { name: 'Alexis', paletteKey: 'palette1', ranking: { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5 }, ts: 200 }],
    ['v2', { name: 'Camille', paletteKey: 'palette2', ranking: { logo1: 2, logo2: 1, logo3: 3, logo4: 4, logo5: 5 }, ts: 100 }],
  ]);

  assert.deepEqual(summary.logos.logo1.rankCounts, { 1: 1, 2: 1, 3: 0, 4: 0, 5: 0 });
  assert.equal(summary.logos.logo1.score, 3);
  assert.equal(summary.logos.logo1.averageRank, 1.5);
});

test('computeRankedVoteSummary orders voters chronologically', () => {
  const summary = computeRankedVoteSummary([
    ['v1', { name: 'Alexis', paletteKey: 'palette1', ranking: { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5 }, ts: 200 }],
    ['v2', { name: 'Camille', paletteKey: 'palette2', ranking: { logo1: 2, logo2: 1, logo3: 3, logo4: 4, logo5: 5 }, ts: 100 }],
  ]);

  assert.deepEqual(summary.voters.map((voter) => voter.name), ['Camille', 'Alexis']);
});

test('computeRankedVoteSummary returns empty aggregates for no votes', () => {
  const summary = computeRankedVoteSummary([]);
  assert.deepEqual(summary.palettes, { palette1: 0, palette2: 0 });
  assert.equal(summary.logos.logo1.score, 0);
  assert.equal(summary.logos.logo1.averageRank, null);
  assert.deepEqual(summary.voters, []);
});
```

- [ ] **Step 6: Run vote logic tests to verify they fail**

Run: `node --test tests/voteLogic.test.js`

Expected: FAIL because `computeRankedVoteSummary` is not exported.

- [ ] **Step 7: Implement ranked vote aggregation**

Replace `api/_lib/voteLogic.js` with:

```js
import { LOGO_IDS } from '../../js/logos.js';
import { PALETTE_KEYS } from '../../js/palettes.js';

function emptyRankCounts() {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

export function computeRankedVoteSummary(entries) {
  const palettes = Object.fromEntries(PALETTE_KEYS.map((key) => [key, 0]));
  const logos = Object.fromEntries(LOGO_IDS.map((logoId) => [
    logoId,
    { score: 0, averageRank: null, voteCount: 0, rankCounts: emptyRankCounts() },
  ]));
  const voters = [];

  for (const [visitorId, entry] of entries) {
    if (entry.paletteKey in palettes) {
      palettes[entry.paletteKey] += 1;
    }

    for (const logoId of LOGO_IDS) {
      const rank = entry.ranking && entry.ranking[logoId];
      if (!Number.isInteger(rank) || rank < 1 || rank > LOGO_IDS.length) continue;
      logos[logoId].score += rank;
      logos[logoId].voteCount += 1;
      logos[logoId].rankCounts[rank] += 1;
    }

    voters.push({
      visitorId,
      name: entry.name,
      paletteKey: entry.paletteKey,
      ranking: entry.ranking,
      ts: entry.ts,
    });
  }

  for (const logo of Object.values(logos)) {
    logo.averageRank = logo.voteCount ? logo.score / logo.voteCount : null;
  }

  voters.sort((a, b) => a.ts - b.ts);
  return { palettes, logos, voters };
}
```

- [ ] **Step 8: Run domain tests to verify they pass**

Run: `node --test tests/validate.test.js tests/voteLogic.test.js`

Expected: PASS.

- [ ] **Step 9: Commit domain logic**

Run:

```bash
git add api/_lib/validate.js api/_lib/voteLogic.js tests/validate.test.js tests/voteLogic.test.js
git commit -m "feat: add ranked vote domain logic"
```

---

### Task 2: Ranked Vote API

**Files:**
- Modify: `tests/api-vote.test.js`
- Modify: `tests/api-votes.test.js`
- Modify: `api/vote.js`
- Modify: `api/votes.js`

- [ ] **Step 1: Write failing POST vote API tests**

Replace `tests/api-vote.test.js` with:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoteHandler } from '../api/vote.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';

const ranking = { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5 };

test('records a ranked vote with palette choice', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv, () => 12345);
  const res = createMockRes();

  await handler({ method: 'POST', body: { visitorId: 'v1', name: 'Alexis', paletteKey: 'palette1', ranking } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: 'saved' });
  const stored = await kv.hgetall('votes');
  assert.deepEqual(stored, {
    v1: { name: 'Alexis', paletteKey: 'palette1', ranking, ts: 12345 },
  });
});

test('replaces an existing ranked vote for the same visitor', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv, () => 999);
  await handler({ method: 'POST', body: { visitorId: 'v1', name: 'Alexis', paletteKey: 'palette1', ranking } }, createMockRes());
  const nextRanking = { logo1: 5, logo2: 4, logo3: 3, logo4: 2, logo5: 1 };
  const res = createMockRes();

  await handler({ method: 'POST', body: { visitorId: 'v1', name: 'Alexis', paletteKey: 'palette2', ranking: nextRanking } }, res);

  assert.deepEqual(res.body, { status: 'saved' });
  const stored = await kv.hgetall('votes');
  assert.deepEqual(stored.v1, { name: 'Alexis', paletteKey: 'palette2', ranking: nextRanking, ts: 999 });
});

test('rejects invalid ranked vote payloads', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv);

  for (const body of [
    { visitorId: '', name: 'Alexis', paletteKey: 'palette1', ranking },
    { visitorId: 'v1', name: 'Alexis', paletteKey: 'palette9', ranking },
    { visitorId: 'v1', name: 'Alexis', paletteKey: 'palette1', ranking: { ...ranking, logo5: 4 } },
  ]) {
    const res = createMockRes();
    await handler({ method: 'POST', body }, res);
    assert.equal(res.statusCode, 400);
  }
});

test('rejects non-POST methods', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv);
  const res = createMockRes();
  await handler({ method: 'GET', body: {} }, res);
  assert.equal(res.statusCode, 405);
});
```

- [ ] **Step 2: Run POST vote API tests to verify they fail**

Run: `node --test tests/api-vote.test.js`

Expected: FAIL because the handler still expects `logoId` and `value`.

- [ ] **Step 3: Implement ranked POST vote handler**

Replace `api/vote.js` with:

```js
import { getKv } from './_lib/kv.js';
import { isValidPaletteKey, isValidRanking, sanitizeName } from './_lib/validate.js';

export function createVoteHandler(kv, now = () => Date.now()) {
  return async function voteHandler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { visitorId, name, paletteKey, ranking } = req.body || {};

    if (!visitorId || !isValidPaletteKey(paletteKey) || !isValidRanking(ranking)) {
      res.status(400).json({ error: 'Invalid vote payload' });
      return;
    }

    await kv.hset('votes', {
      [visitorId]: { name: sanitizeName(name), paletteKey, ranking, ts: now() },
    });

    res.status(200).json({ status: 'saved' });
  };
}

export default createVoteHandler(getKv());
```

- [ ] **Step 4: Run POST vote API tests to verify they pass**

Run: `node --test tests/api-vote.test.js`

Expected: PASS.

- [ ] **Step 5: Write failing GET votes API tests**

Replace `tests/api-votes.test.js` with:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createVotesHandler } from '../api/votes.js';
import { createVoteHandler } from '../api/vote.js';
import { createFakeKv } from './helpers/fakeKv.js';
import { createMockRes } from './helpers/http.js';
import { computeAdminToken } from '../api/_lib/adminAuth.js';

const ranking = { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5 };

async function seedVote(kv, visitorId, name, paletteKey, visitorRanking = ranking) {
  const voteHandler = createVoteHandler(kv, () => visitorId === 'v1' ? 100 : 200);
  await voteHandler({ method: 'POST', body: { visitorId, name, paletteKey, ranking: visitorRanking } }, createMockRes());
}

test('returns public aggregate palette and ranking results', async () => {
  const kv = createFakeKv();
  await seedVote(kv, 'v1', 'Alexis', 'palette1');
  await seedVote(kv, 'v2', 'Camille', 'palette2', { logo1: 2, logo2: 1, logo3: 3, logo4: 4, logo5: 5 });
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();

  await handler({ method: 'GET', headers: {} }, res);

  assert.deepEqual(res.body.palettes, { palette1: 1, palette2: 1 });
  assert.equal(res.body.logos.logo1.score, 3);
  assert.equal(res.body.logos.logo1.averageRank, 1.5);
  assert.equal(res.body.voters, undefined);
});

test('includes voter detail when a valid admin token is provided', async () => {
  const kv = createFakeKv();
  await seedVote(kv, 'v1', 'Alexis', 'palette1');
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();
  const token = computeAdminToken('secret');

  await handler({ method: 'GET', headers: { authorization: `Bearer ${token}` } }, res);

  assert.equal(res.body.voters.length, 1);
  assert.equal(res.body.voters[0].name, 'Alexis');
  assert.equal(res.body.voters[0].paletteKey, 'palette1');
  assert.deepEqual(res.body.voters[0].ranking, ranking);
});

test('includes requesting visitor own ranked vote when visitorId is provided', async () => {
  const kv = createFakeKv();
  await seedVote(kv, 'v1', 'Alexis', 'palette1');
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();

  await handler({ method: 'GET', headers: {}, url: '/api/votes?visitorId=v1' }, res);

  assert.deepEqual(res.body.myVote, { paletteKey: 'palette1', ranking });
});

test('returns empty aggregates with no votes', async () => {
  const kv = createFakeKv();
  const handler = createVotesHandler(kv, () => 'secret');
  const res = createMockRes();

  await handler({ method: 'GET', headers: {} }, res);

  assert.deepEqual(res.body.palettes, { palette1: 0, palette2: 0 });
  assert.equal(res.body.logos.logo1.score, 0);
});

test('rejects non-GET methods', async () => {
  const kv = createFakeKv();
  const handler = createVotesHandler(kv);
  const res = createMockRes();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});
```

- [ ] **Step 6: Run GET votes API tests to verify they fail**

Run: `node --test tests/api-votes.test.js`

Expected: FAIL because `api/votes.js` still loops over `vote:<logoId>`.

- [ ] **Step 7: Implement ranked GET votes handler**

Replace `api/votes.js` with:

```js
import { getKv } from './_lib/kv.js';
import { computeRankedVoteSummary } from './_lib/voteLogic.js';
import { extractBearerToken, isAuthorizedToken } from './_lib/adminAuth.js';

export function createVotesHandler(kv, getAdminPassword = () => process.env.ADMIN_PASSWORD) {
  return async function votesHandler(req, res) {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const token = extractBearerToken(req.headers && req.headers.authorization);
    const isAdmin = isAuthorizedToken(token, getAdminPassword());
    const requestUrl = new URL(req.url || '/', 'http://localhost');
    const visitorId = requestUrl.searchParams.get('visitorId');
    const hash = (await kv.hgetall('votes')) || {};
    const summary = computeRankedVoteSummary(Object.entries(hash));
    const result = {
      palettes: summary.palettes,
      logos: summary.logos,
    };

    if (visitorId && hash[visitorId]) {
      result.myVote = {
        paletteKey: hash[visitorId].paletteKey,
        ranking: hash[visitorId].ranking,
      };
    }

    if (isAdmin) {
      result.voters = summary.voters;
    }

    res.status(200).json(result);
  };
}

export default createVotesHandler(getKv());
```

- [ ] **Step 8: Run API tests to verify they pass**

Run: `node --test tests/api-vote.test.js tests/api-votes.test.js`

Expected: PASS.

- [ ] **Step 9: Run all backend/domain tests**

Run: `npm test`

Expected: existing frontend tests that reference old vote helpers may fail only if they import removed helpers. Fix imports by removing old tests, then rerun until PASS.

- [ ] **Step 10: Commit API changes**

Run:

```bash
git add api/vote.js api/votes.js tests/api-vote.test.js tests/api-votes.test.js
git commit -m "feat: store ranked logo votes"
```

---

### Task 3: Custom Identity Modal

**Files:**
- Modify: `tests/identity.test.js`
- Modify: `js/identity.js`
- Create: `js/identity-modal.js`
- Modify: `index.html`

- [ ] **Step 1: Write failing id-only identity test**

Add this import in `tests/identity.test.js`:

```js
import { ensureIdentityId, getIdentity, setName, ensureIdentity } from '../js/identity.js';
```

Add this test:

```js
test('ensureIdentityId generates an id without prompting for a name', () => {
  const storage = createFakeStorage();
  const id = ensureIdentityId({
    storage,
    generateId: () => 'id-only',
  });

  assert.equal(id, 'id-only');
  assert.equal(storage.getItem('syma_visitor_id'), 'id-only');
  assert.equal(storage.getItem('syma_visitor_name'), null);
});
```

- [ ] **Step 2: Run identity tests to verify they fail**

Run: `node --test tests/identity.test.js`

Expected: FAIL because `ensureIdentityId` is not exported.

- [ ] **Step 3: Implement id-only helper**

In `js/identity.js`, add:

```js
export function ensureIdentityId({
  storage = globalThis.localStorage,
  generateId = () => globalThis.crypto.randomUUID(),
} = {}) {
  let { id } = getIdentity(storage);
  if (!id) {
    id = generateId();
    storage.setItem(STORAGE_KEY_ID, id);
  }
  return id;
}
```

- [ ] **Step 4: Run identity tests to verify they pass**

Run: `node --test tests/identity.test.js`

Expected: PASS.

- [ ] **Step 5: Create identity modal module**

Create `js/identity-modal.js`:

```js
import { ensureIdentityId, getIdentity, setName } from './identity.js';

export function createIdentityModal(root = document.getElementById('identity-modal-root')) {
  let pendingResolve = null;

  root.innerHTML = `
    <div class="identity-modal" data-role="dialog" hidden>
      <div class="identity-modal__backdrop" data-role="backdrop"></div>
      <div class="identity-modal__panel" role="dialog" aria-modal="true" aria-labelledby="identity-modal-title">
        <form class="identity-modal__form" data-role="form">
          <h2 id="identity-modal-title">Votre prenom</h2>
          <label for="identity-name">Votre prenom</label>
          <input type="text" id="identity-name" name="name" autocomplete="given-name" />
          <p class="identity-modal__error" data-role="error" role="alert"></p>
          <button type="submit">Continuer</button>
        </form>
      </div>
    </div>
  `;

  const dialog = root.querySelector('[data-role="dialog"]');
  const form = root.querySelector('[data-role="form"]');
  const input = root.querySelector('#identity-name');
  const error = root.querySelector('[data-role="error"]');

  function close(identity) {
    dialog.hidden = true;
    pendingResolve?.(identity);
    pendingResolve = null;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) {
      error.textContent = 'Merci de renseigner votre prenom.';
      input.focus();
      return;
    }
    setName(name);
    close({ id: ensureIdentityId(), name });
  });

  return {
    async requireIdentity() {
      const id = ensureIdentityId();
      const identity = getIdentity();
      if (identity.name) return { id, name: identity.name };
      dialog.hidden = false;
      error.textContent = '';
      input.value = '';
      input.focus();
      return new Promise((resolve) => {
        pendingResolve = resolve;
      });
    },
  };
}
```

- [ ] **Step 6: Add modal root to HTML**

In `index.html`, add before the script:

```html
  <div id="identity-modal-root"></div>
```

- [ ] **Step 7: Commit identity modal**

Run:

```bash
git add js/identity.js js/identity-modal.js index.html tests/identity.test.js
git commit -m "feat: add custom visitor name modal"
```

---

### Task 4: Comparator Controls and Premium UI Markup

**Files:**
- Modify: `js/palette-controls.js`
- Modify: `js/comparator-panel.js`
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Add accessible palette and swatch rendering**

In `js/palette-controls.js`, update button attributes:

```js
button.setAttribute('aria-pressed', String(key === activePaletteKey));
button.setAttribute('aria-label', `Choisir ${PALETTES[key].label}`);
```

For swatches:

```js
button.setAttribute('aria-label', `${label || 'Couleur'} ${color}`);
button.setAttribute('aria-pressed', String(color === activeColor));
```

Change `renderSwatches` signature to:

```js
export function renderSwatches(container, paletteKey, activeColor, onPick, label = 'Couleur') {
```

- [ ] **Step 2: Update comparator control markup**

In `js/comparator-panel.js`, replace `root.innerHTML` with:

```js
root.innerHTML = `
  <div class="preview-box comparator-preview" data-role="preview"></div>
  <div class="panel-controls">
    <div class="control-group">
      <p class="control-label">Logo</p>
      <div class="thumb-row" data-role="thumbs"></div>
    </div>
    <div class="control-group">
      <p class="control-label">Palette</p>
      <div class="palette-tabs" data-role="palette-tabs"></div>
    </div>
    <div class="control-group color-control">
      <p class="control-label">Fond</p>
      <div class="swatch-row" data-role="bg-swatches"></div>
    </div>
    <div class="control-group color-control">
      <p class="control-label">Logo</p>
      <div class="swatch-row" data-role="logo-swatches"></div>
    </div>
  </div>
`;
```

Pass labels into swatches:

```js
renderSwatches(bgSwatchesEl, state.paletteKey, state.bgColor, (color) => {
  state = withBgColor(state, color);
  renderAll();
}, 'Fond');

renderSwatches(logoSwatchesEl, state.paletteKey, state.logoColor, (color) => {
  state = withLogoColor(state, color);
  renderAll();
}, 'Logo');
```

- [ ] **Step 3: Update index copy**

In `index.html`, change header title to:

```html
<h1>SYMA Studio</h1>
```

Add section headings:

```html
<section class="comparator-section" aria-labelledby="comparator-title">
  <div class="section-heading">
    <p class="eyebrow">Comparateur</p>
    <h2 id="comparator-title">Comparez les directions de logo</h2>
  </div>
  <div class="comparator" aria-label="Comparateur de logos">
    <div class="comparator-panel" id="panel-left"></div>
    <div class="comparator-panel" id="panel-right"></div>
  </div>
</section>
```

Keep headings compact; no instructional marketing block.

- [ ] **Step 4: Apply base premium CSS**

Replace `css/style.css` with a full stylesheet that includes:

```css
:root {
  --page: #f7f5ef;
  --surface: #fffdf8;
  --surface-strong: #ffffff;
  --text: #111111;
  --muted: #66645f;
  --border: #ded9cf;
  --border-strong: #111111;
  --accent: #111111;
  --radius: 8px;
  --shadow: 0 18px 50px rgba(17, 17, 17, 0.08);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--text);
  background: var(--page);
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
```

Then add responsive comparator rules:

```css
main {
  width: min(100%, 1480px);
  margin: 0 auto;
  padding: 2rem clamp(1rem, 3vw, 3rem) 4rem;
}

.comparator {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(1rem, 2vw, 1.5rem);
}

.comparator-panel {
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: clamp(0.75rem, 1.5vw, 1.25rem);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.preview-box {
  aspect-ratio: 16 / 9;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1.5rem, 4vw, 4rem);
  overflow: hidden;
}

.preview-box svg {
  max-width: 92%;
  max-height: 82%;
}

.panel-controls {
  display: grid;
  gap: 0.9rem;
  padding-top: 1rem;
}

.control-group {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
}

.control-label {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0;
}
```

Finish mobile behavior:

```css
@media (max-width: 780px) {
  .comparator {
    grid-template-columns: 1fr;
  }

  .control-group {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Commit comparator/UI base**

Run:

```bash
git add index.html css/style.css js/palette-controls.js js/comparator-panel.js
git commit -m "feat: redesign logo comparator controls"
```

---

### Task 5: Ranked Voting Frontend

**Files:**
- Modify: `js/votes-section.js`
- Modify: `js/main.js`
- Modify: `css/style.css`

- [ ] **Step 1: Replace vote section module**

Replace `js/votes-section.js` with a module that:

```js
import { LOGOS } from './logos.js';
import { PALETTES, PALETTE_KEYS } from './palettes.js';
import { renderPaletteTabs } from './palette-controls.js';
import { loadInlineSvg, recolorSvg } from './svg-loader.js';
import { getIdentity } from './identity.js';

function createEmptyRanking() {
  return Object.fromEntries(LOGOS.map((logo) => [logo.id, '']));
}

function hasCompleteRanking(ranking) {
  const ranks = Object.values(ranking).map(Number);
  return ranks.length === LOGOS.length
    && ranks.every((rank) => Number.isInteger(rank) && rank >= 1 && rank <= LOGOS.length)
    && new Set(ranks).size === LOGOS.length;
}

export function createVotesSection({ colorControlRoot, gridRoot, identityModal }) {
  let paletteKey = PALETTE_KEYS[0];
  let ranking = createEmptyRanking();
  let statusEl = null;
```

Render palette choice:

```js
function renderPaletteChoice() {
  colorControlRoot.innerHTML = `
    <div class="vote-step">
      <p class="eyebrow">Vote</p>
      <h2>Choisissez votre palette preferee</h2>
      <div class="palette-tabs" data-role="palette-tabs"></div>
    </div>
  `;
  renderPaletteTabs(colorControlRoot.querySelector('[data-role="palette-tabs"]'), paletteKey, (key) => {
    paletteKey = key;
    renderPaletteChoice();
  });
}
```

Render ranking cards:

```js
async function renderRankingGrid() {
  gridRoot.innerHTML = `
    <div class="ranking-header">
      <h2>Classez les logos</h2>
      <p>1 = prefere, 5 = moins prefere.</p>
    </div>
    <div class="ranking-grid" data-role="ranking-grid"></div>
    <p class="form-status" data-role="status" role="status"></p>
    <button type="button" class="primary-action" data-role="submit">Envoyer mon classement</button>
  `;
  statusEl = gridRoot.querySelector('[data-role="status"]');
  const list = gridRoot.querySelector('[data-role="ranking-grid"]');
  for (const logo of LOGOS) {
    const card = document.createElement('div');
    card.className = 'ranking-card';
    card.innerHTML = `
      <div class="preview-box ranking-preview" data-role="preview"></div>
      <label>
        <span>${logo.name}</span>
        <select data-role="rank" data-logo-id="${logo.id}">
          <option value="">Rang</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </label>
    `;
    list.appendChild(card);
    const previewEl = card.querySelector('[data-role="preview"]');
    previewEl.style.backgroundColor = '#ffffff';
    const svg = await loadInlineSvg(logo.src, previewEl);
    recolorSvg(svg, '#000000');
  }
```

Add change and submit handling:

```js
  for (const select of gridRoot.querySelectorAll('[data-role="rank"]')) {
    select.value = ranking[select.dataset.logoId] || '';
    select.addEventListener('change', () => {
      ranking = { ...ranking, [select.dataset.logoId]: select.value };
      statusEl.textContent = '';
    });
  }

  gridRoot.querySelector('[data-role="submit"]').addEventListener('click', submitVote);
}

async function submitVote() {
  if (!hasCompleteRanking(ranking)) {
    statusEl.textContent = 'Merci de classer les cinq logos avec un rang unique de 1 a 5.';
    return;
  }

  const identity = await identityModal.requireIdentity();
  const response = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitorId: identity.id,
      name: identity.name,
      paletteKey,
      ranking: Object.fromEntries(Object.entries(ranking).map(([logoId, rank]) => [logoId, Number(rank)])),
    }),
  });

  statusEl.textContent = response.ok
    ? 'Merci, votre vote a bien ete enregistre.'
    : 'Une erreur est survenue, reessayez.';
}

renderPaletteChoice();
renderRankingGrid();
}
```

- [ ] **Step 2: Wire identity modal in main**

In `js/main.js`, import and create the modal:

```js
import { createIdentityModal } from './identity-modal.js';

const identityModal = createIdentityModal(document.getElementById('identity-modal-root'));
```

Pass it to vote and feedback modules:

```js
createVotesSection({
  colorControlRoot: document.getElementById('votes-color-control'),
  gridRoot: document.getElementById('votes-grid'),
  identityModal,
});
```

- [ ] **Step 3: Add ranked voting CSS**

Add CSS for `.vote-step`, `.ranking-grid`, `.ranking-card`, `.ranking-preview`, `.primary-action`, `.form-status`, and disabled/hover/focus states. Use grid columns `repeat(auto-fit, minmax(170px, 1fr))`, card radius 8 px, white surfaces, black logo previews, and 44 px minimum select/button heights.

- [ ] **Step 4: Commit ranked voting frontend**

Run:

```bash
git add js/votes-section.js js/main.js css/style.css
git commit -m "feat: add palette and ranked logo voting"
```

---

### Task 6: Message Form Uses Identity Modal

**Files:**
- Modify: `js/feedback-form.js`
- Modify: `js/main.js`
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Update section copy**

In `index.html`, change:

```html
<h2>Un message pour nous ?</h2>
```

to:

```html
<h2>Un message pour moi</h2>
```

- [ ] **Step 2: Update feedback module signature**

In `js/feedback-form.js`, change:

```js
export function createFeedbackForm(formEl, statusEl, identityModal) {
```

Remove `ensureIdentity({ promptForName: () => null })`. Use existing `getIdentity()` to prefill:

```js
const identity = getIdentity();
if (identity.name) {
  nameInput.value = identity.name;
}
```

On submit, before sending:

```js
let name = nameInput.value.trim();
if (!name) {
  const identity = await identityModal.requireIdentity();
  name = identity.name;
  nameInput.value = name;
}
```

Keep `setName(name)` after a name exists.

- [ ] **Step 3: Pass identity modal from main**

In `js/main.js`, call:

```js
createFeedbackForm(
  document.getElementById('feedback-form'),
  document.getElementById('feedback-status'),
  identityModal
);
```

- [ ] **Step 4: Add form and modal CSS**

Style `#feedback-form`, inputs, textarea, `.identity-modal`, `.identity-modal__backdrop`, `.identity-modal__panel`, `.identity-modal__form`, and `.identity-modal__error` with the same minimal premium tokens. Use `position: fixed`, z-index 50, readable contrast, and no layout overlap.

- [ ] **Step 5: Commit message/modal integration**

Run:

```bash
git add index.html js/feedback-form.js js/main.js css/style.css
git commit -m "feat: use custom identity modal for messages"
```

---

### Task 7: Admin Results Update

**Files:**
- Modify: `admin.html`
- Modify: `js/admin.js`
- Modify: `css/admin.css`

- [ ] **Step 1: Update admin headings**

In `admin.html`, change:

```html
<h2>Votes par logo</h2>
```

to:

```html
<h2>Synthese des votes</h2>
```

- [ ] **Step 2: Replace admin vote rendering**

In `js/admin.js`, replace `renderVotes(votesData)` with a renderer that outputs:

```js
function renderVotes(votesData) {
  const container = document.getElementById('votes-summary');
  container.innerHTML = '';

  const paletteBlock = document.createElement('div');
  paletteBlock.className = 'admin-card';
  paletteBlock.innerHTML = `
    <h3>Palettes preferees</h3>
    <ul>
      <li>Palette 1 — ${votesData.palettes?.palette1 || 0}</li>
      <li>Palette 2 — ${votesData.palettes?.palette2 || 0}</li>
    </ul>
  `;
  container.appendChild(paletteBlock);

  const logoBlock = document.createElement('div');
  logoBlock.className = 'admin-card';
  logoBlock.innerHTML = '<h3>Classement moyen des logos</h3>';
  const logoList = document.createElement('ul');
  for (const logo of LOGOS) {
    const summary = votesData.logos?.[logo.id] || { score: 0, averageRank: null, voteCount: 0 };
    const li = document.createElement('li');
    li.textContent = `${logo.name} — moyenne ${summary.averageRank === null ? 'n/a' : summary.averageRank.toFixed(2)} (${summary.voteCount} votes)`;
    logoList.appendChild(li);
  }
  logoBlock.appendChild(logoList);
  container.appendChild(logoBlock);

  const detailBlock = document.createElement('div');
  detailBlock.className = 'admin-card';
  detailBlock.innerHTML = '<h3>Details par visiteur</h3>';
  const detailList = document.createElement('ul');
  for (const voter of votesData.voters || []) {
    const li = document.createElement('li');
    const ordered = Object.entries(voter.ranking || {})
      .sort((a, b) => a[1] - b[1])
      .map(([logoId, rank]) => `${rank}. ${LOGOS.find((logo) => logo.id === logoId)?.name || logoId}`)
      .join(' / ');
    li.textContent = `${voter.name} — ${voter.paletteKey} — ${ordered}`;
    detailList.appendChild(li);
  }
  detailBlock.appendChild(detailList);
  container.appendChild(detailBlock);
}
```

- [ ] **Step 3: Update admin CSS**

Replace `.logo-summary` selectors with `.admin-card`, remove emoji-based styling assumptions, keep readable lists and white cards.

- [ ] **Step 4: Commit admin update**

Run:

```bash
git add admin.html js/admin.js css/admin.css
git commit -m "feat: show ranked voting results in admin"
```

---

### Task 8: Verification and Visual Polish

**Files:**
- Modify: `css/style.css` only when public page verification reveals layout, contrast, focus, or responsive defects.
- Modify: `css/admin.css` only when admin page verification reveals layout, contrast, focus, or responsive defects.
- Modify: `js/votes-section.js`, `js/comparator-panel.js`, or `js/feedback-form.js` only when manual verification reveals an interaction defect in that module.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: PASS with no failing tests.

- [ ] **Step 2: Start local dev server**

Run: `npm run dev`

Expected: server prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 3: Manually verify public page**

Open the local URL and verify:

- first viewport shows the comparator, not the vote;
- two comparator panels are side by side on desktop and stacked on mobile width;
- each panel has controls below the preview;
- `Fond` and `Logo` labels sit beside color swatches;
- clicking logo thumbnails updates only that panel;
- vote section asks palette first and ranking second;
- logos in voting cards are black on white;
- duplicate/incomplete ranking shows a clear status message;
- submitting a valid vote opens the custom first-name modal if no name exists;
- message section reads `Un message pour moi`.

- [ ] **Step 4: Check responsive and accessibility basics**

Use browser resizing around 375 px, 768 px, 1024 px, and 1440 px. Verify no horizontal scroll, no overlapping text, visible focus states, and button/select/input target height at least 44 px.

- [ ] **Step 5: Commit final polish**

If changes were required:

```bash
git add css/style.css css/admin.css js
git commit -m "style: polish responsive logo showcase"
```

If no changes were required, skip this commit.
