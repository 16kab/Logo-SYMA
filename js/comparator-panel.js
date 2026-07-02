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

export function createComparatorPanel(root, { paletteKey = 'palette1', logoId = LOGOS[0].id, bgColor, logoColor } = {}) {
  let state = initialState(paletteKey, logoId);
  if (bgColor) state = withBgColor(state, bgColor);
  if (logoColor) state = withLogoColor(state, logoColor);
  let svgElement = null;

  root.innerHTML = `
    <div class="preview-box" data-role="preview"></div>
    <div class="thumb-row" data-role="thumbs"></div>
    <div class="palette-tabs" data-role="palette-tabs"></div>
    <div class="swatch-row" data-role="bg-swatches"></div>
    <div class="swatch-row" data-role="logo-swatches"></div>
  `;

  const previewEl = root.querySelector('[data-role="preview"]');
  const thumbsEl = root.querySelector('[data-role="thumbs"]');
  const paletteTabsEl = root.querySelector('[data-role="palette-tabs"]');
  const bgSwatchesEl = root.querySelector('[data-role="bg-swatches"]');
  const logoSwatchesEl = root.querySelector('[data-role="logo-swatches"]');

  function renderThumbs() {
    thumbsEl.innerHTML = '';
    for (const logo of LOGOS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'thumb-button';
      button.textContent = logo.name;
      button.classList.toggle('is-active', logo.id === state.logoId);
      button.addEventListener('click', () => {
        state = withLogoChange(state, logo.id);
        renderAll();
      });
      thumbsEl.appendChild(button);
    }
  }

  function renderColorPickers() {
    renderPaletteTabs(paletteTabsEl, state.paletteKey, (key) => {
      state = withPaletteChange(state, key);
      renderAll();
    });

    renderSwatches(bgSwatchesEl, state.paletteKey, state.bgColor, (color) => {
      state = withBgColor(state, color);
      renderAll();
    });

    renderSwatches(logoSwatchesEl, state.paletteKey, state.logoColor, (color) => {
      state = withLogoColor(state, color);
      renderAll();
    });
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
