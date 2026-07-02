import { ensureIdentityId, getIdentity, setName } from './identity.js';

export function createIdentityModal(root = document.getElementById('identity-modal-root')) {
  let pendingResolve = null;

  root.innerHTML = `
    <div class="identity-modal" data-role="dialog" hidden>
      <div class="identity-modal__backdrop" data-role="backdrop"></div>
      <div class="identity-modal__panel" role="dialog" aria-modal="true" aria-labelledby="identity-modal-title">
        <form class="identity-modal__form" data-role="form">
          <h2 id="identity-modal-title">Votre prénom</h2>
          <label for="identity-name">Votre prénom</label>
          <input type="text" id="identity-name" name="name" autocomplete="given-name" />
          <p class="identity-modal__error" data-role="error" role="alert"></p>
          <button type="submit">Continuer</button>
        </form>
      </div>
    </div>
  `;

  const dialog = root.querySelector('[data-role="dialog"]');
  const form = root.querySelector('[data-role="form"]');
  const input = root.querySelector('#identity-name');
  const error = root.querySelector('[data-role="error"]');

  function close(identity) {
    dialog.hidden = true;
    pendingResolve?.(identity);
    pendingResolve = null;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) {
      error.textContent = 'Merci de renseigner votre prénom.';
      input.focus();
      return;
    }

    setName(name);
    close({ id: ensureIdentityId(), name });
  });

  return {
    async requireIdentity() {
      const id = ensureIdentityId();
      const identity = getIdentity();
      if (identity.name) return { id, name: identity.name };

      dialog.hidden = false;
      error.textContent = '';
      input.value = '';
      input.focus();

      return new Promise((resolve) => {
        pendingResolve = resolve;
      });
    },
  };
}
