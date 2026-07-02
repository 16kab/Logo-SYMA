import { LOGOS } from './logos.js';
import { PALETTES, PALETTE_KEYS } from './palettes.js';
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

export function getRankChoices() {
  return LOGOS.map((_, index) => index + 1);
}

export function withRankSelection(ranking, logoId, selectedRank) {
  const nextRanking = { ...ranking };
  const previousRank = nextRanking[logoId] || '';
  const rank = selectedRank ? String(selectedRank) : '';
  const displacedLogo = LOGOS.find((logo) => logo.id !== logoId && nextRanking[logo.id] === rank);

  nextRanking[logoId] = rank;
  if (displacedLogo) {
    nextRanking[displacedLogo.id] = previousRank;
  }

  return nextRanking;
}

export function createVotesSection({ colorControlRoot, gridRoot, identityModal }) {
  let paletteKey = PALETTE_KEYS[0];
  let ranking = createEmptyRanking();
  let statusEl = null;
  let submitButton = null;
  let rankPickerEventsBound = false;

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
      });
      grid.appendChild(button);
    }
  }

  function renderRankMenu(menuEl, logoId) {
    const currentRank = ranking[logoId] || '';
    menuEl.innerHTML = '';

    for (const rank of getRankChoices()) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'rank-picker__option';
      option.classList.toggle('is-active', String(rank) === currentRank);
      option.dataset.rank = String(rank);
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(String(rank) === currentRank));
      option.textContent = `Rang ${rank}`;
      menuEl.appendChild(option);
    }
  }

  function closeRankPickers(exceptPicker = null) {
    for (const picker of gridRoot.querySelectorAll('[data-role="rank-picker"]')) {
      if (picker === exceptPicker) continue;
      const trigger = picker.querySelector('[data-role="rank-trigger"]');
      const menu = picker.querySelector('[data-role="rank-menu"]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
    }
  }

  function updateRankPickers() {
    for (const picker of gridRoot.querySelectorAll('[data-role="rank-picker"]')) {
      const logoId = picker.dataset.logoId;
      const rank = ranking[logoId] || '';
      const label = picker.querySelector('[data-role="rank-label"]');
      const trigger = picker.querySelector('[data-role="rank-trigger"]');
      const menu = picker.querySelector('[data-role="rank-menu"]');

      if (label) label.textContent = rank ? `Rang ${rank}` : 'Rang';
      if (trigger) trigger.classList.toggle('is-selected', Boolean(rank));
      if (menu) renderRankMenu(menu, logoId);
    }
  }

  function bindRankPickerEvents() {
    if (rankPickerEventsBound) return;

    gridRoot.addEventListener('click', (event) => {
      const trigger = event.target.closest?.('[data-role="rank-trigger"]');
      const option = event.target.closest?.('[data-rank]');

      if (trigger) {
        const picker = trigger.closest('[data-role="rank-picker"]');
        const menu = picker.querySelector('[data-role="rank-menu"]');
        const isOpen = !menu.hidden;

        closeRankPickers(isOpen ? null : picker);
        menu.hidden = isOpen;
        trigger.setAttribute('aria-expanded', String(!isOpen));
        if (!isOpen) renderRankMenu(menu, picker.dataset.logoId);
        return;
      }

      if (option) {
        const picker = option.closest('[data-role="rank-picker"]');
        ranking = withRankSelection(ranking, picker.dataset.logoId, option.dataset.rank);
        statusEl.textContent = '';
        closeRankPickers();
        updateRankPickers();
        return;
      }

      if (!event.target.closest?.('[data-role="rank-picker"]')) {
        closeRankPickers();
      }
    });

    gridRoot.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeRankPickers();
    });

    rankPickerEventsBound = true;
  }

  async function renderRankingGrid() {
    gridRoot.innerHTML = `
      <div class="ranking-header">
        <h2>Classez les logos</h2>
        <p>1 = préféré, ${LOGOS.length} = moins préféré.</p>
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
        <div class="rank-field">
          <span>${logo.name}</span>
          <div class="rank-picker" data-role="rank-picker" data-logo-id="${logo.id}">
            <button
              type="button"
              class="rank-picker__trigger"
              data-role="rank-trigger"
              aria-haspopup="listbox"
              aria-expanded="false"
            >
              <span data-role="rank-label">Rang</span>
            </button>
            <div class="rank-picker__menu" data-role="rank-menu" role="listbox" hidden></div>
          </div>
        </div>
      `;
      list.appendChild(card);

      const previewEl = card.querySelector('[data-role="preview"]');
      previewEl.style.backgroundColor = '#ffffff';
      const svg = await loadInlineSvg(logo.src, previewEl);
      recolorSvg(svg, '#000000');
    }

    bindRankPickerEvents();
    updateRankPickers();
    submitButton.addEventListener('click', submitVote);
  }

  async function submitVote() {
    if (!hasCompleteRanking(ranking)) {
      statusEl.textContent = `Merci de classer les ${LOGOS.length} logos avec un rang unique de 1 à ${LOGOS.length}.`;
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
