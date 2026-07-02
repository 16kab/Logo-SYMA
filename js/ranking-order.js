import { LOGO_IDS } from './logos.js';

export function defaultOrder() {
  return [...LOGO_IDS];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function moveItem(order, fromIndex, toIndex) {
  const next = [...order];
  const from = clamp(fromIndex, 0, next.length - 1);
  const to = clamp(toIndex, 0, next.length - 1);
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function orderToRanking(order) {
  return Object.fromEntries(order.map((logoId, index) => [logoId, index + 1]));
}
