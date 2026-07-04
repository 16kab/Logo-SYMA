import { LOGOS } from './logos.js';
import { PALETTES } from './palettes.js';
import { formatPaletteLabel } from './admin-format.js';

function findLogo(logoId) {
  return LOGOS.find((logo) => logo.id === logoId) || null;
}

function createMeta(label, value) {
  const item = document.createElement('div');
  item.className = 'admin-final-choice__meta-item';

  const key = document.createElement('p');
  key.className = 'admin-final-choice__meta-label';
  key.textContent = label;

  const val = document.createElement('p');
  val.className = 'admin-final-choice__meta-value';
  val.textContent = value;

  item.appendChild(key);
  item.appendChild(val);
  return item;
}

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) return 'Date inconnue';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(updatedAt));
}

export function createFinalChoiceAdminCard({ finalChoice } = {}) {
  const card = document.createElement('div');
  card.className = 'admin-card admin-final-choice-card';
  card.innerHTML = '<h3>Choix final</h3>';

  if (!finalChoice) {
    const empty = document.createElement('p');
    empty.className = 'admin-empty';
    empty.textContent = 'Aucun choix final valide pour le moment.';
    card.appendChild(empty);
    return card;
  }

  const logo = findLogo(finalChoice.logoId);
  const layout = document.createElement('div');
  layout.className = 'admin-final-choice';

  const preview = document.createElement('div');
  preview.className = 'admin-final-choice__preview';
  preview.style.backgroundColor = finalChoice.bgColor;

  if (logo) {
    const image = document.createElement('img');
    image.src = logo.src;
    image.alt = logo.name;
    image.loading = 'lazy';
    preview.appendChild(image);
  }

  const meta = document.createElement('div');
  meta.className = 'admin-final-choice__meta';
  meta.appendChild(createMeta('Logo', logo?.name || finalChoice.logoId));
  meta.appendChild(createMeta('Palette', formatPaletteLabel(finalChoice.paletteKey)));
  meta.appendChild(createMeta('Fond', finalChoice.bgColor));
  meta.appendChild(createMeta('Logo couleur', finalChoice.logoColor));
  meta.appendChild(createMeta('Valide par', finalChoice.name || 'Anonyme'));
  meta.appendChild(createMeta('Derniere modification', formatUpdatedAt(finalChoice.updatedAt)));

  const swatches = document.createElement('div');
  swatches.className = 'admin-final-choice__swatches';
  for (const color of PALETTES[finalChoice.paletteKey]?.colors || []) {
    const swatch = document.createElement('span');
    swatch.className = 'admin-palette-preview__swatch';
    swatch.style.backgroundColor = color;
    swatches.appendChild(swatch);
  }
  meta.appendChild(swatches);

  layout.appendChild(preview);
  layout.appendChild(meta);
  card.appendChild(layout);
  return card;
}
