import { LOGOS } from './logos.js';
import { PALETTE_KEYS } from './palettes.js';
import { formatAverageRank, formatPaletteLabel, formatRankingDetail } from './admin-format.js';

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

  const paletteBlock = document.createElement('div');
  paletteBlock.className = 'admin-card';
  paletteBlock.innerHTML = '<h3>Palettes préférées</h3><ul class="admin-list"></ul>';
  const paletteList = paletteBlock.querySelector('.admin-list');
  for (const key of PALETTE_KEYS) {
    const li = document.createElement('li');
    li.textContent = `${formatPaletteLabel(key)} — ${votesData.palettes?.[key] || 0}`;
    paletteList.appendChild(li);
  }
  container.appendChild(paletteBlock);

  const logoBlock = document.createElement('div');
  logoBlock.className = 'admin-card';
  logoBlock.innerHTML = '<h3>Classement moyen des logos</h3><ul class="admin-list"></ul>';
  const logoList = logoBlock.querySelector('.admin-list');
  for (const logo of LOGOS) {
    const summary = votesData.logos?.[logo.id] || { averageRank: null, voteCount: 0 };
    const li = document.createElement('li');
    li.textContent = `${logo.name} — moyenne ${formatAverageRank(summary.averageRank)} (${summary.voteCount} votes)`;
    logoList.appendChild(li);
  }
  container.appendChild(logoBlock);

  const detailBlock = document.createElement('div');
  detailBlock.className = 'admin-card';
  detailBlock.innerHTML = '<h3>Détails par visiteur</h3><ul class="admin-list"></ul>';
  const detailList = detailBlock.querySelector('.admin-list');
  for (const voter of votesData.voters || []) {
    const li = document.createElement('li');
    const date = new Date(voter.ts).toLocaleString('fr-FR');
    li.textContent = `${voter.name} — ${formatPaletteLabel(voter.paletteKey)} — ${formatRankingDetail(voter.ranking, LOGOS)} — ${date}`;
    detailList.appendChild(li);
  }
  if (!detailList.children.length) {
    const li = document.createElement('li');
    li.textContent = 'Aucun vote pour le moment.';
    detailList.appendChild(li);
  }
  container.appendChild(detailBlock);
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
