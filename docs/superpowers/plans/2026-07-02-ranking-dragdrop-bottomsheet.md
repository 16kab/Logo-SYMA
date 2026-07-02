# Classement drag & drop + bandeau d'envoi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dropdown-based logo ranking with a vertical drag-and-drop list, put the hero on one line, and replace the separate submit button + message form with a bottom-sheet that appears on first interaction and sends palette + logo order + optional message + name in a single vote submission.

**Architecture:** Pure order logic lives in a new tested module (`js/ranking-order.js`); the drag list (`js/ranking-list.js`) and bottom sheet (`js/submission-bar.js`) are DOM components verified manually; `js/votes-section.js` is rewritten to orchestrate them. The message is folded into the vote record (`/api/vote`), so the standalone `/api/message` + `/api/messages` endpoints, the on-page feedback form, and the identity modal are removed.

**Tech Stack:** Vanilla ES modules (no framework/build), Pointer Events for drag (touch + mouse), Node's built-in `node:test`, Vercel serverless functions + Redis (`redis` client), local `dev-server.js`.

## Global Constraints

- No frontend build step: plain ES modules, no bundler/framework.
- Tests run via `node --test tests/**/*.test.js` (wired as `npm test`); every task ends with a green full suite.
- Logo ids, fixed order: `logo1`..`logo7` (from `js/logos.js` `LOGO_IDS`). Rank of a logo = its position in the order + 1.
- Palette keys: `palette1`, `palette2` (from `js/palettes.js` `PALETTE_KEYS`).
- Vote record shape stored in Redis hash `votes`, keyed by `visitorId`: `{ name, paletteKey, ranking, message?, ts }` where `ranking` is `{ logoId: rankNumber }` and `message` is present only when non-empty.
- Palette is required to submit (the vote handler already rejects an invalid `paletteKey`).
- Name sanitization: `sanitizeName` (trims, defaults to `'Anonyme'`, max 60). Message: `sanitizeMessage` (trims, `null` if empty, max 2000). Both already exist in `api/_lib/validate.js`.
- `prefers-reduced-motion: reduce` must disable drag/hover transitions.
- Identity helpers (`js/identity.js`): `getIdentity()` → `{id, name}`; `ensureIdentityId({...})` → id (no prompt); `setName(name)`. The bottom sheet uses these directly (no modal).

---

### Task 1: Ranking order domain module

**Files:**
- Create: `js/ranking-order.js`
- Test: `tests/ranking-order.test.js`

**Interfaces:**
- Consumes: `LOGO_IDS` from `js/logos.js`.
- Produces: `defaultOrder()` → `string[]` (copy of `LOGO_IDS`); `moveItem(order, fromIndex, toIndex)` → new `string[]` with the element moved (pure, clamps indices, no mutation); `orderToRanking(order)` → `{ [logoId]: number }` where value = index + 1.

- [ ] **Step 1: Write the failing test**

`tests/ranking-order.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultOrder, moveItem, orderToRanking } from '../js/ranking-order.js';

test('defaultOrder returns the seven logo ids in order', () => {
  assert.deepEqual(defaultOrder(), ['logo1', 'logo2', 'logo3', 'logo4', 'logo5', 'logo6', 'logo7']);
});

test('defaultOrder returns a fresh array each call (no shared reference)', () => {
  const a = defaultOrder();
  a[0] = 'mutated';
  assert.equal(defaultOrder()[0], 'logo1');
});

test('moveItem moves an element down without mutating the input', () => {
  const order = ['logo1', 'logo2', 'logo3'];
  assert.deepEqual(moveItem(order, 0, 2), ['logo2', 'logo3', 'logo1']);
  assert.deepEqual(order, ['logo1', 'logo2', 'logo3']);
});

test('moveItem moves an element up', () => {
  assert.deepEqual(moveItem(['logo1', 'logo2', 'logo3'], 2, 0), ['logo3', 'logo1', 'logo2']);
});

test('moveItem clamps out-of-range target indices', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 9), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, -3), ['c', 'a', 'b']);
});

test('moveItem returns an equivalent order when indices are equal', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c']);
});

test('orderToRanking maps each logo to its position + 1', () => {
  assert.deepEqual(orderToRanking(['logo3', 'logo1', 'logo2']), { logo3: 1, logo1: 2, logo2: 3 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ranking-order.test.js`
Expected: FAIL with "Cannot find module '../js/ranking-order.js'"

- [ ] **Step 3: Implement `js/ranking-order.js`**

```js
import { LOGO_IDS } from './logos.js';

export function defaultOrder() {
  return [...LOGO_IDS];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function moveItem(order, fromIndex, toIndex) {
  const next = [...order];
  const from = clamp(fromIndex, 0, next.length - 1);
  const to = clamp(toIndex, 0, next.length - 1);
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function orderToRanking(order) {
  return Object.fromEntries(order.map((logoId, index) => [logoId, index + 1]));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/ranking-order.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the full suite and commit**

Run: `npm test` → all pass.

```bash
git add js/ranking-order.js tests/ranking-order.test.js
git commit -m "feat: add ranking-order domain module"
```

---

### Task 2: Vote handler + summary carry an optional message

**Files:**
- Modify: `api/vote.js`
- Modify: `api/_lib/voteLogic.js`
- Test: `tests/api-vote.test.js` (modify)
- Test: `tests/voteLogic.test.js` (modify)

**Interfaces:**
- Consumes: `sanitizeMessage`, `sanitizeName`, `isValidPaletteKey`, `isValidRanking` from `api/_lib/validate.js`; `computeRankedVoteSummary` from `api/_lib/voteLogic.js`.
- Produces: `/api/vote` stores `message` in the vote record only when the sanitized message is non-empty; `computeRankedVoteSummary` includes `message` (or `undefined`) on each voter object.

- [ ] **Step 1: Update the failing tests**

In `tests/api-vote.test.js`, add these two tests after the existing `records a ranked vote with palette choice` test:

```js
test('stores an optional message with the vote', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv, () => 12345);
  await handler({ method: 'POST', body: { visitorId: 'v1', name: 'Alexis', paletteKey: 'palette1', ranking, message: '  Superbe travail  ' } }, createMockRes());
  const stored = await kv.hgetall('votes');
  assert.deepEqual(stored.v1, { name: 'Alexis', paletteKey: 'palette1', ranking, message: 'Superbe travail', ts: 12345 });
});

test('omits the message key when no message is provided', async () => {
  const kv = createFakeKv();
  const handler = createVoteHandler(kv, () => 12345);
  await handler({ method: 'POST', body: { visitorId: 'v1', name: 'Alexis', paletteKey: 'palette1', ranking, message: '   ' } }, createMockRes());
  const stored = await kv.hgetall('votes');
  assert.deepEqual(stored.v1, { name: 'Alexis', paletteKey: 'palette1', ranking, ts: 12345 });
});
```

In `tests/voteLogic.test.js`, add this test (the file already imports `computeRankedVoteSummary` and `assert`):

```js
test('computeRankedVoteSummary carries each voter message', () => {
  const summary = computeRankedVoteSummary([
    ['v1', { name: 'Alexis', paletteKey: 'palette1', ranking: { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5, logo6: 6, logo7: 7 }, message: 'Bravo', ts: 1 }],
    ['v2', { name: 'Camille', paletteKey: 'palette2', ranking: { logo1: 2, logo2: 1, logo3: 3, logo4: 4, logo5: 5, logo6: 6, logo7: 7 }, ts: 2 }],
  ]);
  assert.equal(summary.voters[0].message, 'Bravo');
  assert.equal(summary.voters[1].message, undefined);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/api-vote.test.js tests/voteLogic.test.js`
Expected: FAIL — the message is not stored/returned yet (deepEqual mismatch and `undefined !== 'Bravo'`).

- [ ] **Step 3: Update `api/vote.js`**

Replace the file body with:

```js
import { getKv } from './_lib/kv.js';
import { isValidPaletteKey, isValidRanking, sanitizeName, sanitizeMessage } from './_lib/validate.js';

export function createVoteHandler(kv, now = () => Date.now()) {
  return async function voteHandler(req, res) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { visitorId, name, paletteKey, ranking, message } = req.body || {};

    if (!visitorId || !isValidPaletteKey(paletteKey) || !isValidRanking(ranking)) {
      res.status(400).json({ error: 'Invalid vote payload' });
      return;
    }

    const record = { name: sanitizeName(name), paletteKey, ranking, ts: now() };
    const cleanMessage = sanitizeMessage(message);
    if (cleanMessage) record.message = cleanMessage;

    await kv.hset('votes', { [visitorId]: record });
    res.status(200).json({ status: 'saved' });
  };
}

export default createVoteHandler(getKv());
```

Note: the stored record above lists `message` after `ranking` and before `ts` only when present; the tests compare with `assert.deepEqual`, which is key-order-insensitive, so property order does not matter.

- [ ] **Step 4: Update `api/_lib/voteLogic.js`**

In `computeRankedVoteSummary`, change the `voters.push({...})` call to include the message:

```js
    voters.push({
      visitorId,
      name: entry.name,
      paletteKey: entry.paletteKey,
      ranking: entry.ranking,
      message: entry.message,
      ts: entry.ts,
    });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/api-vote.test.js tests/voteLogic.test.js`
Expected: PASS

- [ ] **Step 6: Run the full suite and commit**

Run: `npm test` → all pass.

```bash
git add api/vote.js api/_lib/voteLogic.js tests/api-vote.test.js tests/voteLogic.test.js
git commit -m "feat: fold optional message into the vote record"
```

---

### Task 3: Hero on one line

**Files:**
- Modify: `css/dev-immersive.css` (the `.dev-immersive .intro-title` and `.dev-immersive .intro-lede` rules)
- Modify: `index.html` (shorten the lede copy so it fits one line on desktop)

**Interfaces:**
- None (visual only). No automated test — verified by reading the served page.

- [ ] **Step 1: Shorten the lede in `index.html`**

Replace the intro lede paragraph:

```html
      <p class="intro-lede">Comparez les directions côte à côte, projetez-les sur les couleurs de la marque, puis classez vos préférées. Un mot à me laisser&nbsp;? C'est tout en bas.</p>
```

with:

```html
      <p class="intro-lede">Comparez les directions, projetez-les sur les couleurs de la marque, puis classez vos préférées.</p>
```

- [ ] **Step 2: Update the intro CSS in `css/dev-immersive.css`**

Replace the `.dev-immersive .intro-title` and `.dev-immersive .intro-lede` rules with:

```css
.dev-immersive .intro-title {
  margin: 0.2rem 0 0.9rem;
  color: var(--text);
  font-family: var(--font-display);
  font-size: clamp(1.9rem, 3.6vw, 3.6rem);
  font-weight: 600;
  line-height: 1.02;
  letter-spacing: -0.025em;
}

.dev-immersive .intro-lede {
  margin: 0;
  color: var(--muted);
  font-size: clamp(1rem, 1.3vw, 1.15rem);
  line-height: 1.55;
}

@media (min-width: 900px) {
  .dev-immersive .intro-title,
  .dev-immersive .intro-lede {
    white-space: nowrap;
  }
}
```

Also, so the nowrap title is not clipped by the intro's max width, remove the `max-width: 62ch;` from the `.dev-immersive .intro` rule (change it to `max-width: none;`) and remove the `max-width: 54ch;` from `.dev-immersive .intro-lede` if present (the replacement rule above already omits it).

- [ ] **Step 3: Manually verify**

Run in the background: `npm run dev`. Open `http://localhost:3000` at a desktop width (≥1200px).
Expected: the hero title "Sept directions de logo pour SYMA" sits on one line, and the lede sits on one line; at a narrow width (<900px) both wrap normally. Stop the server.

- [ ] **Step 4: Run the full suite and commit**

Run: `npm test` → all pass (no test touches these rules).

```bash
git add index.html css/dev-immersive.css
git commit -m "feat: put the hero title and lede on one line on desktop"
```

---

### Task 4: Vertical drag-and-drop ranking list component

**Files:**
- Create: `js/ranking-list.js`
- Modify: `css/dev-immersive.css` (add ranking-list styles; leave the old `.ranking-*`/`.rank-picker*` rules in place for now — they are removed in Task 6)
- Test: `tests/dev-immersive-css.test.js` (add an assertion for the new classes)

**Interfaces:**
- Consumes: `LOGOS` from `js/logos.js`; `loadInlineSvg`, `recolorSvg` from `js/svg-loader.js`; `moveItem` from `js/ranking-order.js`.
- Produces: `createRankingList(root, { order, onChange, onFirstInteraction })` → `{ getOrder(), setOrder(order) }`. Renders a vertical list in the given `order` (array of logo ids). Calls `onChange(newOrder)` after every reorder (drag drop or keyboard move) and `onFirstInteraction()` once, before the first `onChange`.

- [ ] **Step 1: Implement `js/ranking-list.js`**

```js
import { LOGOS } from './logos.js';
import { loadInlineSvg, recolorSvg } from './svg-loader.js';
import { moveItem } from './ranking-order.js';

const LOGO_BY_ID = Object.fromEntries(LOGOS.map((logo) => [logo.id, logo]));

export function createRankingList(root, { order, onChange, onFirstInteraction } = {}) {
  let currentOrder = [...order];
  let interacted = false;

  root.className = 'ranking-list';
  root.setAttribute('role', 'list');

  function notifyFirstInteraction() {
    if (interacted) return;
    interacted = true;
    onFirstInteraction?.();
  }

  function commit(newOrder) {
    currentOrder = newOrder;
    render();
    onChange?.([...currentOrder]);
  }

  async function render() {
    root.innerHTML = '';
    for (let index = 0; index < currentOrder.length; index += 1) {
      const logo = LOGO_BY_ID[currentOrder[index]];
      const row = document.createElement('div');
      row.className = 'ranking-row';
      row.setAttribute('role', 'listitem');
      row.dataset.logoId = logo.id;
      row.innerHTML = `
        <button type="button" class="ranking-row__handle" data-role="handle"
          aria-label="Déplacer ${logo.name}" title="Glisser pour classer">⠿</button>
        <span class="ranking-row__rank" data-role="rank">${index + 1}</span>
        <span class="preview-box ranking-row__preview" data-role="preview"></span>
        <span class="ranking-row__name">${logo.name}</span>
      `;
      root.appendChild(row);

      const previewEl = row.querySelector('[data-role="preview"]');
      previewEl.style.backgroundColor = '#ffffff';
      const svg = await loadInlineSvg(logo.src, previewEl);
      recolorSvg(svg, '#000000');
    }
  }

  function indexOfRow(rowEl) {
    return [...root.querySelectorAll('.ranking-row')].indexOf(rowEl);
  }

  // Pointer drag (mouse + touch)
  let drag = null;

  root.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('[data-role="handle"]');
    if (!handle) return;
    const row = handle.closest('.ranking-row');
    const rows = [...root.querySelectorAll('.ranking-row')];
    const fromIndex = rows.indexOf(row);
    const tops = rows.map((r) => r.getBoundingClientRect().top);
    const step = rows.length > 1 ? tops[1] - tops[0] : row.getBoundingClientRect().height;

    drag = { row, fromIndex, targetIndex: fromIndex, startY: event.clientY, rows, step };
    handle.setPointerCapture(event.pointerId);
    row.classList.add('is-dragging');
    notifyFirstInteraction();
    event.preventDefault();
  });

  root.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dy = event.clientY - drag.startY;
    drag.row.style.transform = `translateY(${dy}px)`;

    const rawTarget = drag.fromIndex + Math.round(dy / drag.step);
    const targetIndex = Math.max(0, Math.min(drag.rows.length - 1, rawTarget));
    if (targetIndex === drag.targetIndex) return;
    drag.targetIndex = targetIndex;

    drag.rows.forEach((r, i) => {
      if (r === drag.row) return;
      let shift = 0;
      if (drag.fromIndex < targetIndex && i > drag.fromIndex && i <= targetIndex) shift = -drag.step;
      if (drag.fromIndex > targetIndex && i >= targetIndex && i < drag.fromIndex) shift = drag.step;
      r.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  });

  function endDrag() {
    if (!drag) return;
    const { fromIndex, targetIndex, rows, row } = drag;
    rows.forEach((r) => { r.style.transform = ''; });
    row.classList.remove('is-dragging');
    drag = null;
    if (targetIndex !== fromIndex) {
      commit(moveItem(currentOrder, fromIndex, targetIndex));
    }
  }

  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);

  // Keyboard reorder on the focused handle
  root.addEventListener('keydown', (event) => {
    const handle = event.target.closest?.('[data-role="handle"]');
    if (!handle) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const fromIndex = indexOfRow(handle.closest('.ranking-row'));
    const toIndex = fromIndex + (event.key === 'ArrowUp' ? -1 : 1);
    if (toIndex < 0 || toIndex >= currentOrder.length) return;
    notifyFirstInteraction();
    commit(moveItem(currentOrder, fromIndex, toIndex));
    const handles = root.querySelectorAll('[data-role="handle"]');
    handles[toIndex]?.focus();
  });

  render();

  return {
    getOrder: () => [...currentOrder],
    setOrder: (nextOrder) => { currentOrder = [...nextOrder]; render(); },
  };
}
```

- [ ] **Step 2: Add ranking-list styles to `css/dev-immersive.css`**

Append these rules (do not remove any existing rule in this task):

```css
.dev-immersive .ranking-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.dev-immersive .ranking-row {
  display: grid;
  grid-template-columns: auto auto 84px 1fr;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-soft);
  color: var(--ink);
  transition: transform 180ms ease, box-shadow 180ms ease;
  will-change: transform;
}

.dev-immersive .ranking-row:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
}

.dev-immersive .ranking-row.is-dragging {
  transform: scale(1.02);
  box-shadow: var(--shadow);
  z-index: 3;
  position: relative;
  transition: none;
}

.dev-immersive .ranking-row__handle {
  border: none;
  background: transparent;
  color: var(--muted);
  font-size: 1.3rem;
  line-height: 1;
  padding: 0.4rem;
  border-radius: 6px;
  cursor: grab;
  touch-action: none;
  opacity: 0.5;
  transition: opacity 180ms ease;
}

.dev-immersive .ranking-row:hover .ranking-row__handle,
.dev-immersive .ranking-row__handle:focus-visible {
  opacity: 1;
}

.dev-immersive .ranking-row.is-dragging .ranking-row__handle {
  cursor: grabbing;
}

.dev-immersive .ranking-row__rank {
  min-width: 1.6rem;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--ink);
  text-align: center;
}

.dev-immersive .ranking-row__preview {
  width: 84px;
  height: 56px;
  border-radius: 6px;
  padding: 0.4rem;
}

.dev-immersive .ranking-row__name {
  font-weight: 600;
  color: var(--ink);
}

@media (prefers-reduced-motion: reduce) {
  .dev-immersive .ranking-row {
    transition: none;
  }
}
```

- [ ] **Step 3: Add a CSS assertion in `tests/dev-immersive-css.test.js`**

Add this test at the end of the file (it reads the CSS the same way the existing tests do — reuse the file's existing `css` variable/loader; if the file loads the CSS into a `const css`, add the test in the same scope):

```js
test('immersive theme styles the drag-and-drop ranking list', () => {
  assert.match(css, /\.dev-immersive\s+\.ranking-list\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.ranking-row\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.ranking-row__handle\s*\{/);
});
```

- [ ] **Step 4: Verify**

Run: `node --check js/ranking-list.js` → no output (valid).
Run: `node --test tests/dev-immersive-css.test.js` → PASS.
Run: `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add js/ranking-list.js css/dev-immersive.css tests/dev-immersive-css.test.js
git commit -m "feat: add vertical drag-and-drop ranking list component"
```

---

### Task 5: Bottom-sheet submission bar component

**Files:**
- Create: `js/submission-bar.js`
- Modify: `css/dev-immersive.css` (append submission-bar styles)
- Test: `tests/dev-immersive-css.test.js` (add an assertion for the new classes)

**Interfaces:**
- Consumes: `LOGOS`, `PALETTES` (`js/palettes.js`), `orderToRanking` (`js/ranking-order.js`), `getIdentity`/`ensureIdentityId`/`setName` (`js/identity.js`).
- Produces: `createSubmissionBar(root, { onSubmit })` → `{ show(), update({ paletteKey, order }) }`. `onSubmit({ paletteKey, ranking, message, name })` is an async function returning `true` on success / `false` on failure; the bar owns the message + name inputs, the Send button (disabled while `paletteKey` is falsy), and the inline status text.

- [ ] **Step 1: Implement `js/submission-bar.js`**

```js
import { LOGOS } from './logos.js';
import { PALETTES } from './palettes.js';
import { orderToRanking } from './ranking-order.js';
import { getIdentity, ensureIdentityId, setName } from './identity.js';

const LOGO_BY_ID = Object.fromEntries(LOGOS.map((logo) => [logo.id, logo]));

export function createSubmissionBar(root, { onSubmit } = {}) {
  let paletteKey = null;
  let order = [];

  root.className = 'submission-bar';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="submission-bar__inner">
      <div class="submission-bar__summary">
        <div class="submission-bar__palette" data-role="palette"></div>
        <div class="submission-bar__order" data-role="order"></div>
      </div>
      <div class="submission-bar__form">
        <input type="text" class="submission-bar__name" data-role="name" placeholder="Votre prénom" aria-label="Votre prénom" />
        <input type="text" class="submission-bar__message" data-role="message" placeholder="Un message (optionnel)" aria-label="Votre message" />
        <button type="button" class="submission-bar__send" data-role="send">Envoyer</button>
      </div>
      <p class="submission-bar__status" data-role="status" role="status"></p>
    </div>
  `;

  const paletteEl = root.querySelector('[data-role="palette"]');
  const orderEl = root.querySelector('[data-role="order"]');
  const nameInput = root.querySelector('[data-role="name"]');
  const messageInput = root.querySelector('[data-role="message"]');
  const sendButton = root.querySelector('[data-role="send"]');
  const statusEl = root.querySelector('[data-role="status"]');

  const existing = getIdentity();
  if (existing.name) nameInput.value = existing.name;

  function renderSummary() {
    if (paletteKey) {
      const swatches = PALETTES[paletteKey].colors
        .map((color) => `<span class="submission-bar__swatch" style="background-color:${color}"></span>`)
        .join('');
      paletteEl.innerHTML = `<span class="submission-bar__label">${PALETTES[paletteKey].label}</span><span class="submission-bar__swatches">${swatches}</span>`;
    } else {
      paletteEl.innerHTML = '<span class="submission-bar__label submission-bar__label--muted">Choisissez une palette</span>';
    }
    orderEl.textContent = order.map((id, i) => `${i + 1}. ${LOGO_BY_ID[id].name}`).join('  ·  ');
    sendButton.disabled = !paletteKey;
    sendButton.title = paletteKey ? '' : 'Choisissez une palette pour envoyer';
  }

  sendButton.addEventListener('click', async () => {
    if (!paletteKey) return;
    const name = nameInput.value.trim();
    if (name) setName(name);
    const id = ensureIdentityId();

    sendButton.disabled = true;
    statusEl.textContent = '';
    const ok = await onSubmit?.({
      paletteKey,
      ranking: orderToRanking(order),
      message: messageInput.value,
      name,
      visitorId: id,
    });
    sendButton.disabled = false;
    statusEl.textContent = ok
      ? `Merci ${name || ''}, c'est envoyé ✓`.replace('  ', ' ')
      : 'Une erreur est survenue, réessayez.';
  });

  return {
    show() {
      root.classList.add('is-visible');
      root.setAttribute('aria-hidden', 'false');
    },
    update(state) {
      if ('paletteKey' in state) paletteKey = state.paletteKey;
      if ('order' in state) order = [...state.order];
      renderSummary();
    },
  };
}
```

- [ ] **Step 2: Append submission-bar styles to `css/dev-immersive.css`**

```css
.dev-immersive .submission-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  transform: translateY(110%);
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  background: var(--surface);
  color: var(--ink);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  box-shadow: 0 -30px 80px rgba(0, 0, 0, 0.4);
}

.dev-immersive .submission-bar.is-visible {
  transform: translateY(0);
}

.dev-immersive .submission-bar__inner {
  width: min(100%, 1100px);
  margin: 0 auto;
  padding: 1rem clamp(1rem, 3vw, 2rem) 1.4rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.8rem 1.4rem;
}

.dev-immersive .submission-bar__summary {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1 1 260px;
  min-width: 0;
}

.dev-immersive .submission-bar__palette {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.dev-immersive .submission-bar__label {
  font-family: var(--font-display);
  font-weight: 600;
}

.dev-immersive .submission-bar__label--muted {
  color: var(--muted);
}

.dev-immersive .submission-bar__swatches {
  display: inline-flex;
  gap: 4px;
}

.dev-immersive .submission-bar__swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(17, 19, 25, 0.15);
}

.dev-immersive .submission-bar__order {
  font-size: 0.85rem;
  color: var(--muted);
  overflow-x: auto;
  white-space: nowrap;
}

.dev-immersive .submission-bar__form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  flex: 2 1 420px;
}

.dev-immersive .submission-bar__name {
  flex: 1 1 130px;
}

.dev-immersive .submission-bar__message {
  flex: 2 1 200px;
}

.dev-immersive .submission-bar__name,
.dev-immersive .submission-bar__message {
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #ffffff;
  color: var(--ink);
}

.dev-immersive .submission-bar__send {
  flex: 0 0 auto;
  padding: 0.65rem 1.4rem;
  border: none;
  border-radius: var(--radius);
  background: var(--ink);
  color: #ffffff;
  font-weight: 600;
  transition: opacity 180ms ease, transform 180ms ease;
}

.dev-immersive .submission-bar__send:hover:not(:disabled) {
  transform: translateY(-1px);
}

.dev-immersive .submission-bar__send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.dev-immersive .submission-bar__status {
  flex: 1 1 100%;
  margin: 0;
  min-height: 1.2em;
  font-size: 0.9rem;
  color: var(--success);
}

@media (prefers-reduced-motion: reduce) {
  .dev-immersive .submission-bar {
    transition: none;
  }
}
```

- [ ] **Step 3: Add a CSS assertion in `tests/dev-immersive-css.test.js`**

```js
test('immersive theme styles the submission bar', () => {
  assert.match(css, /\.dev-immersive\s+\.submission-bar\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.submission-bar\.is-visible\s*\{/);
  assert.match(css, /\.dev-immersive\s+\.submission-bar__send\s*\{/);
});
```

- [ ] **Step 4: Verify**

Run: `node --check js/submission-bar.js` → valid.
Run: `node --test tests/dev-immersive-css.test.js` → PASS.
Run: `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add js/submission-bar.js css/dev-immersive.css tests/dev-immersive-css.test.js
git commit -m "feat: add bottom-sheet submission bar component"
```

---

### Task 6: Rewrite votes-section; wire drag list + submission bar; remove feedback form and identity modal

**Files:**
- Modify: `js/votes-section.js` (full rewrite)
- Modify: `js/main.js`
- Modify: `index.html` (remove feedback section + identity-modal-root)
- Delete: `js/feedback-form.js`, `js/identity-modal.js`, `tests/feedback-form.test.js`, `tests/votes-section.test.js`
- Modify: `css/dev-immersive.css` (remove old `.ranking-*`, `.rank-picker*`, `.vote-palette-*` sizing tied to the grid, `#feedback-form`, `.primary-action`, `.ranking-header`, `.ranking-card`, `.ranking-preview` rules that no longer have markup)
- Modify: `css/style.css` (remove base `.ranking-grid`, `.rank-picker*`, `#feedback-form`, `.form-status`, `.primary-action` rules if present)
- Modify: `tests/dev-immersive-css.test.js` (remove the old `.ranking-card`, `.ranking-grid` 3-col, `.rank-picker*`, `#feedback-form` assertions)
- Modify: `tests/css-layout.test.js` (remove/replace the `.ranking-grid` and `#feedback-form` assertions)

**Interfaces:**
- Consumes: `PALETTES`/`PALETTE_KEYS` (`js/palettes.js`); `createRankingList` (`js/ranking-list.js`, Task 4); `createSubmissionBar` (`js/submission-bar.js`, Task 5); `defaultOrder`/`orderToRanking` (`js/ranking-order.js`, Task 1); `getIdentity` (`js/identity.js`).
- Produces: `createVotesSection({ colorControlRoot, gridRoot, submissionRoot })`. No longer exports pure ranking functions. Palette starts unselected (`null`). The submission bar appears on first palette click or first ranking interaction.

- [ ] **Step 1: Rewrite `js/votes-section.js`**

Replace the entire file with:

```js
import { PALETTES, PALETTE_KEYS } from './palettes.js';
import { createRankingList } from './ranking-list.js';
import { createSubmissionBar } from './submission-bar.js';
import { defaultOrder } from './ranking-order.js';
import { getIdentity } from './identity.js';

export function createVotesSection({ colorControlRoot, gridRoot, submissionRoot }) {
  let paletteKey = null;
  let order = defaultOrder();
  let bar = null;
  let rankingList = null;

  function createPaletteStack(paletteKeyToRender) {
    const stack = document.createElement('span');
    stack.className = 'palette-stack';
    stack.setAttribute('aria-hidden', 'true');
    for (const color of PALETTES[paletteKeyToRender].colors) {
      const swatch = document.createElement('span');
      swatch.className = 'palette-stack__swatch';
      swatch.style.backgroundColor = color;
      stack.appendChild(swatch);
    }
    return stack;
  }

  function renderPaletteChoice() {
    colorControlRoot.innerHTML = `
      <div class="vote-step">
        <p class="eyebrow">Vote</p>
        <h2>Choisissez votre palette préférée</h2>
        <div class="vote-palette-grid" data-role="palette-grid"></div>
      </div>
    `;

    const grid = colorControlRoot.querySelector('[data-role="palette-grid"]');
    for (const key of PALETTE_KEYS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vote-palette-card';
      button.classList.toggle('is-active', key === paletteKey);
      button.setAttribute('aria-pressed', String(key === paletteKey));
      button.appendChild(createPaletteStack(key));
      const label = document.createElement('span');
      label.className = 'vote-palette-card__label';
      label.textContent = PALETTES[key].label;
      button.appendChild(label);
      button.addEventListener('click', () => {
        paletteKey = key;
        renderPaletteChoice();
        bar.show();
        bar.update({ paletteKey, order });
      });
      grid.appendChild(button);
    }
  }

  async function submitVote({ paletteKey: pk, ranking, message, name, visitorId }) {
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, name, paletteKey: pk, ranking, message }),
      });
      return response.ok;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function renderRankingHeader() {
    gridRoot.innerHTML = `
      <div class="ranking-header">
        <h2>Classez les logos</h2>
        <p>Glissez pour classer — 1 = préféré, 7 = moins préféré.</p>
      </div>
      <div data-role="ranking-list"></div>
    `;
    return gridRoot.querySelector('[data-role="ranking-list"]');
  }

  function hydrateExistingVote() {
    const { id } = getIdentity();
    if (!id) return;
    fetch(`/api/votes?visitorId=${encodeURIComponent(id)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data || !data.myVote) return;
        if (data.myVote.paletteKey) paletteKey = data.myVote.paletteKey;
        const r = data.myVote.ranking;
        if (r) {
          order = [...order].sort((a, b) => (r[a] || 99) - (r[b] || 99));
          rankingList.setOrder(order);
        }
        renderPaletteChoice();
        bar.show();
        bar.update({ paletteKey, order });
      })
      .catch((error) => console.error(error));
  }

  function initialize() {
    bar = createSubmissionBar(submissionRoot, { onSubmit: submitVote });
    renderPaletteChoice();
    const listRoot = renderRankingHeader();
    rankingList = createRankingList(listRoot, {
      order,
      onFirstInteraction: () => {
        bar.show();
        bar.update({ paletteKey, order });
      },
      onChange: (nextOrder) => {
        order = nextOrder;
        bar.update({ paletteKey, order });
      },
    });
    bar.update({ paletteKey, order });
    hydrateExistingVote();
  }

  initialize();
}
```

- [ ] **Step 2: Update `index.html`**

Remove the entire feedback `<section>`:

```html
    <section class="feedback-section" aria-label="Message">
      <h2>Un message pour moi</h2>
      <form id="feedback-form">
        <label for="feedback-name">Votre prénom</label>
        <input type="text" id="feedback-name" name="name" />
        <label for="feedback-message">Votre message</label>
        <textarea id="feedback-message" name="message" required></textarea>
        <button type="submit">Envoyer</button>
      </form>
      <p id="feedback-status" role="status"></p>
    </section>
```

Replace the `<div id="identity-modal-root"></div>` line with a submission-bar mount point:

```html
  <div id="submission-bar-root"></div>
```

(Keep the `<script type="module" src="js/main.js"></script>` line as-is.)

- [ ] **Step 3: Update `js/main.js`**

Replace the entire file with:

```js
import { createComparatorPanel } from './comparator-panel.js';
import { createVotesSection } from './votes-section.js';
import { activateDevTheme } from './dev-theme.js';

document.addEventListener('DOMContentLoaded', () => {
  activateDevTheme();

  createComparatorPanel(document.getElementById('panel-left'), {
    paletteKey: 'palette1',
    logoId: 'logo1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
  });

  createComparatorPanel(document.getElementById('panel-right'), {
    paletteKey: 'palette1',
    logoId: 'logo2',
    bgColor: '#f7f3e7',
    logoColor: '#18233f',
  });

  createVotesSection({
    colorControlRoot: document.getElementById('votes-color-control'),
    gridRoot: document.getElementById('votes-grid'),
    submissionRoot: document.getElementById('submission-bar-root'),
  });
});
```

- [ ] **Step 4: Delete the obsolete files and their tests**

```bash
git rm js/feedback-form.js js/identity-modal.js tests/feedback-form.test.js tests/votes-section.test.js
```

- [ ] **Step 5: Remove obsolete CSS**

In `css/dev-immersive.css`, delete the rules that target now-absent markup: any selector containing `.ranking-card`, `.ranking-preview`, `.ranking-grid`, `.ranking-header` (the old header rule may be kept only if it still matches the new `.ranking-header` markup — the new markup DOES still use `.ranking-header`, so keep `.ranking-header` rules and delete only `.ranking-card`/`.ranking-grid`/`.ranking-preview`), `.rank-picker`, `.rank-picker__trigger`, `.rank-picker__menu`, `.rank-picker__option`, `.rank-field`, `#feedback-form`, `.primary-action`, `.form-status`.

In `css/style.css`, delete the base rules for `.ranking-grid`, `.rank-picker`, `.rank-picker__trigger`, `.rank-picker__menu`, `.rank-picker__option`, `.rank-field`, `#feedback-form`, `.form-status`, `.primary-action`, `.ranking-card`, `.ranking-preview` if present. Keep `.preview-box`, `.palette-stack*`, `.vote-palette*`, `.ranking-header`, `.eyebrow`, and everything used by the comparator/new markup.

Use grep to find each before deleting, e.g. `grep -n "rank-picker\|ranking-card\|ranking-grid\|feedback-form\|primary-action\|\.form-status\|rank-field\|ranking-preview" css/style.css css/dev-immersive.css`, and remove each matching rule block. Do NOT remove `.ranking-list`/`.ranking-row*`/`.submission-bar*` (added in Tasks 4–5) or `.ranking-header`.

- [ ] **Step 6: Update the CSS tests**

In `tests/dev-immersive-css.test.js`, delete the assertions that reference removed markup:
- the `assert.match(css, /\.dev-immersive\s+\.ranking-card/);`
- the `assert.match(css, /\.dev-immersive\s+#feedback-form/);`
- the `.ranking-grid ... grid-template-columns: repeat(3, ...)` assertion
- the four `.rank-picker*` assertions

In `tests/css-layout.test.js`, delete/replace:
- `test('...')` block using `cssBlock('.ranking-grid')` — remove it.
- `test('feedback form spans the full content width', ...)` using `cssBlockContaining('#feedback-form', 'display: grid')` — remove it.

Keep all other assertions in both files.

- [ ] **Step 7: Verify**

Run: `node --check js/votes-section.js js/main.js` → valid.
Run: `npm test` → all pass (the deleted tests are gone; the CSS tests no longer assert removed rules).
Manual browser check (start `npm run dev`, open `http://localhost:3000`), using a real browser:
- Vote section shows palette cards with **none active**; the ranking is a vertical list of 7 rows, each with a grip handle, rank number, logo, name.
- No submission bar visible initially.
- Clicking a palette card activates it AND the bar slides up from the bottom (rounded top corners), showing that palette + the current order; Send is enabled.
- Dragging a row by its handle reorders the list (mouse); on a touch device / emulated touch, dragging also works; rank numbers renumber; the bar's order summary updates.
- Before choosing a palette, dragging a row makes the bar appear with Send **disabled** and the "Choisissez une palette" hint; choosing a palette enables Send.
- Entering a prénom + optional message and clicking Send shows "Merci … c'est envoyé ✓"; reloading keeps identity and pre-fills the previous palette + order (bar shown).
Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: drag-and-drop ranking with bottom-sheet submission; remove feedback form and identity modal"
```

---

### Task 7: Admin shows each voter's message; remove the Messages section

**Files:**
- Modify: `js/admin.js`
- Modify: `admin.html`
- Test: `tests/admin-render.test.js` (update)

**Interfaces:**
- Consumes: `votesData.voters[].message` (added in Task 2).
- Produces: `renderVotes` shows each voter's message when present; `renderMessages`/`fetchMessages`/`/api/messages` usage removed; `showDashboard` fetches only votes.

- [ ] **Step 1: Update the failing test**

In `tests/admin-render.test.js`, find the test(s) exercising `renderVotes` with voters. Add/extend a test so that a voter with a `message` renders it. Add this test (it uses the same jsdom/document setup the file already establishes — mirror the existing `renderVotes` test's setup for the `#votes-summary` container):

```js
test('renderVotes shows a voter message when present', () => {
  document.body.innerHTML = '<div id="votes-summary"></div>';
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
  assert.match(document.getElementById('votes-summary').textContent, /J'adore le logo 3/);
});
```

If `tests/admin-render.test.js` currently imports and tests `renderMessages`, delete those `renderMessages` tests (that function is being removed).

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/admin-render.test.js`
Expected: FAIL — the message is not rendered yet (and, if `renderMessages` tests were removed, those imports must be cleaned up so the file still loads).

- [ ] **Step 3: Update `js/admin.js`**

In `renderVotes`, inside the `for (const voter of votesData.voters || [])` loop, after appending `voterRanking` to `voterCard`, add message rendering:

```js
    if (voter.message) {
      const message = document.createElement('p');
      message.className = 'admin-voter-card__message';
      message.textContent = voter.message;
      voterCard.appendChild(message);
    }
```

Remove the `renderMessages` function entirely. Remove the `fetchMessages` function. In `showDashboard`, replace the body so it no longer fetches or renders messages:

```js
async function showDashboard(token) {
  let votesData;
  try {
    const response = await fetch('/api/votes', { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      document.getElementById('login-section').hidden = false;
      document.getElementById('dashboard-section').hidden = true;
      document.getElementById('login-status').textContent = 'Session expirée, reconnectez-vous.';
      return;
    }
    votesData = await response.json();
  } catch (error) {
    document.getElementById('login-section').hidden = false;
    document.getElementById('dashboard-section').hidden = true;
    document.getElementById('login-status').textContent = 'Erreur réseau, réessayez.';
    return;
  }

  document.getElementById('login-section').hidden = true;
  document.getElementById('dashboard-section').hidden = false;
  renderVotes(votesData);
}
```

(The previous `fetchVotes` helper returned `response.json()` without a 401 guard; the votes endpoint returns aggregate data without `voters` for a non-admin token, but a stale token still returns 200 there — so the 401 session-expiry guard now lives on the direct fetch above. Keep the existing `fetchVotes` only if other code uses it; otherwise remove it.)

- [ ] **Step 4: Update `admin.html`**

Remove the Messages block from the dashboard section:

```html
      <h2>Messages</h2>
      <ul id="messages-list"></ul>
```

- [ ] **Step 5: Add a style for the voter message (optional, keeps it legible)**

In `css/admin.css`, append:

```css
.admin-voter-card__message {
  margin: 0.4rem 0 0;
  font-style: italic;
  color: var(--muted, #63645f);
}
```

- [ ] **Step 6: Verify**

Run: `node --test tests/admin-render.test.js` → PASS.
Run: `npm test` → all pass.
Manual check: start `npm run dev` with `ADMIN_PASSWORD` set, submit a vote with a message from the main page, open `/admin.html`, log in, confirm the voter card shows the message and there is no "Messages" section. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add js/admin.js admin.html css/admin.css tests/admin-render.test.js
git commit -m "feat: show voter messages in admin, remove separate Messages section"
```

---

### Task 8: Remove the now-unused message endpoints

**Files:**
- Delete: `api/message.js`, `api/messages.js`, `tests/api-message.test.js`, `tests/api-messages.test.js`
- Modify: `dev-server.js`

**Interfaces:**
- None consumed by the rest of the app anymore (Task 6 removed the on-page form; Task 7 removed the admin usage).

- [ ] **Step 1: Delete the endpoint files and their tests**

```bash
git rm api/message.js api/messages.js tests/api-message.test.js tests/api-messages.test.js
```

- [ ] **Step 2: Update `dev-server.js`**

Remove the two imports:

```js
import { createMessageHandler } from './api/message.js';
import { createMessagesHandler } from './api/messages.js';
```

Remove the two route entries from the `routes` object:

```js
  '/api/message': createMessageHandler(kv),
  '/api/messages': createMessagesHandler(kv, getAdminPassword),
```

- [ ] **Step 3: Verify**

Run: `node --check dev-server.js` → valid.
Run: `npm test` → all pass (the deleted tests are gone; nothing imports the removed modules).
Manual smoke: start `npm run dev`; `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/messages` → `404`; the main page vote flow and `/admin.html` still work. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused message endpoints after folding message into vote"
```
