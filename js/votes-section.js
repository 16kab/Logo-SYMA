import { LOGOS } from './logos.js';
import { PALETTES, PALETTE_KEYS } from './palettes.js';
import { renderPaletteTabs } from './palette-controls.js';
import { loadInlineSvg, recolorSvg } from './svg-loader.js';
import { getIdentity } from './identity.js';

export function createEmptyRanking() {
  return Object.fromEntries(LOGOS.map((logo) => [logo.id, '']));
}

export function hasCompleteRanking(ranking) {
  const ranks = LOGOS.map((logo) => Number(ranking[logo.id]));
  return ranks.every((rank) => Number.isInteger(rank) && rank >= 1 && rank <= LOGOS.length)
    && new Set(ranks).size === LOGOS.length;
}

export function normalizeRanking(ranking) {
  return Object.fromEntries(LOGOS.map((logo) => [logo.id, Number(ranking[logo.id])]));
}

export function createVotesSection({ colorControlRoot, gridRoot, identityModal }) {
  let paletteKey = PALETTE_KEYS[0];
  let ranking = createEmptyRanking();
  let statusEl = null;
  let submitButton = null;

  function renderPalettePreview(container) {
    container.innerHTML = '';
    for (const color of PALETTES[paletteKey].colors) {
      const swatch = document.createElement('span');
      swatch.className = 'palette-preview__swatch';
      swatch.style.backgroundColor = color;
      swatch.setAttribute('aria-label', color);
      container.appendChild(swatch);
    }
  }

  function renderPaletteChoice() {
    colorControlRoot.innerHTML = `
      <div class="vote-step">
        <p class="eyebrow">Vote</p>
        <h2>Choisissez votre palette préférée</h2>
        <div class="palette-tabs" data-role="palette-tabs"></div>
        <div class="palette-preview" data-role="palette-preview" aria-label="Couleurs de la palette sélectionnée"></div>
      </div>
    `;

    renderPaletteTabs(
      colorControlRoot.querySelector('[data-role="palette-tabs"]'),
      paletteKey,
      (key) => {
        paletteKey = key;
        renderPaletteChoice();
      }
    );
    renderPalettePreview(colorControlRoot.querySelector('[data-role="palette-preview"]'));
  }

  function updateRankOptionAvailability() {
    const selects = [...gridRoot.querySelectorAll('[data-role="rank"]')];
    const usedRanks = new Set(selects.map((select) => select.value).filter(Boolean));

    for (const select of selects) {
      for (const option of select.options) {
        option.disabled = Boolean(option.value) && usedRanks.has(option.value) && select.value !== option.value;
      }
    }
  }

  async function renderRankingGrid() {
    gridRoot.innerHTML = `
      <div class="ranking-header">
        <h2>Classez les logos</h2>
        <p>1 = préféré, 5 = moins préféré.</p>
      </div>
      <div class="ranking-grid" data-role="ranking-grid"></div>
      <p class="form-status" data-role="status" role="status"></p>
      <button type="button" class="primary-action" data-role="submit">Envoyer mon classement</button>
    `;
    statusEl = gridRoot.querySelector('[data-role="status"]');
    submitButton = gridRoot.querySelector('[data-role="submit"]');

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

    for (const select of gridRoot.querySelectorAll('[data-role="rank"]')) {
      select.value = ranking[select.dataset.logoId] || '';
      select.addEventListener('change', () => {
        ranking = { ...ranking, [select.dataset.logoId]: select.value };
        statusEl.textContent = '';
        updateRankOptionAvailability();
      });
    }

    updateRankOptionAvailability();
    submitButton.addEventListener('click', submitVote);
  }

  async function submitVote() {
    if (!hasCompleteRanking(ranking)) {
      statusEl.textContent = 'Merci de classer les cinq logos avec un rang unique de 1 à 5.';
      return;
    }

    submitButton.disabled = true;
    statusEl.textContent = '';

    try {
      const identity = await identityModal.requireIdentity();
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId: identity.id,
          name: identity.name,
          paletteKey,
          ranking: normalizeRanking(ranking),
        }),
      });

      statusEl.textContent = response.ok
        ? 'Merci, votre vote a bien été enregistré.'
        : 'Une erreur est survenue, réessayez.';
    } catch (error) {
      console.error(error);
      statusEl.textContent = 'Une erreur est survenue, réessayez.';
    } finally {
      submitButton.disabled = false;
    }
  }

  async function hydrateExistingVote() {
    const { id } = getIdentity();
    if (!id) return;

    try {
      const response = await fetch(`/api/votes?visitorId=${encodeURIComponent(id)}`);
      if (!response.ok) return;
      const data = await response.json();
      if (!data.myVote) return;

      paletteKey = data.myVote.paletteKey || paletteKey;
      ranking = Object.fromEntries(LOGOS.map((logo) => [
        logo.id,
        data.myVote.ranking?.[logo.id] ? String(data.myVote.ranking[logo.id]) : '',
      ]));
      renderPaletteChoice();
      await renderRankingGrid();
    } catch (error) {
      console.error(error);
    }
  }

  async function initialize() {
    renderPaletteChoice();
    await renderRankingGrid();
    await hydrateExistingVote();
  }

  initialize();
}
