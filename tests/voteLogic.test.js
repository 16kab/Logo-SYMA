import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRankedVoteSummary } from '../api/_lib/voteLogic.js';

test('computeRankedVoteSummary counts palette choices', () => {
  const summary = computeRankedVoteSummary([
    ['v1', { name: 'Alexis', paletteKey: 'palette1', ranking: { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5, logo6: 6, logo7: 7 }, ts: 200 }],
    ['v2', { name: 'Camille', paletteKey: 'palette2', ranking: { logo1: 2, logo2: 1, logo3: 3, logo4: 4, logo5: 5, logo6: 6, logo7: 7 }, ts: 100 }],
    ['v3', { name: 'Dana', paletteKey: 'palette1', ranking: { logo1: 3, logo2: 2, logo3: 1, logo4: 4, logo5: 5, logo6: 6, logo7: 7 }, ts: 300 }],
  ]);

  assert.deepEqual(summary.palettes, { palette1: 2, palette2: 1 });
});

test('computeRankedVoteSummary aggregates logo rank scores', () => {
  const summary = computeRankedVoteSummary([
    ['v1', { name: 'Alexis', paletteKey: 'palette1', ranking: { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5, logo6: 6, logo7: 7 }, ts: 200 }],
    ['v2', { name: 'Camille', paletteKey: 'palette2', ranking: { logo1: 2, logo2: 1, logo3: 3, logo4: 4, logo5: 5, logo6: 6, logo7: 7 }, ts: 100 }],
  ]);

  assert.deepEqual(summary.logos.logo1.rankCounts, { 1: 1, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 });
  assert.equal(summary.logos.logo1.score, 3);
  assert.equal(summary.logos.logo1.averageRank, 1.5);
});

test('computeRankedVoteSummary orders voters chronologically', () => {
  const summary = computeRankedVoteSummary([
    ['v1', { name: 'Alexis', paletteKey: 'palette1', ranking: { logo1: 1, logo2: 2, logo3: 3, logo4: 4, logo5: 5, logo6: 6, logo7: 7 }, ts: 200 }],
    ['v2', { name: 'Camille', paletteKey: 'palette2', ranking: { logo1: 2, logo2: 1, logo3: 3, logo4: 4, logo5: 5, logo6: 6, logo7: 7 }, ts: 100 }],
  ]);

  assert.deepEqual(summary.voters.map((voter) => voter.name), ['Camille', 'Alexis']);
});

test('computeRankedVoteSummary returns empty aggregates for no votes', () => {
  const summary = computeRankedVoteSummary([]);
  assert.deepEqual(summary.palettes, { palette1: 0, palette2: 0 });
  assert.equal(summary.logos.logo1.score, 0);
  assert.equal(summary.logos.logo1.averageRank, null);
  assert.deepEqual(summary.voters, []);
});
