export function createPageTabs({
  tabs = Array.from(document.querySelectorAll('[role="tab"][data-tab-target]')),
  panels = Array.from(document.querySelectorAll('[role="tabpanel"]')),
  body = document.body,
} = {}) {
  if (!tabs.length) return;

  const panelsById = new Map(panels.map((panel) => [panel.id, panel]));

  function activate(tab) {
    for (const item of tabs) {
      const isActive = item === tab;
      item.setAttribute('aria-selected', String(isActive));
      item.setAttribute('tabindex', isActive ? '0' : '-1');
      item.classList?.toggle('is-active', isActive);

      const panel = panelsById.get(item.dataset.tabTarget);
      if (panel) panel.hidden = !isActive;
    }

    body.dataset.activeTab = tab.dataset.tabName || tab.dataset.tabTarget;
  }

  for (const tab of tabs) {
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      activate(tab);
    });

    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const index = tabs.indexOf(tab);
      const next = tabs[(index + direction + tabs.length) % tabs.length];
      activate(next);
      next.focus?.();
    });
  }

  activate(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
}
