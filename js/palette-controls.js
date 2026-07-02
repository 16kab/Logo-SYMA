import { PALETTES, PALETTE_KEYS } from './palettes.js';

export function renderPaletteTabs(container, activePaletteKey, onSelect) {
  container.innerHTML = '';
  for (const key of PALETTE_KEYS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-tab';
    button.textContent = PALETTES[key].label;
    button.classList.toggle('is-active', key === activePaletteKey);
    button.setAttribute('aria-pressed', String(key === activePaletteKey));
    button.setAttribute('aria-label', `Choisir ${PALETTES[key].label}`);
    button.addEventListener('click', () => onSelect(key));
    container.appendChild(button);
  }
}

export function renderSwatches(container, paletteKey, activeColor, onPick, label = 'Couleur') {
  container.innerHTML = '';
  for (const color of PALETTES[paletteKey].colors) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch';
    button.style.backgroundColor = color;
    button.classList.toggle('is-active', color === activeColor);
    button.setAttribute('aria-label', `${label || 'Couleur'} ${color}`);
    button.setAttribute('aria-pressed', String(color === activeColor));
    button.addEventListener('click', () => onPick(color));
    container.appendChild(button);
  }
}
