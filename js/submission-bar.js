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
    sendButton.disabled = !paletteKey;
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
