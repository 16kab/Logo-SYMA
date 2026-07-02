import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyRanking,
  getRankChoices,
  hasCompleteRanking,
  normalizeRanking,
  withRankSelection,
} from '../js/votes-section.js';

test('createEmptyRanking returns an empty rank for every logo', () => {
  assert.deepEqual(createEmptyRanking(), {
    logo1: '',
    logo2: '',
    logo3: '',
    logo4: '',
    logo5: '',
    logo6: '',
    logo7: '',
  });
});

test('hasCompleteRanking accepts a full unique one-to-seven ranking', () => {
  assert.equal(hasCompleteRanking({
    logo1: '1',
    logo2: '2',
    logo3: '3',
    logo4: '4',
    logo5: '5',
    logo6: '6',
    logo7: '7',
  }), true);
});

test('hasCompleteRanking rejects incomplete or duplicate rankings', () => {
  assert.equal(hasCompleteRanking({
    logo1: '1',
    logo2: '2',
    logo3: '',
    logo4: '4',
    logo5: '5',
    logo6: '6',
    logo7: '7',
  }), false);
  assert.equal(hasCompleteRanking({
    logo1: '1',
    logo2: '1',
    logo3: '3',
    logo4: '4',
    logo5: '5',
    logo6: '6',
    logo7: '7',
  }), false);
});

test('normalizeRanking converts select values to numeric ranks', () => {
  assert.deepEqual(normalizeRanking({
    logo1: '1',
    logo2: '2',
    logo3: '3',
    logo4: '4',
    logo5: '5',
    logo6: '6',
    logo7: '7',
  }), {
    logo1: 1,
    logo2: 2,
    logo3: 3,
    logo4: 4,
    logo5: 5,
    logo6: 6,
    logo7: 7,
  });
});

test('getRankChoices returns every rank so completed rankings remain editable', () => {
  assert.deepEqual(getRankChoices(), [1, 2, 3, 4, 5, 6, 7]);
});

test('withRankSelection swaps an occupied rank instead of creating duplicates', () => {
  const ranking = {
    logo1: '1',
    logo2: '2',
    logo3: '3',
    logo4: '4',
    logo5: '5',
    logo6: '6',
    logo7: '7',
  };

  assert.deepEqual(withRankSelection(ranking, 'logo1', '2'), {
    logo1: '2',
    logo2: '1',
    logo3: '3',
    logo4: '4',
    logo5: '5',
    logo6: '6',
    logo7: '7',
  });
  assert.deepEqual(ranking, {
    logo1: '1',
    logo2: '2',
    logo3: '3',
    logo4: '4',
    logo5: '5',
    logo6: '6',
    logo7: '7',
  });
});

test('withRankSelection clears the displaced logo when an unranked logo takes its rank', () => {
  const ranking = {
    logo1: '1',
    logo2: '2',
    logo3: '',
    logo4: '',
    logo5: '',
    logo6: '',
    logo7: '',
  };

  assert.deepEqual(withRankSelection(ranking, 'logo3', '2'), {
    logo1: '1',
    logo2: '',
    logo3: '2',
    logo4: '',
    logo5: '',
    logo6: '',
    logo7: '',
  });
});
