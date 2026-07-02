import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyRanking, hasCompleteRanking, normalizeRanking } from '../js/votes-section.js';

test('createEmptyRanking returns an empty rank for every logo', () => {
  assert.deepEqual(createEmptyRanking(), {
    logo1: '',
    logo2: '',
    logo3: '',
    logo4: '',
    logo5: '',
  });
});

test('hasCompleteRanking accepts a full unique one-to-five ranking', () => {
  assert.equal(hasCompleteRanking({
    logo1: '1',
    logo2: '2',
    logo3: '3',
    logo4: '4',
    logo5: '5',
  }), true);
});

test('hasCompleteRanking rejects incomplete or duplicate rankings', () => {
  assert.equal(hasCompleteRanking({
    logo1: '1',
    logo2: '2',
    logo3: '',
    logo4: '4',
    logo5: '5',
  }), false);
  assert.equal(hasCompleteRanking({
    logo1: '1',
    logo2: '1',
    logo3: '3',
    logo4: '4',
    logo5: '5',
  }), false);
});

test('normalizeRanking converts select values to numeric ranks', () => {
  assert.deepEqual(normalizeRanking({
    logo1: '1',
    logo2: '2',
    logo3: '3',
    logo4: '4',
    logo5: '5',
  }), {
    logo1: 1,
    logo2: 2,
    logo3: 3,
    logo4: 4,
    logo5: 5,
  });
});
