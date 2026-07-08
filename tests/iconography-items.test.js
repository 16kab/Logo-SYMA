import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ICONOGRAPHY_ITEMS, ICONOGRAPHY_ITEM_IDS } from '../js/iconography-items.js';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('exposes the 22 copied iconography SVG assets', () => {
  assert.equal(ICONOGRAPHY_ITEMS.length, 22);
  assert.equal(ICONOGRAPHY_ITEM_IDS.length, 22);
  assert.deepEqual(ICONOGRAPHY_ITEMS[0], {
    id: 'blobs',
    title: 'Blobs',
    src: 'SVG/iconographie/blobs.svg',
  });
  assert.equal(ICONOGRAPHY_ITEMS.at(-1).id, 'sonia-tel');
});

test('iconography ids are unique and every SVG exists', () => {
  assert.equal(new Set(ICONOGRAPHY_ITEM_IDS).size, ICONOGRAPHY_ITEM_IDS.length);

  for (const item of ICONOGRAPHY_ITEMS) {
    assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(item.title.length > 0);
    assert.ok(item.src.startsWith('SVG/iconographie/'));
    assert.ok(existsSync(path.join(projectRoot, item.src)), `Missing iconography SVG: ${item.src}`);
  }
});
