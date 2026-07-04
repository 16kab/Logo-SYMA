import { LOGOS } from './logos.js';
import { PALETTES, PALETTE_KEYS } from './palettes.js';
import { renderLogoThumbs } from './comparator-panel.js';
import { renderPaletteTabs, renderSwatches } from './palette-controls.js';
import { loadInlineSvg, recolorSvg } from './svg-loader.js';
import { getIdentity, setName } from './identity.js';
import {
  applyFinalChoicePalette,
  createDraftFromFinalChoice,
  getFinalChoicePayload,
  isCompleteFinalChoiceDraft,
} from './final-choice-state.js';

const STARTER_PALETTE_KEY = 'palette1';
const STARTER_LOGO_ID = 'logo1';

function findLogo(logoId) {
  return LOGOS.find((logo) => logo.id === logoId) || LOGOS[0];
}

function createStarterFinalChoiceDraft(name = '') {
  const palette = PALETTES[STARTER_PALETTE_KEY];

  return {
    logoId: STARTER_LOGO_ID,
    paletteKey: STARTER_PALETTE_KEY,
    bgColor: palette.colors[0],
    logoColor: '#ffffff',
    name: name || '',
  };
}

function clear(element) {
  element.innerHTML = '';
}

function createButton(label, className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  return button;
}

function createControlGroup(label, slotRole, slotClassName) {
  const group = document.createElement('div');
  group.className = 'control-group';

  const title = document.createElement('p');
  title.className = 'control-label';
  title.textContent = label;

  const slot = document.createElement('div');
  slot.className = slotClassName;
  slot.setAttribute('data-role', slotRole);

  group.appendChild(title);
  group.appendChild(slot);
  return group;
}

export function createFinalChoiceSection({
  root,
  actionRoot,
  fetcher = globalThis.fetch,
  storage = globalThis.localStorage,
  loadSvg = loadInlineSvg,
  recolor = recolorSvg,
} = {}) {
  let currentChoice = null;
  let draft = null;
  let modal = null;

  async function renderLogoSurface(container, choice, { label = '', className = '' } = {}) {
    const logo = findLogo(choice.logoId);
    container.className = className;
    container.style.backgroundColor = choice.bgColor;
    clear(container);

    const logoWrap = document.createElement('div');
    logoWrap.className = 'final-choice-logo-wrap';
    container.appendChild(logoWrap);

    const svg = await loadSvg(logo.src, logoWrap);
    recolor(svg, choice.logoColor);

    if (label) {
      const caption = document.createElement('p');
      caption.className = 'final-choice-variant__label';
      caption.textContent = label;
      container.appendChild(caption);
    }
  }

  function renderAction() {
    clear(actionRoot);
    const button = createButton('Valider notre choix', 'final-choice-cta');
    button.addEventListener('click', () => {
      openModal(null);
    });
    actionRoot.appendChild(button);
  }

  async function renderSection() {
    clear(root);
    if (!currentChoice) return;

    const section = document.createElement('section');
    section.className = 'final-choice-section';
    section.setAttribute('aria-labelledby', 'final-choice-title');

    const header = document.createElement('div');
    header.className = 'final-choice-section__header';

    const titleBlock = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Choix final';
    const title = document.createElement('h2');
    title.id = 'final-choice-title';
    title.textContent = 'Direction retenue';
    titleBlock.appendChild(eyebrow);
    titleBlock.appendChild(title);

    const edit = createButton('Modifier', 'final-choice-edit');
    edit.addEventListener('click', () => {
      openModal(currentChoice);
    });

    header.appendChild(titleBlock);
    header.appendChild(edit);
    section.appendChild(header);

    const hero = document.createElement('div');
    section.appendChild(hero);

    const variants = document.createElement('div');
    variants.className = 'final-choice-variants';
    const blackOnWhite = document.createElement('article');
    const whiteOnBlack = document.createElement('article');
    variants.appendChild(blackOnWhite);
    variants.appendChild(whiteOnBlack);
    section.appendChild(variants);

    root.appendChild(section);

    await renderLogoSurface(hero, currentChoice, { className: 'final-choice-hero' });
    await renderLogoSurface(blackOnWhite, { ...currentChoice, bgColor: '#ffffff', logoColor: '#000000' }, {
      label: 'Noir sur blanc',
      className: 'final-choice-variant',
    });
    await renderLogoSurface(whiteOnBlack, { ...currentChoice, bgColor: '#000000', logoColor: '#ffffff' }, {
      label: 'Blanc sur noir',
      className: 'final-choice-variant',
    });
  }

  function ensureModal() {
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'final-choice-modal';
    modal.hidden = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'final-choice-modal__backdrop';
    backdrop.setAttribute('data-role', 'close');

    const dialog = document.createElement('section');
    dialog.className = 'final-choice-modal__dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'final-choice-modal-title');

    const header = document.createElement('div');
    header.className = 'final-choice-modal__header';
    const titleBlock = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Validation finale';
    const title = document.createElement('h2');
    title.id = 'final-choice-modal-title';
    title.textContent = 'Valider notre choix';
    titleBlock.appendChild(eyebrow);
    titleBlock.appendChild(title);
    const close = createButton('x', 'final-choice-modal__close');
    close.setAttribute('aria-label', 'Fermer');
    close.setAttribute('data-role', 'close');
    header.appendChild(titleBlock);
    header.appendChild(close);

    const body = document.createElement('div');
    body.className = 'final-choice-modal__body';
    const preview = document.createElement('div');
    preview.className = 'final-choice-modal__preview';
    preview.setAttribute('data-role', 'modal-preview');
    const controls = document.createElement('div');
    controls.className = 'final-choice-modal__controls';

    const nameLabel = document.createElement('label');
    nameLabel.className = 'final-choice-modal__field';
    nameLabel.textContent = 'Prenom';
    const nameInput = document.createElement('input');
    nameInput.className = 'final-choice-modal__input';
    nameInput.setAttribute('data-role', 'name');
    nameInput.setAttribute('autocomplete', 'given-name');
    nameInput.addEventListener('input', () => {
      draft = { ...draft, name: nameInput.value };
    });
    nameLabel.appendChild(nameInput);

    controls.appendChild(nameLabel);
    controls.appendChild(createControlGroup('Palette', 'palette-tabs', 'palette-tabs'));
    controls.appendChild(createControlGroup('Modele', 'logo-tabs', 'thumb-row'));
    controls.appendChild(createControlGroup('Fond', 'bg-swatches', 'swatch-row'));
    controls.appendChild(createControlGroup('Logo', 'logo-swatches', 'swatch-row'));

    const status = document.createElement('p');
    status.className = 'final-choice-modal__status';
    status.setAttribute('role', 'status');
    status.setAttribute('data-role', 'status');
    controls.appendChild(status);

    body.appendChild(preview);
    body.appendChild(controls);

    const footer = document.createElement('div');
    footer.className = 'final-choice-modal__footer';
    const cancel = createButton('Annuler', 'final-choice-modal__secondary');
    cancel.setAttribute('data-role', 'close');
    const submit = createButton('Valider notre choix', 'final-choice-modal__primary');
    submit.setAttribute('data-role', 'submit');
    submit.addEventListener('click', () => submitDraft());
    footer.appendChild(cancel);
    footer.appendChild(submit);

    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    modal.appendChild(backdrop);
    modal.appendChild(dialog);

    modal.querySelectorAll('[data-role="close"]').forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    document.body.appendChild(modal);
    return modal;
  }

  async function renderModalControls() {
    const modalEl = ensureModal();
    const preview = modalEl.querySelector('[data-role="modal-preview"]');
    const paletteTabs = modalEl.querySelector('[data-role="palette-tabs"]');
    const logoTabs = modalEl.querySelector('[data-role="logo-tabs"]');
    const bgSwatches = modalEl.querySelector('[data-role="bg-swatches"]');
    const logoSwatches = modalEl.querySelector('[data-role="logo-swatches"]');
    const nameInput = modalEl.querySelector('[data-role="name"]');
    const status = modalEl.querySelector('[data-role="status"]');

    nameInput.value = draft.name || '';
    status.textContent = '';
    status.setAttribute('role', 'status');

    renderPaletteTabs(paletteTabs, draft.paletteKey, async (paletteKey) => {
      draft = applyFinalChoicePalette({ ...draft, name: nameInput.value }, paletteKey);
      await renderModalControls();
    });

    renderLogoThumbs(logoTabs, draft.logoId, async (logoId) => {
      draft = { ...draft, name: nameInput.value, logoId };
      await renderModalControls();
    });

    if (draft.paletteKey && PALETTE_KEYS.includes(draft.paletteKey)) {
      renderSwatches(bgSwatches, draft.paletteKey, draft.bgColor, async (color) => {
        draft = { ...draft, name: nameInput.value, bgColor: color };
        await renderModalControls();
      }, 'Fond');
      renderSwatches(logoSwatches, draft.paletteKey, draft.logoColor, async (color) => {
        draft = { ...draft, name: nameInput.value, logoColor: color };
        await renderModalControls();
      }, 'Logo');
    } else {
      clear(bgSwatches);
      clear(logoSwatches);
    }

    clear(preview);
    if (isCompleteFinalChoiceDraft(draft)) {
      await renderLogoSurface(preview, draft, { className: 'final-choice-modal__preview-surface' });
    } else {
      const empty = document.createElement('p');
      empty.className = 'final-choice-modal__empty';
      empty.textContent = 'Selectionnez une palette, un logo et deux couleurs.';
      preview.appendChild(empty);
    }
  }

  async function openModal(choice) {
    const modalEl = ensureModal();
    const name = getIdentity(storage).name || '';
    draft = choice ? createDraftFromFinalChoice(choice, name) : createStarterFinalChoiceDraft(name);
    modalEl.hidden = false;
    await renderModalControls();
  }

  function closeModal() {
    if (modal) modal.hidden = true;
  }

  async function submitDraft() {
    const modalEl = ensureModal();
    const status = modalEl.querySelector('[data-role="status"]');
    const nameInput = modalEl.querySelector('[data-role="name"]');
    draft = { ...draft, name: nameInput.value };

    if (!isCompleteFinalChoiceDraft(draft)) {
      status.setAttribute('role', 'alert');
      status.textContent = 'Choisissez une palette, un logo, une couleur de fond et une couleur de logo.';
      return;
    }

    const payload = getFinalChoicePayload(draft);
    let response;
    try {
      response = await fetcher('/api/final-choice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      response = null;
    }

    if (!response?.ok) {
      status.setAttribute('role', 'alert');
      status.textContent = 'Le choix final n a pas pu etre enregistre.';
      return;
    }

    const data = await response.json();
    currentChoice = data.finalChoice;
    if (payload.name) setName(payload.name, storage);
    closeModal();
    await renderSection();
  }

  async function load() {
    renderAction();
    try {
      const response = await fetcher('/api/final-choice');
      if (response.ok) {
        const data = await response.json();
        currentChoice = data.finalChoice || null;
      }
    } catch (error) {
      currentChoice = null;
    }
    await renderSection();
  }

  return { load, openModal };
}
