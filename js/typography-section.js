import {
  BODY_FONTS,
  DECORATION_FONTS,
  DEFAULT_TYPOGRAPHY,
  FONT_WEIGHT_OPTIONS,
  HEADING_FONTS,
} from './typography-options.js';

function clear(element) {
  element.innerHTML = '';
}

function normalizeSelection(typography) {
  return {
    headingFont: typography?.headingFont || DEFAULT_TYPOGRAPHY.headingFont,
    headingWeight: Number(typography?.headingWeight || DEFAULT_TYPOGRAPHY.headingWeight),
    bodyFont: typography?.bodyFont || DEFAULT_TYPOGRAPHY.bodyFont,
    bodyWeight: Number(typography?.bodyWeight || DEFAULT_TYPOGRAPHY.bodyWeight),
    decorationFont: typography?.decorationFont || null,
    decorationWeight: Number(typography?.decorationWeight || DEFAULT_TYPOGRAPHY.decorationWeight),
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

function createSelect({ label, role, options, value, includeEmpty = false, applyOptionFont = true }) {
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
    if (applyOptionFont) option.style.fontFamily = fontStack(font.value);
    select.appendChild(option);
  }

  select.value = value ? String(value) : '';
  field.appendChild(select);
  return { field, select };
}

function createFontControl({ label, fontRole, weightRole, fontOptions, fontValue, weightValue, includeEmpty = false }) {
  const group = document.createElement('div');
  group.className = 'typography-control-group';
  group.appendChild(createText('p', 'typography-control-group__label', label));

  const row = document.createElement('div');
  row.className = 'typography-control-group__row';

  const font = createSelect({
    label: 'Police',
    role: fontRole,
    options: fontOptions,
    value: fontValue,
    includeEmpty,
  });
  const weight = createSelect({
    label: 'Graisse',
    role: weightRole,
    options: FONT_WEIGHT_OPTIONS,
    value: weightValue,
    applyOptionFont: false,
  });

  row.appendChild(font.field);
  row.appendChild(weight.field);
  group.appendChild(row);
  return { group, fontSelect: font.select, weightSelect: weight.select };
}

export function createTypographySection({
  root,
  fetcher = globalThis.fetch,
} = {}) {
  let selection = normalizeSelection();
  let headingSelect = null;
  let headingWeightSelect = null;
  let bodySelect = null;
  let bodyWeightSelect = null;
  let decorationSelect = null;
  let decorationWeightSelect = null;
  let previewHeading = null;
  let previewBody = null;
  let previewDecoration = null;
  let headingPill = null;
  let bodyPill = null;
  let decorationPill = null;

  function setStatus(message, isError = false) {
    const status = root.querySelector('[data-role="typography-status"]');
    if (!status) return;
    status.textContent = message;
    status.className = isError ? 'typography-section__status is-error' : 'typography-section__status';
    status.setAttribute('role', isError ? 'alert' : 'status');
  }

  function syncSelects() {
    if (headingSelect) headingSelect.value = selection.headingFont;
    if (headingWeightSelect) headingWeightSelect.value = String(selection.headingWeight);
    if (bodySelect) bodySelect.value = selection.bodyFont;
    if (bodyWeightSelect) bodyWeightSelect.value = String(selection.bodyWeight);
    if (decorationSelect) decorationSelect.value = selection.decorationFont || '';
    if (decorationWeightSelect) decorationWeightSelect.value = String(selection.decorationWeight);
  }

  function applyPreview() {
    if (!previewHeading || !previewBody || !previewDecoration) return;

    previewHeading.style.fontFamily = fontStack(selection.headingFont);
    previewHeading.style.fontWeight = String(selection.headingWeight);
    previewBody.style.fontFamily = fontStack(selection.bodyFont);
    previewBody.style.fontWeight = String(selection.bodyWeight);

    if (selection.decorationFont) {
      previewDecoration.hidden = false;
      previewDecoration.style.fontFamily = fontStack(selection.decorationFont);
      previewDecoration.style.fontWeight = String(selection.decorationWeight);
    } else {
      previewDecoration.hidden = true;
      previewDecoration.style.fontFamily = '';
      previewDecoration.style.fontWeight = '';
    }

    if (headingPill) headingPill.textContent = `Titre ${selection.headingFont} ${selection.headingWeight}`;
    if (bodyPill) bodyPill.textContent = `Texte ${selection.bodyFont} ${selection.bodyWeight}`;
    if (decorationPill) {
      decorationPill.textContent = selection.decorationFont
        ? `Déco ${selection.decorationFont} ${selection.decorationWeight}`
        : 'Déco aucune';
    }
  }

  function readSelectionFromControls() {
    return normalizeSelection({
      headingFont: headingSelect.value,
      headingWeight: Number(headingWeightSelect.value),
      bodyFont: bodySelect.value,
      bodyWeight: Number(bodyWeightSelect.value),
      decorationFont: decorationSelect.value || null,
      decorationWeight: Number(decorationWeightSelect.value),
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

    const heading = createFontControl({
      label: 'Typographie de titre',
      fontRole: 'heading-font',
      weightRole: 'heading-weight',
      fontOptions: HEADING_FONTS,
      fontValue: selection.headingFont,
      weightValue: selection.headingWeight,
    });
    headingSelect = heading.fontSelect;
    headingWeightSelect = heading.weightSelect;
    controls.appendChild(heading.group);

    const body = createFontControl({
      label: 'Typographie de texte',
      fontRole: 'body-font',
      weightRole: 'body-weight',
      fontOptions: BODY_FONTS,
      fontValue: selection.bodyFont,
      weightValue: selection.bodyWeight,
    });
    bodySelect = body.fontSelect;
    bodyWeightSelect = body.weightSelect;
    controls.appendChild(body.group);

    const decoration = createFontControl({
      label: 'Typographie de décoration',
      fontRole: 'decoration-font',
      weightRole: 'decoration-weight',
      fontOptions: DECORATION_FONTS,
      fontValue: selection.decorationFont,
      weightValue: selection.decorationWeight,
      includeEmpty: true,
    });
    decorationSelect = decoration.fontSelect;
    decorationWeightSelect = decoration.weightSelect;
    controls.appendChild(decoration.group);

    const status = createText('p', 'typography-section__status', '');
    status.setAttribute('data-role', 'typography-status');
    status.setAttribute('role', 'status');
    controls.appendChild(status);

    const preview = document.createElement('article');
    preview.className = 'typography-preview';
    preview.setAttribute('aria-label', 'Visualiseur typographique');

    const previewMeta = document.createElement('div');
    previewMeta.className = 'typography-preview__meta';
    previewMeta.appendChild(createText('p', 'typography-preview__meta-label', 'Association en direct'));
    const pills = document.createElement('div');
    pills.className = 'typography-preview__font-pills';
    headingPill = createText('span', 'typography-preview__font-pill', '');
    bodyPill = createText('span', 'typography-preview__font-pill', '');
    decorationPill = createText('span', 'typography-preview__font-pill', '');
    pills.appendChild(headingPill);
    pills.appendChild(bodyPill);
    pills.appendChild(decorationPill);
    previewMeta.appendChild(pills);

    const canvas = document.createElement('div');
    canvas.className = 'typography-preview__canvas';
    previewDecoration = createText('p', 'typography-preview__decoration', 'Studio SYMA');
    previewDecoration.setAttribute('data-role', 'preview-decoration');
    previewHeading = createText('h3', 'typography-preview__heading', 'Une identité douce qui reste en tête');
    previewHeading.setAttribute('data-role', 'preview-heading');
    previewBody = createText('p', 'typography-preview__body', "SYMA accompagne les marques avec une présence visuelle claire, chaleureuse et mémorable. Cette combinaison montre le rythme entre l'accroche, le texte courant et l'accent de personnalité.");
    previewBody.setAttribute('data-role', 'preview-body');
    const specimen = document.createElement('div');
    specimen.className = 'typography-preview__specimen';
    specimen.appendChild(createText('span', 'typography-preview__alphabet', 'Aa Bb Cc'));
    specimen.appendChild(createText('span', 'typography-preview__alphabet', '1234'));
    specimen.appendChild(createText('span', 'typography-preview__alphabet', 'éèàç'));

    canvas.appendChild(previewDecoration);
    canvas.appendChild(previewHeading);
    canvas.appendChild(previewBody);
    canvas.appendChild(specimen);
    preview.appendChild(previewMeta);
    preview.appendChild(canvas);

    layout.appendChild(controls);
    layout.appendChild(preview);
    section.appendChild(layout);
    root.appendChild(section);

    bindSelect(headingSelect);
    bindSelect(headingWeightSelect);
    bindSelect(bodySelect);
    bindSelect(bodyWeightSelect);
    bindSelect(decorationSelect);
    bindSelect(decorationWeightSelect);
    applyPreview();
  }

  return { load };
}
