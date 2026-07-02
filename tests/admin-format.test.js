import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAverageRank, formatPaletteLabel, formatRankingDetail } from '../js/admin-format.js';
import { LOGOS } from '../js/logos.js';

test('formatPaletteLabel returns readable palette names', () => {
  assert.equal(formatPaletteLabel('palette1'), 'Palette 1');
  assert.equal(formatPaletteLabel('palette2'), 'Palette 2');
  assert.equal(formatPaletteLabel('unknown'), 'unknown');
});

test('formatAverageRank formats null and numeric averages', () => {
  assert.equal(formatAverageRank(null), 'n/a');
  assert.equal(formatAverageRank(1.5), '1.50');
});

test('formatRankingDetail orders logos by rank', () => {
  assert.equal(formatRankingDetail({
    logo1: 2,
    logo2: 1,
    logo3: 3,
    logo4: 4,
    logo5: 5,
  }, LOGOS), '1. Logo 2 / 2. Logo 1 / 3. Logo 3 / 4. Logo 4 / 5. Logo 5');
});
