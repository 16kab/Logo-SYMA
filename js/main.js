import { createComparatorPanel } from './comparator-panel.js';
import { createVotesSection } from './votes-section.js';
import { activateDevTheme } from './dev-theme.js';
import { startVisitTracking } from './visit-tracker.js';
import { createPageTabs } from './page-tabs.js';
import { createFinalChoiceSection } from './final-choice-section.js';
import { createIconographySection } from './iconography-section.js';
import { createTypographySection } from './typography-section.js';

document.addEventListener('DOMContentLoaded', () => {
  startVisitTracking();
  activateDevTheme();
  createPageTabs();
  createFinalChoiceSection({
    root: document.getElementById('final-choice-root'),
    actionRoot: document.getElementById('final-choice-action-root'),
  }).load();
  createIconographySection({
    root: document.getElementById('iconography-root'),
  }).load();
  createTypographySection({
    root: document.getElementById('typography-root'),
  }).load();

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
