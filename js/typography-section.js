import {
  BODY_FONTS,
  DECORATION_FONTS,
  DEFAULT_TYPOGRAPHY,
  HEADING_FONTS,
} from './typography-options.js';

function clear(element) {
  element.innerHTML = '';
}

function normalizeSelection(typography) {
  return {
    headingFont: typography?.headingFont || DEFAULT_TYPOGRAPHY.headingFont,
    bodyFont: typography?.bodyFont || DEFAULT_TYPOGRAPHY.bodyFont,
    decorationFont: typography?.decorationFont || null,
  };
}

function createText(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

function fontStack(font) {
  return `"${font}", sans-serif`;
}

function createSelect({ label, role, options, value, includeEmpty = false }) {
  const field = document.createElement('label');
  field.className = 'typography-field';
  field.textContent = label;

  const select = document.createElement('select');
  select.className = 'typography-field__select';
  select.setAttribute('data-role', role);

  if (includeEmpty) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Aucune';
    select.appendChild(option);
  }

  for (const font of options) {
    const option = document.createElement('option');
    option.value = font.value;
    option.textContent = font.label;
    option.style.fontFamily = fontStack(font.value);
    select.appendChild(option);
  }

  select.value = value || '';
  field.appendChild(select);
  return { field, select };
}

export function createTypographySection({
  root,
  fetcher = globalThis.fetch,
} = {}) {
  let selection = normalizeSelection();
  let headingSelect = null;
  let bodySelect = null;
  let decorationSelect = null;
  let previewHeading = null;
  let previewBody = null;
  let previewDecoration = null;

  function setStatus(message, isError = false) {
    const status = root.querySelector('[data-role="typography-status"]');
    if (!status) return;
    status.textContent = message;
    status.className = isError ? 'typography-section__status is-error' : 'typography-section__status';
    status.setAttribute('role', isError ? 'alert' : 'status');
  }

  function syncSelects() {
    if (headingSelect) headingSelect.value = selection.headingFont;
    if (bodySelect) bodySelect.value = selection.bodyFont;
    if (decorationSelect) decorationSelect.value = selection.decorationFont || '';
  }

  function applyPreview() {
    if (!previewHeading || !previewBody || !previewDecoration) return;

    previewHeading.style.fontFamily = fontStack(selection.headingFont);
    previewBody.style.fontFamily = fontStack(selection.bodyFont);

    if (selection.decorationFont) {
      previewDecoration.hidden = false;
      previewDecoration.style.fontFamily = fontStack(selection.decorationFont);
    } else {
      previewDecoration.hidden = true;
      previewDecoration.style.fontFamily = '';
    }
  }

  function readSelectionFromControls() {
    return normalizeSelection({
      headingFont: headingSelect.value,
      bodyFont: bodySelect.value,
      decorationFont: decorationSelect.value || null,
    });
  }

  async function saveSelection(nextSelection) {
    selection = nextSelection;
    applyPreview();
    setStatus('Enregistrement...');

    let response;
    try {
      response = await fetcher('/api/typography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selection),
      });
    } catch (error) {
      response = null;
    }

    if (!response?.ok) {
      setStatus("La sélection typographique n'a pas pu être enregistrée.", true);
      return false;
    }

    const data = await response.json();
    selection = normalizeSelection(data.typography);
    syncSelects();
    applyPreview();
    setStatus('Sélection enregistrée.');
    return true;
  }

  function bindSelect(select) {
    select.addEventListener('change', () => saveSelection(readSelectionFromControls()));
  }

  async function load() {
    try {
      const response = await fetcher('/api/typography');
      if (response?.ok) {
        const data = await response.json();
        selection = normalizeSelection(data.typography);
      }
    } catch (error) {
      selection = normalizeSelection();
    }

    render();
  }

  function render() {
    clear(root);

    const section = document.createElement('section');
    section.className = 'typography-section';
    section.setAttribute('aria-labelledby', 'typography-title');

    const header = document.createElement('div');
    header.className = 'typography-section__header';
    const titleBlock = document.createElement('div');
    titleBlock.appendChild(createText('p', 'eyebrow', 'Typographies'));
    const title = createText('h2', '', 'Sélection typographique');
    title.id = 'typography-title';
    titleBlock.appendChild(title);
    titleBlock.appendChild(createText('p', 'typography-section__lede', 'Choisissez les associations de titre, texte courant et accent décoratif.'));
    header.appendChild(titleBlock);
    section.appendChild(header);

    const layout = document.createElement('div');
    layout.className = 'typography-layout';

    const controls = document.createElement('div');
    controls.className = 'typography-controls';

    const heading = createSelect({
      label: 'Typographie de titre',
      role: 'heading-font',
      options: HEADING_FONTS,
      value: selection.headingFont,
    });
    headingSelect = heading.select;
    controls.appendChild(heading.field);

    const body = createSelect({
      label: 'Typographie de texte',
      role: 'body-font',
      options: BODY_FONTS,
      value: selection.bodyFont,
    });
    bodySelect = body.select;
    controls.appendChild(body.field);

    const decoration = createSelect({
      label: 'Typographie de décoration',
      role: 'decoration-font',
      options: DECORATION_FONTS,
      value: selection.decorationFont,
      includeEmpty: true,
    });
    decorationSelect = decoration.select;
    controls.appendChild(decoration.field);

    const status = createText('p', 'typography-section__status', '');
    status.setAttribute('data-role', 'typography-status');
    status.setAttribute('role', 'status');
    controls.appendChild(status);

    const preview = document.createElement('article');
    preview.className = 'typography-preview';
    preview.setAttribute('aria-label', 'Visualiseur typographique');

    previewDecoration = createText('p', 'typography-preview__decoration', 'Studio SYMA');
    previewDecoration.setAttribute('data-role', 'preview-decoration');
    previewHeading = createText('h3', 'typography-preview__heading', 'Des identités claires, sensibles et mémorables');
    previewHeading.setAttribute('data-role', 'preview-heading');
    previewBody = createText('p', 'typography-preview__body', "Une typographie de titre donne le ton, la typo de texte porte la lecture, et l'accent décoratif ajoute juste ce qu'il faut de personnalité.");
    previewBody.setAttribute('data-role', 'preview-body');
    const alphabet = createText('p', 'typography-preview__alphabet', 'Aa Bb Cc 1234');

    preview.appendChild(previewDecoration);
    preview.appendChild(previewHeading);
    preview.appendChild(previewBody);
    preview.appendChild(alphabet);

    layout.appendChild(controls);
    layout.appendChild(preview);
    section.appendChild(layout);
    root.appendChild(section);

    bindSelect(headingSelect);
    bindSelect(bodySelect);
    bindSelect(decorationSelect);
    applyPreview();
  }

  return { load };
}
