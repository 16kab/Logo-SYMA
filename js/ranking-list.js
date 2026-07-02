import { LOGOS } from './logos.js';
import { loadInlineSvg, recolorSvg } from './svg-loader.js';
import { moveItem } from './ranking-order.js';

export function createRankingList(root, { order, onChange, onFirstInteraction } = {}) {
  let currentOrder = [...order];
  let interacted = false;
  const rowMap = new Map();

  root.className = 'ranking-list';
  root.setAttribute('role', 'list');

  function notifyFirstInteraction() {
    if (interacted) return;
    interacted = true;
    onFirstInteraction?.();
  }

  // Synchronous: reorders the already-built row nodes and renumbers ranks.
  // No fetching, no innerHTML reset — appendChild moves existing nodes.
  function applyOrder() {
    currentOrder.forEach((id, index) => {
      const row = rowMap.get(id);
      if (!row) return;
      root.appendChild(row);
      const rankEl = row.querySelector('[data-role="rank"]');
      if (rankEl) rankEl.textContent = String(index + 1);
    });
  }

  function commit(newOrder) {
    currentOrder = newOrder;
    applyOrder();
    onChange?.([...currentOrder]);
  }

  // Runs once on init: builds every row's DOM (including the async SVG
  // fetch + recolor) exactly once, then lays them out via applyOrder().
  // Subsequent reorders never re-fetch or rebuild — they only move nodes.
  async function buildRows() {
    for (const logo of LOGOS) {
      const row = document.createElement('div');
      row.className = 'ranking-row';
      row.setAttribute('role', 'listitem');
      row.dataset.logoId = logo.id;
      row.innerHTML = `
        <button type="button" class="ranking-row__handle" data-role="handle"
          aria-label="Déplacer ${logo.name}" title="Glisser pour classer">⠿</button>
        <span class="ranking-row__rank" data-role="rank"></span>
        <span class="preview-box ranking-row__preview" data-role="preview"></span>
        <span class="ranking-row__name">${logo.name}</span>
      `;
      rowMap.set(logo.id, row);

      const previewEl = row.querySelector('[data-role="preview"]');
      previewEl.style.backgroundColor = '#ffffff';
      const svg = await loadInlineSvg(logo.src, previewEl);
      recolorSvg(svg, '#000000');
    }
    applyOrder();
  }

  function indexOfRow(rowEl) {
    return [...root.querySelectorAll('.ranking-row')].indexOf(rowEl);
  }

  // Pointer drag (mouse + touch)
  let drag = null;

  root.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('[data-role="handle"]');
    if (!handle) return;
    if (drag) return;
    const row = handle.closest('.ranking-row');
    const rows = [...root.querySelectorAll('.ranking-row')];
    const fromIndex = rows.indexOf(row);
    const tops = rows.map((r) => r.getBoundingClientRect().top);
    const step = rows.length > 1 ? tops[1] - tops[0] : row.getBoundingClientRect().height;

    drag = { row, fromIndex, targetIndex: fromIndex, startY: event.clientY, rows, step };
    handle.setPointerCapture(event.pointerId);
    row.classList.add('is-dragging');
    notifyFirstInteraction();
    event.preventDefault();
  });

  root.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dy = event.clientY - drag.startY;
    drag.row.style.transform = `translateY(${dy}px)`;

    const rawTarget = drag.fromIndex + Math.round(dy / drag.step);
    const targetIndex = Math.max(0, Math.min(drag.rows.length - 1, rawTarget));
    if (targetIndex === drag.targetIndex) return;
    drag.targetIndex = targetIndex;

    drag.rows.forEach((r, i) => {
      if (r === drag.row) return;
      let shift = 0;
      if (drag.fromIndex < targetIndex && i > drag.fromIndex && i <= targetIndex) shift = -drag.step;
      if (drag.fromIndex > targetIndex && i >= targetIndex && i < drag.fromIndex) shift = drag.step;
      r.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  });

  function endDrag() {
    if (!drag) return;
    const { fromIndex, targetIndex, rows, row } = drag;
    rows.forEach((r) => { r.style.transform = ''; });
    row.classList.remove('is-dragging');
    drag = null;
    if (targetIndex !== fromIndex) {
      commit(moveItem(currentOrder, fromIndex, targetIndex));
    }
  }

  root.addEventListener('pointerup', endDrag);
  root.addEventListener('pointercancel', endDrag);

  // Keyboard reorder on the focused handle
  root.addEventListener('keydown', (event) => {
    const handle = event.target.closest?.('[data-role="handle"]');
    if (!handle) return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const fromIndex = indexOfRow(handle.closest('.ranking-row'));
    const toIndex = fromIndex + (event.key === 'ArrowUp' ? -1 : 1);
    if (toIndex < 0 || toIndex >= currentOrder.length) return;
    notifyFirstInteraction();
    const movedId = currentOrder[fromIndex];
    commit(moveItem(currentOrder, fromIndex, toIndex));
    // Row nodes are never destroyed, so the handle for the moved logo
    // still exists in the DOM — refocus it now that it has moved.
    rowMap.get(movedId)?.querySelector('[data-role="handle"]')?.focus();
  });

  buildRows();

  return {
    getOrder: () => [...currentOrder],
    setOrder: (nextOrder) => { currentOrder = [...nextOrder]; applyOrder(); },
  };
}
