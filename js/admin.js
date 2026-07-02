import { LOGOS } from './logos.js';

const TOKEN_STORAGE_KEY = 'syma_admin_token';

function getStoredToken() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

function storeToken(token) {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

async function login(password) {
  let response;
  try {
    response = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
  } catch (error) {
    return { token: null, networkError: true };
  }
  if (!response.ok) return { token: null, networkError: false };
  const data = await response.json();
  return { token: data.token, networkError: false };
}

async function fetchVotes(token) {
  const response = await fetch('/api/votes', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
}

async function fetchMessages(token) {
  const response = await fetch('/api/messages', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) return null;
  return response.json();
}

function renderVotes(votesData) {
  const container = document.getElementById('votes-summary');
  container.innerHTML = '';

  for (const logo of LOGOS) {
    const summary = votesData[logo.id] || { up: 0, down: 0, voters: [] };
    const block = document.createElement('div');
    block.className = 'logo-summary';
    block.innerHTML = `
      <h3>${logo.name} — 👍 ${summary.up} · 👎 ${summary.down}</h3>
      <ul class="voter-list"></ul>
    `;
    const votersList = block.querySelector('.voter-list');
    for (const voter of summary.voters || []) {
      const li = document.createElement('li');
      li.textContent = `${voter.name} — ${voter.value === 'up' ? '👍' : '👎'}`;
      votersList.appendChild(li);
    }
    container.appendChild(block);
  }
}

function renderMessages(messages) {
  const list = document.getElementById('messages-list');
  list.innerHTML = '';

  for (const item of messages) {
    const li = document.createElement('li');
    const date = new Date(item.ts).toLocaleString('fr-FR');

    const messageEl = document.createElement('p');
    messageEl.textContent = item.message;

    const metaEl = document.createElement('p');
    metaEl.className = 'message-meta';
    metaEl.textContent = `${item.name} — ${date}`;

    li.appendChild(messageEl);
    li.appendChild(metaEl);
    list.appendChild(li);
  }
}

async function showDashboard(token) {
  let votesData;
  let messages;
  try {
    [votesData, messages] = await Promise.all([fetchVotes(token), fetchMessages(token)]);
  } catch (error) {
    document.getElementById('login-section').hidden = false;
    document.getElementById('dashboard-section').hidden = true;
    document.getElementById('login-status').textContent = 'Erreur réseau, réessayez.';
    return;
  }

  if (messages === null) {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    document.getElementById('login-section').hidden = false;
    document.getElementById('dashboard-section').hidden = true;
    document.getElementById('login-status').textContent = 'Session expirée, reconnectez-vous.';
    return;
  }

  document.getElementById('login-section').hidden = true;
  document.getElementById('dashboard-section').hidden = false;
  renderVotes(votesData);
  renderMessages(messages);
}

document.addEventListener('DOMContentLoaded', () => {
  const existingToken = getStoredToken();
  if (existingToken) {
    showDashboard(existingToken);
  }

  document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = document.getElementById('admin-password').value;
    const { token, networkError } = await login(password);

    if (!token) {
      document.getElementById('login-status').textContent = networkError
        ? 'Erreur réseau, réessayez.'
        : 'Mot de passe incorrect.';
      return;
    }

    storeToken(token);
    showDashboard(token);
  });
});
