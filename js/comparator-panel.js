import { LOGOS } from './logos.js';
import {
  initialState,
  withPaletteChange,
  withLogoChange,
  withBgColor,
  withLogoColor,
} from './comparator-state.js';
import { renderPaletteTabs, renderSwatches } from './palette-controls.js';
import { loadInlineSvg, recolorSvg } from './svg-loader.js';

export function createComparatorPanelMarkup() {
  return `
    <div class="preview-box comparator-preview" data-role="preview"></div>
    <div class="panel-controls">
      <div class="control-group">
        <p class="control-label">Modèle</p>
        <div class="thumb-row" data-role="thumbs"></div>
      </div>
      <div class="control-group">
        <p class="control-label">Palette</p>
        <div class="palette-tabs" data-role="palette-tabs"></div>
      </div>
      <div class="control-group color-control">
        <p class="control-label">Fond</p>
        <div class="swatch-row" data-role="bg-swatches"></div>
      </div>
      <div class="control-group color-control">
        <p class="control-label">Logo</p>
        <div class="swatch-row" data-role="logo-swatches"></div>
      </div>
    </div>
  `;
}

export function renderLogoThumbs(container, activeLogoId, onSelect) {
  container.innerHTML = '';
  for (const logo of LOGOS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb-button';
    button.title = logo.name;
    button.classList.toggle('is-active', logo.id === activeLogoId);
    button.setAttribute('aria-label', `Choisir ${logo.name}`);
    button.setAttribute('aria-pressed', String(logo.id === activeLogoId));

    const image = document.createElement('img');
    image.className = 'thumb-button__image';
    image.src = logo.src;
    image.alt = '';
    image.loading = 'lazy';
    image.setAttribute('aria-hidden', 'true');
    button.appendChild(image);

    button.addEventListener('click', () => onSelect(logo.id));
    container.appendChild(button);
  }
}

export function createComparatorPanel(root, { paletteKey = 'palette1', logoId = LOGOS[0].id, bgColor, logoColor } = {}) {
  let state = initialState(paletteKey, logoId);
  if (bgColor) state = withBgColor(state, bgColor);
  if (logoColor) state = withLogoColor(state, logoColor);
  let svgElement = null;

  root.innerHTML = createComparatorPanelMarkup();

  const previewEl = root.querySelector('[data-role="preview"]');
  const thumbsEl = root.querySelector('[data-role="thumbs"]');
  const paletteTabsEl = root.querySelector('[data-role="palette-tabs"]');
  const bgSwatchesEl = root.querySelector('[data-role="bg-swatches"]');
  const logoSwatchesEl = root.querySelector('[data-role="logo-swatches"]');

  function renderThumbs() {
    renderLogoThumbs(thumbsEl, state.logoId, (logoId) => {
      state = withLogoChange(state, logoId);
      renderAll();
    });
  }

  function renderColorPickers() {
    renderPaletteTabs(paletteTabsEl, state.paletteKey, (key) => {
      state = withPaletteChange(state, key);
      renderAll();
    });

    renderSwatches(bgSwatchesEl, state.paletteKey, state.bgColor, (color) => {
      state = withBgColor(state, color);
      renderAll();
    }, 'Fond');

    renderSwatches(logoSwatchesEl, state.paletteKey, state.logoColor, (color) => {
      state = withLogoColor(state, color);
      renderAll();
    }, 'Logo');
  }

  async function renderPreview() {
    previewEl.style.backgroundColor = state.bgColor;
    const logo = LOGOS.find((item) => item.id === state.logoId);

    if (!svgElement || previewEl.dataset.loadedLogo !== logo.id) {
      svgElement = await loadInlineSvg(logo.src, previewEl);
      previewEl.dataset.loadedLogo = logo.id;
    }

    recolorSvg(svgElement, state.logoColor);
  }

  function renderAll() {
    renderThumbs();
    renderColorPickers();
    renderPreview();
  }

  renderAll();

  return {
    getState: () => state,
  };
}
