import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultOrder, moveItem, orderToRanking } from '../js/ranking-order.js';

test('defaultOrder returns the seven logo ids in order', () => {
  assert.deepEqual(defaultOrder(), ['logo1', 'logo2', 'logo3', 'logo4', 'logo5', 'logo6', 'logo7']);
});

test('defaultOrder returns a fresh array each call (no shared reference)', () => {
  const a = defaultOrder();
  a[0] = 'mutated';
  assert.equal(defaultOrder()[0], 'logo1');
});

test('moveItem moves an element down without mutating the input', () => {
  const order = ['logo1', 'logo2', 'logo3'];
  assert.deepEqual(moveItem(order, 0, 2), ['logo2', 'logo3', 'logo1']);
  assert.deepEqual(order, ['logo1', 'logo2', 'logo3']);
});

test('moveItem moves an element up', () => {
  assert.deepEqual(moveItem(['logo1', 'logo2', 'logo3'], 2, 0), ['logo3', 'logo1', 'logo2']);
});

test('moveItem clamps out-of-range target indices', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 9), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, -3), ['c', 'a', 'b']);
});

test('moveItem returns an equivalent order when indices are equal', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c']);
});

test('orderToRanking maps each logo to its position + 1', () => {
  assert.deepEqual(orderToRanking(['logo3', 'logo1', 'logo2']), { logo3: 1, logo1: 2, logo2: 3 });
});
