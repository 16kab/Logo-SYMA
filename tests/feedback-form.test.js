import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedbackForm } from '../js/feedback-form.js';

function createFakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = value; },
  };
}

test('createFeedbackForm asks the custom identity modal for a missing name before sending', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = globalThis.localStorage;
  const storage = createFakeStorage({ syma_visitor_id: 'visitor-1' });
  globalThis.localStorage = storage;

  const nameInput = { value: '' };
  const messageInput = { value: '  Hello Alexis  ' };
  const listeners = {};
  const formEl = {
    querySelector(selector) {
      if (selector === '#feedback-name') return nameInput;
      if (selector === '#feedback-message') return messageInput;
      return null;
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
  };
  const statusEl = { textContent: '' };
  let modalCalls = 0;
  const identityModal = {
    async requireIdentity() {
      modalCalls += 1;
      return { id: 'visitor-1', name: 'Camille' };
    },
  };
  let requestBody = null;
  globalThis.fetch = async (url, options) => {
    requestBody = JSON.parse(options.body);
    return { ok: true };
  };

  try {
    createFeedbackForm(formEl, statusEl, identityModal);
    await listeners.submit({ preventDefault() {} });

    assert.equal(modalCalls, 1);
    assert.equal(nameInput.value, 'Camille');
    assert.deepEqual(requestBody, { name: 'Camille', message: 'Hello Alexis' });
    assert.equal(statusEl.textContent, 'Merci, votre message a bien été envoyé !');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.localStorage = originalStorage;
  }
});
