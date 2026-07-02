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
