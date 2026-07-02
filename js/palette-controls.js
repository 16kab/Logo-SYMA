import { PALETTES, PALETTE_KEYS } from './palettes.js';

export function renderPaletteTabs(container, activePaletteKey, onSelect) {
  container.innerHTML = '';
  for (const key of PALETTE_KEYS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-tab';
    button.textContent = PALETTES[key].label;
    button.classList.toggle('is-active', key === activePaletteKey);
    button.addEventListener('click', () => onSelect(key));
    container.appendChild(button);
  }
}

export function renderSwatches(container, paletteKey, activeColor, onPick) {
  container.innerHTML = '';
  for (const color of PALETTES[paletteKey].colors) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.style.backgroundColor = color;
    button.classList.toggle('is-active', color === activeColor);
    button.setAttribute('aria-label', color);
    button.addEventListener('click', () => onPick(color));
    container.appendChild(button);
  }
}
