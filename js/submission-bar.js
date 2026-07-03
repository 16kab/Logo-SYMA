import { LOGOS } from './logos.js';
import { PALETTES } from './palettes.js';
import { orderToRanking } from './ranking-order.js';
import { getIdentity, ensureIdentityId, setName } from './identity.js';

const LOGO_BY_ID = Object.fromEntries(LOGOS.map((logo) => [logo.id, logo]));

const CHEVRON_ICON = `<svg class="submission-bar__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;

const SEND_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`;

export function createSubmissionBar(root, { onSubmit } = {}) {
  let paletteKey = null;
  let order = [];

  root.className = 'submission-bar';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <button type="button" class="submission-bar__edge" data-role="toggle" aria-expanded="true" aria-label="Réduire le panneau">
      ${CHEVRON_ICON}
      <span class="submission-bar__edge-label">Votre sélection</span>
    </button>
    <div class="submission-bar__inner">
      <header class="submission-bar__header">
        <p class="submission-bar__eyebrow">Vote</p>
        <h3 class="submission-bar__title">Votre sélection</h3>
      </header>
      <div class="submission-bar__body">
        <section class="submission-bar__block">
          <p class="submission-bar__label">Palette</p>
          <div class="submission-bar__palette" data-role="palette"></div>
        </section>
        <section class="submission-bar__block">
          <p class="submission-bar__label">Classement</p>
          <ol class="submission-bar__order" data-role="order"></ol>
        </section>
      </div>
      <footer class="submission-bar__footer">
        <label class="submission-bar__field">
          <span>Votre prénom</span>
          <input type="text" class="submission-bar__input" data-role="name" placeholder="Prénom" autocomplete="given-name" />
        </label>
        <label class="submission-bar__field">
          <span>Un message (optionnel)</span>
          <textarea class="submission-bar__input submission-bar__textarea" data-role="message" rows="3" placeholder="Vos impressions, remarques…"></textarea>
        </label>
        <button type="button" class="submission-bar__send" data-role="send">${SEND_ICON}<span>Envoyer</span></button>
        <p class="submission-bar__hint" data-role="hint" hidden>Choisissez une palette pour envoyer.</p>
        <p class="submission-bar__status" data-role="status" role="status"></p>
      </footer>
    </div>
  `;

  const toggleButton = root.querySelector('[data-role="toggle"]');
  const paletteEl = root.querySelector('[data-role="palette"]');
  const orderEl = root.querySelector('[data-role="order"]');
  const nameInput = root.querySelector('[data-role="name"]');
  const messageInput = root.querySelector('[data-role="message"]');
  const sendButton = root.querySelector('[data-role="send"]');
  const hintEl = root.querySelector('[data-role="hint"]');
  const statusEl = root.querySelector('[data-role="status"]');

  const existing = getIdentity();
  if (existing.name) nameInput.value = existing.name;

  function renderPalette() {
    paletteEl.innerHTML = '';
    paletteEl.classList.toggle('submission-bar__palette--empty', !paletteKey);

    if (!paletteKey) {
      paletteEl.textContent = 'Aucune palette choisie pour l’instant';
      return;
    }

    const swatches = document.createElement('span');
    swatches.className = 'submission-bar__swatches';
    swatches.setAttribute('aria-hidden', 'true');
    for (const color of PALETTES[paletteKey].colors) {
      const swatch = document.createElement('span');
      swatch.className = 'submission-bar__swatch';
      swatch.style.backgroundColor = color;
      swatches.appendChild(swatch);
    }

    const name = document.createElement('span');
    name.className = 'submission-bar__palette-name';
    name.textContent = PALETTES[paletteKey].label;

    paletteEl.append(swatches, name);
  }

  function renderOrder() {
    orderEl.innerHTML = '';
    order.forEach((id, index) => {
      const logo = LOGO_BY_ID[id];
      const item = document.createElement('li');
      item.className = 'submission-bar__order-item';

      const rank = document.createElement('span');
      rank.className = 'submission-bar__rank';
      rank.textContent = String(index + 1);

      const image = document.createElement('img');
      image.className = 'submission-bar__order-logo';
      image.src = logo.src;
      image.alt = '';
      image.loading = 'lazy';

      const name = document.createElement('span');
      name.className = 'submission-bar__order-name';
      name.textContent = logo.name;

      item.append(rank, image, name);
      orderEl.appendChild(item);
    });
  }

  function renderSummary() {
    renderPalette();
    renderOrder();
    sendButton.disabled = !paletteKey;
    sendButton.title = paletteKey ? '' : 'Choisissez une palette pour envoyer';
    hintEl.hidden = Boolean(paletteKey);
  }

  toggleButton.addEventListener('click', () => {
    const collapsed = root.classList.toggle('is-collapsed');
    toggleButton.setAttribute('aria-expanded', String(!collapsed));
    toggleButton.setAttribute('aria-label', collapsed ? 'Ouvrir le panneau' : 'Réduire le panneau');
  });

  sendButton.addEventListener('click', async () => {
    if (!paletteKey) return;
    const name = nameInput.value.trim();
    if (name) setName(name);
    const id = ensureIdentityId();

    sendButton.disabled = true;
    statusEl.textContent = '';
    statusEl.classList.remove('is-error');
    const ok = await onSubmit?.({
      paletteKey,
      ranking: orderToRanking(order),
      message: messageInput.value,
      name,
      visitorId: id,
    });
    sendButton.disabled = !paletteKey;
    statusEl.classList.toggle('is-error', !ok);
    statusEl.textContent = ok
      ? (name ? `Merci ${name}, c'est envoyé ✓` : "Merci, c'est envoyé ✓")
      : 'Une erreur est survenue, réessayez.';
  });

  renderSummary();

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
