import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureIdentityId, getIdentity, setName, ensureIdentity } from '../js/identity.js';

function createFakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = value; },
  };
}

test('getIdentity returns nulls when storage is empty', () => {
  const storage = createFakeStorage();
  assert.deepEqual(getIdentity(storage), { id: null, name: null });
});

test('setName writes the name to storage', () => {
  const storage = createFakeStorage();
  setName('Alexis', storage);
  assert.equal(storage.getItem('syma_visitor_name'), 'Alexis');
});

test('ensureIdentity generates and persists an id when missing', () => {
  const storage = createFakeStorage();
  const identity = ensureIdentity({
    storage,
    generateId: () => 'fixed-id-123',
    promptForName: () => 'Camille',
  });
  assert.equal(identity.id, 'fixed-id-123');
  assert.equal(storage.getItem('syma_visitor_id'), 'fixed-id-123');
});

test('ensureIdentity prompts for a name only when missing, and persists it', () => {
  const storage = createFakeStorage({ syma_visitor_id: 'existing-id' });
  let promptCalls = 0;
  const identity = ensureIdentity({
    storage,
    generateId: () => 'should-not-be-used',
    promptForName: () => { promptCalls += 1; return 'Dana'; },
  });
  assert.equal(identity.id, 'existing-id');
  assert.equal(identity.name, 'Dana');
  assert.equal(promptCalls, 1);
  assert.equal(storage.getItem('syma_visitor_name'), 'Dana');
});

test('ensureIdentity does not prompt again once a name exists', () => {
  const storage = createFakeStorage({ syma_visitor_id: 'id-1', syma_visitor_name: 'Existing' });
  let promptCalls = 0;
  const identity = ensureIdentity({
    storage,
    promptForName: () => { promptCalls += 1; return 'New Name'; },
  });
  assert.equal(identity.name, 'Existing');
  assert.equal(promptCalls, 0);
});

test('ensureIdentity leaves name null if the prompt is cancelled', () => {
  const storage = createFakeStorage({ syma_visitor_id: 'id-1' });
  const identity = ensureIdentity({
    storage,
    promptForName: () => null,
  });
  assert.equal(identity.name, null);
  assert.equal(storage.getItem('syma_visitor_name'), null);
});

test('ensureIdentityId generates an id without prompting for a name', () => {
  const storage = createFakeStorage();
  const id = ensureIdentityId({
    storage,
    generateId: () => 'id-only',
  });

  assert.equal(id, 'id-only');
  assert.equal(storage.getItem('syma_visitor_id'), 'id-only');
  assert.equal(storage.getItem('syma_visitor_name'), null);
});
