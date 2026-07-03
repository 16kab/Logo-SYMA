import { createComparatorPanel } from './comparator-panel.js';
import { createVotesSection } from './votes-section.js';
import { activateDevTheme } from './dev-theme.js';

document.addEventListener('DOMContentLoaded', () => {
  activateDevTheme();

  createComparatorPanel(document.getElementById('panel-left'), {
    paletteKey: 'palette1',
    logoId: 'logo1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
    label: 'A',
  });

  createComparatorPanel(document.getElementById('panel-right'), {
    paletteKey: 'palette1',
    logoId: 'logo2',
    bgColor: '#f7f3e7',
    logoColor: '#18233f',
    label: 'B',
  });

  createVotesSection({
    submissionRoot: document.getElementById('submission-bar-root'),
  });
});
