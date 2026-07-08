import { ICONOGRAPHY_ITEMS } from './iconography-items.js';
import { loadInlineSvg, recolorSvg } from './svg-loader.js';

const ICON_COLOR = '#18233f';
const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

function clear(element) {
  element.innerHTML = '';
}

function normalizeState(iconography) {
  return {
    items: { ...(iconography?.items || {}) },
    requests: Array.isArray(iconography?.requests) ? [...iconography.requests] : [],
  };
}

function createText(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function createButton(label, className, { action = '', icon = '' } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  if (action) button.setAttribute('data-action', action);
  if (icon) button.innerHTML = icon;
  else button.textContent = label;
  return button;
}

export function createIconographySection({
  root,
  fetcher = globalThis.fetch,
  loadSvg = loadInlineSvg,
  recolor = recolorSvg,
} = {}) {
  let state = normalizeState();
  let modal = null;
  let activeFeedbackItemId = null;

  function setStatus(message, isError = false) {
    const status = root.querySelector('[data-role="iconography-status"]');
    if (!status) return;
    status.textContent = message;
    status.className = isError ? 'iconography-section__status is-error' : 'iconography-section__status';
    status.setAttribute('role', isError ? 'alert' : 'status');
  }

  async function load() {
    try {
      const response = await fetcher('/api/iconography');
      if (response?.ok) {
        const data = await response.json();
        state = normalizeState(data.iconography);
      }
    } catch (error) {
      state = normalizeState();
    }

    await render();
  }

  async function postAction(payload) {
    let response;
    try {
      response = await fetcher('/api/iconography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      response = null;
    }

    if (!response?.ok) {
      setStatus("La modification n'a pas pu être enregistrée.", true);
      return false;
    }

    const data = await response.json();
    state = normalizeState(data.iconography);
    await render();
    return true;
  }

  function ensureModal() {
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'iconography-feedback-modal';
    modal.hidden = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'iconography-feedback-modal__backdrop';
    backdrop.setAttribute('data-role', 'close-feedback');

    const dialog = document.createElement('section');
    dialog.className = 'iconography-feedback-modal__dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'iconography-feedback-title');

    const header = document.createElement('div');
    header.className = 'iconography-feedback-modal__header';
    const titleBlock = document.createElement('div');
    titleBlock.appendChild(createText('p', 'eyebrow', 'Iconographie'));
    const title = createText('h2', '', 'Retour iconographie');
    title.id = 'iconography-feedback-title';
    titleBlock.appendChild(title);
    const close = createButton('Fermer', 'iconography-feedback-modal__close');
    close.setAttribute('data-role', 'close-feedback');
    close.textContent = 'x';
    header.appendChild(titleBlock);
    header.appendChild(close);

    const body = document.createElement('div');
    body.className = 'iconography-feedback-modal__body';
    const label = document.createElement('label');
    label.className = 'iconography-feedback-modal__field';
    label.textContent = 'Retour';
    const textarea = document.createElement('textarea');
    textarea.className = 'iconography-feedback-modal__input';
    textarea.setAttribute('data-role', 'feedback');
    textarea.rows = 6;
    label.appendChild(textarea);
    const status = createText('p', 'iconography-feedback-modal__status', '');
    status.setAttribute('data-role', 'feedback-status');
    status.setAttribute('role', 'status');
    body.appendChild(label);
    body.appendChild(status);

    const footer = document.createElement('div');
    footer.className = 'iconography-feedback-modal__footer';
    const cancel = createButton('Annuler', 'iconography-feedback-modal__secondary');
    cancel.setAttribute('data-role', 'close-feedback');
    const submit = createButton('Enregistrer', 'iconography-feedback-modal__primary');
    submit.setAttribute('data-role', 'submit-feedback');
    submit.addEventListener('click', submitFeedback);
    footer.appendChild(cancel);
    footer.appendChild(submit);

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    modal.appendChild(backdrop);
    modal.appendChild(dialog);

    modal.querySelectorAll('[data-role="close-feedback"]').forEach((button) => {
      button.addEventListener('click', closeFeedbackModal);
    });

    document.body.appendChild(modal);
    return modal;
  }

  function openFeedbackModal(itemId) {
    const modalEl = ensureModal();
    const textarea = modalEl.querySelector('[data-role="feedback"]');
    const status = modalEl.querySelector('[data-role="feedback-status"]');
    activeFeedbackItemId = itemId;
    textarea.value = state.items[itemId]?.feedback || '';
    status.textContent = '';
    status.setAttribute('role', 'status');
    modalEl.hidden = false;
  }

  function closeFeedbackModal() {
    if (modal) modal.hidden = true;
  }

  async function submitFeedback() {
    const modalEl = ensureModal();
    const textarea = modalEl.querySelector('[data-role="feedback"]');
    const status = modalEl.querySelector('[data-role="feedback-status"]');
    const feedback = textarea.value;

    if (!feedback.trim()) {
      status.setAttribute('role', 'alert');
      status.textContent = "Ajoutez un retour avant d'enregistrer.";
      return;
    }

    const saved = await postAction({ action: 'reject', itemId: activeFeedbackItemId, feedback });
    if (saved) closeFeedbackModal();
  }

  async function renderCard(item) {
    const itemState = state.items[item.id] || null;
    const card = document.createElement('article');
    card.className = 'iconography-card';
    if (itemState?.status === 'approved') card.classList.add('is-approved');
    if (itemState?.status === 'rejected') card.classList.add('is-rejected');

    const title = createText('h3', 'iconography-card__title', item.title);
    const visual = document.createElement('div');
    visual.className = 'iconography-card__visual';
    const decision = document.createElement('div');
    decision.className = 'iconography-card__decision';

    card.appendChild(title);
    card.appendChild(visual);
    card.appendChild(decision);

    const svg = await loadSvg(item.src, visual);
    recolor(svg, ICON_COLOR);

    if (itemState?.status === 'approved') {
      decision.appendChild(createText('p', 'iconography-card__state', 'Validé'));
      const reset = createButton('Modifier', 'iconography-card__secondary', { action: 'reset' });
      reset.addEventListener('click', () => postAction({ action: 'reset', itemId: item.id }));
      decision.appendChild(reset);
      return card;
    }

    if (itemState?.status === 'rejected') {
      decision.appendChild(createText('p', 'iconography-card__state', 'Retour demandé'));
      const view = createButton('Voir le retour', 'iconography-card__feedback', { action: 'view-feedback' });
      view.addEventListener('click', () => openFeedbackModal(item.id));
      const reset = createButton('Modifier', 'iconography-card__secondary', { action: 'reset' });
      reset.addEventListener('click', () => postAction({ action: 'reset', itemId: item.id }));
      decision.appendChild(view);
      decision.appendChild(reset);
      return card;
    }

    const actions = document.createElement('div');
    actions.className = 'iconography-card__actions';
    const approve = createButton('Valider', 'iconography-card__icon-action iconography-card__icon-action--approve', {
      action: 'approve',
      icon: CHECK_ICON,
    });
    const reject = createButton('Refuser', 'iconography-card__icon-action iconography-card__icon-action--reject', {
      action: 'reject',
      icon: X_ICON,
    });
    approve.addEventListener('click', () => postAction({ action: 'approve', itemId: item.id }));
    reject.addEventListener('click', () => openFeedbackModal(item.id));
    actions.appendChild(approve);
    actions.appendChild(reject);
    decision.appendChild(actions);
    return card;
  }

  function renderRequestForm(section) {
    const form = document.createElement('div');
    form.className = 'iconography-add-request';
    const label = document.createElement('label');
    label.className = 'iconography-add-request__field';
    label.textContent = 'Ajouter une demande';
    const input = document.createElement('input');
    input.className = 'iconography-add-request__input';
    input.setAttribute('data-role', 'request-title');
    input.placeholder = "Titre de l'iconographie souhaitée";
    label.appendChild(input);
    const button = createButton('Ajouter', 'iconography-add-request__button');
    button.setAttribute('data-role', 'add-request');
    button.addEventListener('click', async () => {
      const title = input.value;
      if (!title.trim()) {
        setStatus("Ajoutez un titre avant d'enregistrer.", true);
        return;
      }
      const saved = await postAction({ action: 'addRequest', title });
      if (saved) input.value = '';
    });

    form.appendChild(label);
    form.appendChild(button);
    section.appendChild(form);
  }

  function renderRequests(section) {
    if (!state.requests.length) return;

    const requests = document.createElement('section');
    requests.className = 'iconography-requests';
    requests.appendChild(createText('h3', 'iconography-requests__title', 'Demandes ajoutées'));

    const list = document.createElement('div');
    list.className = 'iconography-requests__list';
    for (const request of state.requests) {
      const card = document.createElement('article');
      card.className = 'iconography-request-card';
      card.appendChild(createText('p', 'iconography-request-card__title', request.title));
      list.appendChild(card);
    }

    requests.appendChild(list);
    section.appendChild(requests);
  }

  async function render() {
    clear(root);

    const section = document.createElement('section');
    section.className = 'iconography-section';
    section.setAttribute('aria-labelledby', 'iconography-title');

    const header = document.createElement('div');
    header.className = 'iconography-section__header';
    const titleBlock = document.createElement('div');
    titleBlock.appendChild(createText('p', 'eyebrow', 'Iconographie'));
    const title = createText('h2', '', 'Sélection iconographique');
    title.id = 'iconography-title';
    const intro = createText('p', 'iconography-section__lede', 'Validez les pistes, refusez-les avec un retour, ou ajoutez une demande libre.');
    titleBlock.appendChild(title);
    titleBlock.appendChild(intro);
    header.appendChild(titleBlock);
    section.appendChild(header);

    renderRequestForm(section);

    const status = createText('p', 'iconography-section__status', '');
    status.setAttribute('data-role', 'iconography-status');
    status.setAttribute('role', 'status');
    section.appendChild(status);

    const grid = document.createElement('div');
    grid.className = 'iconography-grid';
    for (const item of ICONOGRAPHY_ITEMS) {
      grid.appendChild(await renderCard(item));
    }
    section.appendChild(grid);

    renderRequests(section);
    root.appendChild(section);
  }

  return { load, openFeedbackModal };
}
