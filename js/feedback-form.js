import { getIdentity, setName } from './identity.js';

export function createFeedbackForm(formEl, statusEl, identityModal) {
  const nameInput = formEl.querySelector('#feedback-name');
  const messageInput = formEl.querySelector('#feedback-message');

  const identity = getIdentity();
  if (identity.name) {
    nameInput.value = identity.name;
  }

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();
    let name = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!message) {
      statusEl.textContent = "Merci d'écrire un message avant d'envoyer.";
      return;
    }

    if (!name) {
      const identity = await identityModal.requireIdentity();
      name = identity.name;
      nameInput.value = name;
    }

    if (name) {
      setName(name);
    }

    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      });

      if (response.ok) {
        statusEl.textContent = 'Merci, votre message a bien été envoyé !';
        messageInput.value = '';
      } else {
        statusEl.textContent = 'Une erreur est survenue, réessayez.';
      }
    } catch (error) {
      console.error(error);
      statusEl.textContent = 'Une erreur est survenue, réessayez.';
    }
  });
}
