import { createComparatorPanel } from './comparator-panel.js';
import { createVotesSection } from './votes-section.js';
import { createFeedbackForm } from './feedback-form.js';

document.addEventListener('DOMContentLoaded', () => {
  createComparatorPanel(document.getElementById('panel-left'), {
    paletteKey: 'palette1',
    logoId: 'logo1',
    bgColor: '#18233f',
    logoColor: '#ffffff',
  });

  createComparatorPanel(document.getElementById('panel-right'), {
    paletteKey: 'palette1',
    logoId: 'logo2',
    bgColor: '#f7f3e7',
    logoColor: '#18233f',
  });

  createVotesSection({
    colorControlRoot: document.getElementById('votes-color-control'),
    gridRoot: document.getElementById('votes-grid'),
  });

  createFeedbackForm(document.getElementById('feedback-form'), document.getElementById('feedback-status'));
});
