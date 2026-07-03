import { orderToRanking } from './ranking-order.js';
import { getIdentity, ensureIdentityId, setName } from './identity.js';

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
      <span class="submission-bar__edge-label">Votre vote</span>
    </button>
    <div class="submission-bar__inner">
      <header class="submission-bar__header">
        <p class="submission-bar__eyebrow">Vote</p>
        <h3 class="submission-bar__title">Vos préférences</h3>
      </header>
      <div class="submission-bar__body">
        <section class="submission-bar__block">
          <p class="submission-bar__label">Palette préférée</p>
          <div data-role="palette-slot"></div>
        </section>
        <section class="submission-bar__block">
          <p class="submission-bar__label">Classement <span class="submission-bar__label-hint">— glissez pour classer</span></p>
          <div data-role="ranking-slot"></div>
        </section>
      </div>
      <footer class="submission-bar__footer">
        <label class="submission-bar__field">
          <span>Votre prénom</span>
          <input type="text" class="submission-bar__input" data-role="name" placeholder="Prénom" autocomplete="given-name" />
        </label>
        <label class="submission-bar__field">
          <span>Un message (optionnel)</span>
          <textarea class="submission-bar__input submission-bar__textarea" data-role="message" rows="2" placeholder="Vos impressions, remarques…"></textarea>
        </label>
        <button type="button" class="submission-bar__send" data-role="send">${SEND_ICON}<span>Envoyer</span></button>
        <p class="submission-bar__hint" data-role="hint" hidden>Choisissez une palette pour envoyer.</p>
        <p class="submission-bar__status" data-role="status" role="status"></p>
      </footer>
    </div>
  `;

  const toggleButton = root.querySelector('[data-role="toggle"]');
  const paletteSlot = root.querySelector('[data-role="palette-slot"]');
  const rankingSlot = root.querySelector('[data-role="ranking-slot"]');
  const nameInput = root.querySelector('[data-role="name"]');
  const messageInput = root.querySelector('[data-role="message"]');
  const sendButton = root.querySelector('[data-role="send"]');
  const hintEl = root.querySelector('[data-role="hint"]');
  const statusEl = root.querySelector('[data-role="status"]');

  const existing = getIdentity();
  if (existing.name) nameInput.value = existing.name;

  function setCollapsed(collapsed) {
    root.classList.toggle('is-collapsed', collapsed);
    document.body.classList.toggle('panel-docked', collapsed);
    toggleButton.setAttribute('aria-expanded', String(!collapsed));
    toggleButton.setAttribute('aria-label', collapsed ? 'Ouvrir le panneau' : 'Réduire le panneau');
  }

  // On small screens the panel starts docked so the gallery stays visible.
  if (globalThis.matchMedia?.('(max-width: 900px)').matches) {
    setCollapsed(true);
  }

  function renderSendState() {
    sendButton.disabled = !paletteKey;
    sendButton.title = paletteKey ? '' : 'Choisissez une palette pour envoyer';
    hintEl.hidden = Boolean(paletteKey);
  }

  toggleButton.addEventListener('click', () => {
    setCollapsed(!root.classList.contains('is-collapsed'));
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

  renderSendState();

  return {
    paletteSlot,
    rankingSlot,
    show() {
      root.classList.add('is-visible');
      root.setAttribute('aria-hidden', 'false');
    },
    update(state) {
      if ('paletteKey' in state) paletteKey = state.paletteKey;
      if ('order' in state) order = [...state.order];
      renderSendState();
    },
  };
}
