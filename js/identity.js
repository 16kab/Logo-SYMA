const STORAGE_KEY_ID = 'syma_visitor_id';
const STORAGE_KEY_NAME = 'syma_visitor_name';

export function getIdentity(storage = globalThis.localStorage) {
  return {
    id: storage.getItem(STORAGE_KEY_ID),
    name: storage.getItem(STORAGE_KEY_NAME),
  };
}

export function setName(name, storage = globalThis.localStorage) {
  storage.setItem(STORAGE_KEY_NAME, name);
}

export function ensureIdentity({
  storage = globalThis.localStorage,
  generateId = () => globalThis.crypto.randomUUID(),
  promptForName = () => globalThis.prompt('Votre prénom ?'),
} = {}) {
  let { id, name } = getIdentity(storage);

  if (!id) {
    id = generateId();
    storage.setItem(STORAGE_KEY_ID, id);
  }

  if (!name) {
    name = promptForName();
    if (name) {
      storage.setItem(STORAGE_KEY_NAME, name);
    }
  }

  return { id, name };
}
