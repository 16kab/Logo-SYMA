import { PALETTES, PALETTE_KEYS } from './palettes.js';
import { createRankingList } from './ranking-list.js';
import { createSubmissionBar } from './submission-bar.js';
import { defaultOrder } from './ranking-order.js';
import { getIdentity } from './identity.js';

export function createVotesSection({ submissionRoot }) {
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
    bar.paletteSlot.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'vote-palette-grid';

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
        bar.update({ paletteKey, order });
      });
      grid.appendChild(button);
    }

    bar.paletteSlot.appendChild(grid);
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
        bar.update({ paletteKey, order });
      })
      .catch((error) => console.error(error));
  }

  function initialize() {
    bar = createSubmissionBar(submissionRoot, { onSubmit: submitVote });
    renderPaletteChoice();
    rankingList = createRankingList(bar.rankingSlot, {
      order,
      onChange: (nextOrder) => {
        order = nextOrder;
        bar.update({ paletteKey, order });
      },
    });
    bar.update({ paletteKey, order });
    bar.show();
    hydrateExistingVote();
  }

  initialize();
}
