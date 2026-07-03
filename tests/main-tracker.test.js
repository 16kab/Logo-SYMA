import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainSource = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

test('public main module imports and starts anonymous visit tracking', () => {
  assert.match(mainSource, /import\s+\{\s*startVisitTracking\s*\}\s+from\s+'\.\/visit-tracker\.js';/);
  assert.match(mainSource, /startVisitTracking\(\);/);
});
