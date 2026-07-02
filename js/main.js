import { createComparatorPanel } from './comparator-panel.js';

document.addEventListener('DOMContentLoaded', () => {
  createComparatorPanel(document.getElementById('panel-left'), {
    paletteKey: 'palette1',
    logoId: 'logo1',
  });

  createComparatorPanel(document.getElementById('panel-right'), {
    paletteKey: 'palette1',
    logoId: 'logo2',
  });
});
