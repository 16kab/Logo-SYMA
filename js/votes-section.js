import { LOGOS } from './logos.js';
import { initialState, withPaletteChange, withBgColor, withLogoColor } from './comparator-state.js';
import { renderPaletteTabs, renderSwatches } from './palette-controls.js';
import { loadInlineSvg, recolorSvg } from './svg-loader.js';
import { ensureIdentity, getIdentity } from './identity.js';

export function createVotesSection({ colorControlRoot, gridRoot }) {
  let colorState = initialState('palette1', LOGOS[0].id);
  colorState = withBgColor(colorState, '#18233f');
  colorState = withLogoColor(colorState, '#ffffff');
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
    try {
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
    } catch (error) {
      console.error(error);
    }
  }

  function updateButtonStates() {
    for (const [logoId, card] of cards.entries()) {
      const active = myVotes[logoId];
      card.upButton.classList.toggle('is-active', active === 'up');
      card.downButton.classList.toggle('is-active', active === 'down');
    }
  }

  async function refreshCounts() {
    try {
      const { id } = getIdentity();
      const url = id ? `/api/votes?visitorId=${encodeURIComponent(id)}` : '/api/votes';
      const response = await fetch(url);
      const data = await response.json();
      for (const [logoId, card] of cards.entries()) {
        const counts = data[logoId] || { up: 0, down: 0 };
        card.countsEl.textContent = `👍 ${counts.up} · 👎 ${counts.down}`;
        if (id && 'myVote' in counts) {
          myVotes[logoId] = counts.myVote || undefined;
        }
      }
    } catch (error) {
      console.error(error);
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

    await refreshCounts();
    updateButtonStates();
  }

  renderColorControl();
  renderGrid();
}
