import { createComparatorPanel } from './comparator-panel.js';
import { createVotesSection } from './votes-section.js';

document.addEventListener('DOMContentLoaded', () => {
  createComparatorPanel(document.getElementById('panel-left'), {
    paletteKey: 'palette1',
    logoId: 'logo1',
  });

  createComparatorPanel(document.getElementById('panel-right'), {
    paletteKey: 'palette1',
    logoId: 'logo2',
  });

  createVotesSection({
    colorControlRoot: document.getElementById('votes-color-control'),
    gridRoot: document.getElementById('votes-grid'),
  });
});
