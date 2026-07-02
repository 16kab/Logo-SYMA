import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveVoteAction, computeVoteSummary } from '../api/_lib/voteLogic.js';

test('resolveVoteAction sets a new vote when none exists', () => {
  assert.deepEqual(resolveVoteAction(null, 'up'), { action: 'set', value: 'up' });
});

test('resolveVoteAction deletes when clicking the same active vote again', () => {
  assert.deepEqual(resolveVoteAction({ value: 'up' }, 'up'), { action: 'delete' });
});

test('resolveVoteAction replaces an opposite vote', () => {
  assert.deepEqual(resolveVoteAction({ value: 'up' }, 'down'), { action: 'set', value: 'down' });
});

test('computeVoteSummary counts up and down votes', () => {
  const entries = [
    ['v1', { name: 'Alexis', value: 'up', ts: 200 }],
    ['v2', { name: 'Camille', value: 'down', ts: 100 }],
    ['v3', { name: 'Dana', value: 'up', ts: 300 }],
  ];
  const summary = computeVoteSummary(entries);
  assert.equal(summary.up, 2);
  assert.equal(summary.down, 1);
});

test('computeVoteSummary orders voters chronologically', () => {
  const entries = [
    ['v1', { name: 'Alexis', value: 'up', ts: 200 }],
    ['v2', { name: 'Camille', value: 'down', ts: 100 }],
  ];
  const summary = computeVoteSummary(entries);
  assert.deepEqual(summary.voters.map((voter) => voter.name), ['Camille', 'Alexis']);
});

test('computeVoteSummary returns zero counts for empty entries', () => {
  const summary = computeVoteSummary([]);
  assert.deepEqual(summary, { up: 0, down: 0, voters: [] });
});
