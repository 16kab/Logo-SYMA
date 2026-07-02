import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LOGOS, LOGO_IDS } from '../js/logos.js';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('exposes exactly 7 logos with sequential ids', () => {
  assert.deepEqual(LOGO_IDS, ['logo1', 'logo2', 'logo3', 'logo4', 'logo5', 'logo6', 'logo7']);
  assert.equal(LOGOS.at(-1).name, 'Logo 7');
  assert.equal(LOGOS.at(-1).src, 'SVG/Logo fluid.svg');
});

test('each logo file exists on disk', () => {
  for (const logo of LOGOS) {
    const fullPath = path.join(projectRoot, logo.src);
    assert.ok(existsSync(fullPath), `Missing file for ${logo.id}: ${fullPath}`);
  }
});
