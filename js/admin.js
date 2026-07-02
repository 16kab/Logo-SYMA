import { LOGOS } from './logos.js';

const TOKEN_STORAGE_KEY = 'syma_admin_token';

function getStoredToken() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

function storeToken(token) {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

async function login(password) {
  const response = await fetch('/api/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.token;
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
    const votersList = (summary.voters || [])
      .map((voter) => `<li>${voter.name} — ${voter.value === 'up' ? '👍' : '👎'}</li>`)
      .join('');
    block.innerHTML = `
      <h3>${logo.name} — 👍 ${summary.up} · 👎 ${summary.down}</h3>
      <ul class="voter-list">${votersList}</ul>
    `;
    container.appendChild(block);
  }
}

function renderMessages(messages) {
  const list = document.getElementById('messages-list');
  list.innerHTML = '';

  for (const item of messages) {
    const li = document.createElement('li');
    const date = new Date(item.ts).toLocaleString('fr-FR');
    li.innerHTML = `
      <p>${item.message}</p>
      <p class="message-meta">${item.name} — ${date}</p>
    `;
    list.appendChild(li);
  }
}

async function showDashboard(token) {
  const [votesData, messages] = await Promise.all([fetchVotes(token), fetchMessages(token)]);

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
    const token = await login(password);

    if (!token) {
      document.getElementById('login-status').textContent = 'Mot de passe incorrect.';
      return;
    }

    storeToken(token);
    showDashboard(token);
  });
});
