import { LOGOS } from './logos.js';
import { PALETTES, PALETTE_KEYS } from './palettes.js';
import { formatPaletteLabel } from './admin-format.js';
import { createVisitAnalyticsCard } from './admin-visits.js';

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

function getSortableAverage(summary) {
  return Number.isFinite(summary?.averageRank) ? summary.averageRank : Number.POSITIVE_INFINITY;
}

function formatAverageRank(averageRank) {
  return Number.isFinite(averageRank) ? averageRank.toFixed(2) : 'n/a';
}

function formatVoteCount(voteCount) {
  return `${voteCount} vote${voteCount > 1 ? 's' : ''}`;
}

function getRankedLogoSummaries(votesData) {
  return LOGOS.map((logo, index) => ({
    logo,
    index,
    summary: votesData.logos?.[logo.id] || { averageRank: null, voteCount: 0 },
  })).sort((a, b) => {
    const averageDelta = getSortableAverage(a.summary) - getSortableAverage(b.summary);
    return averageDelta || a.index - b.index;
  });
}

function getVoterLogoRanking(ranking) {
  return LOGOS.map((logo, index) => ({
    logo,
    index,
    rank: Number(ranking?.[logo.id]),
  })).sort((a, b) => {
    const aRank = Number.isInteger(a.rank) ? a.rank : Number.POSITIVE_INFINITY;
    const bRank = Number.isInteger(b.rank) ? b.rank : Number.POSITIVE_INFINITY;
    return aRank - bRank || a.index - b.index;
  });
}

function createPalettePreview(paletteKey) {
  const preview = document.createElement('span');
  preview.className = 'admin-palette-preview';
  preview.setAttribute('aria-hidden', 'true');

  for (const color of PALETTES[paletteKey]?.colors || []) {
    const swatch = document.createElement('span');
    swatch.className = 'admin-palette-preview__swatch';
    swatch.style.backgroundColor = color;
    preview.appendChild(swatch);
  }

  return preview;
}

function createPaletteCard(paletteKey, count) {
  const item = document.createElement('li');
  item.className = 'admin-palette-card';

  const label = document.createElement('p');
  label.className = 'admin-palette-card__label';
  label.textContent = formatPaletteLabel(paletteKey);

  const meta = document.createElement('p');
  meta.className = 'admin-palette-card__meta';
  meta.textContent = formatVoteCount(count);

  const text = document.createElement('div');
  text.appendChild(label);
  text.appendChild(meta);

  item.appendChild(createPalettePreview(paletteKey));
  item.appendChild(text);

  return item;
}

function createLogoRankingItem({ logo, badgeText, metaText }) {
  const item = document.createElement('article');
  item.className = 'admin-logo-ranking__item';
  item.setAttribute('data-logo-id', logo.id);

  const visual = document.createElement('div');
  visual.className = 'admin-logo-ranking__visual';

  const badge = document.createElement('span');
  badge.className = 'admin-logo-ranking__rank';
  badge.textContent = badgeText;

  const image = document.createElement('img');
  image.className = 'admin-logo-ranking__image';
  image.src = logo.src;
  image.alt = logo.name;
  image.loading = 'lazy';

  visual.appendChild(badge);
  visual.appendChild(image);

  const name = document.createElement('p');
  name.className = 'admin-logo-ranking__name';
  name.textContent = logo.name;

  const meta = document.createElement('p');
  meta.className = 'admin-logo-ranking__meta';
  meta.textContent = metaText;

  item.appendChild(visual);
  item.appendChild(name);
  item.appendChild(meta);

  return item;
}

function createLogoRankingList(className) {
  const rankingGrid = document.createElement('div');
  rankingGrid.className = `admin-logo-ranking admin-logo-ranking--single-line ${className}`;
  return rankingGrid;
}

export function renderVotes(votesData, { reset = true } = {}) {
  const container = document.getElementById('votes-summary');
  if (reset) container.innerHTML = '';

  const paletteBlock = document.createElement('div');
  paletteBlock.className = 'admin-card';
  paletteBlock.innerHTML = '<h3>Palettes preferees</h3>';
  const paletteList = document.createElement('ul');
  paletteList.className = 'admin-list admin-palette-list';
  for (const key of PALETTE_KEYS) {
    paletteList.appendChild(createPaletteCard(key, votesData.palettes?.[key] || 0));
  }
  paletteBlock.appendChild(paletteList);
  container.appendChild(paletteBlock);

  const rankingBlock = document.createElement('div');
  rankingBlock.className = 'admin-card';
  rankingBlock.innerHTML = '<h3>Classement des logos</h3>';

  const rankingGrid = createLogoRankingList('admin-logo-ranking--average');

  getRankedLogoSummaries(votesData).forEach(({ logo, summary }, index) => {
    rankingGrid.appendChild(createLogoRankingItem({
      logo,
      badgeText: `#${index + 1}`,
      metaText: `Moyenne ${formatAverageRank(summary.averageRank)} — ${formatVoteCount(summary.voteCount || 0)}`,
    }));
  });

  rankingBlock.appendChild(rankingGrid);
  container.appendChild(rankingBlock);

  const voterBlock = document.createElement('div');
  voterBlock.className = 'admin-card';
  voterBlock.innerHTML = '<h3>Votes par personne</h3>';

  const voterList = document.createElement('div');
  voterList.className = 'admin-voter-list';

  for (const voter of votesData.voters || []) {
    const voterCard = document.createElement('article');
    voterCard.className = 'admin-voter-card';

    const header = document.createElement('div');
    header.className = 'admin-voter-card__header';

    const name = document.createElement('p');
    name.className = 'admin-voter-card__name';
    name.textContent = voter.name || 'Anonyme';

    const palette = document.createElement('div');
    palette.className = 'admin-voter-card__palette';
    const paletteLabel = document.createElement('span');
    paletteLabel.textContent = formatPaletteLabel(voter.paletteKey);
    palette.appendChild(createPalettePreview(voter.paletteKey));
    palette.appendChild(paletteLabel);

    header.appendChild(name);
    header.appendChild(palette);
    voterCard.appendChild(header);

    const voterRanking = createLogoRankingList('admin-logo-ranking--person');
    for (const entry of getVoterLogoRanking(voter.ranking)) {
      voterRanking.appendChild(createLogoRankingItem({
        logo: entry.logo,
        badgeText: Number.isInteger(entry.rank) ? `#${entry.rank}` : '#-',
        metaText: Number.isInteger(entry.rank) ? `Rang ${entry.rank}` : 'Non classé',
      }));
    }

    voterCard.appendChild(voterRanking);

    if (voter.message) {
      const message = document.createElement('p');
      message.className = 'admin-voter-card__message';
      message.textContent = voter.message;
      voterCard.appendChild(message);
    }

    voterList.appendChild(voterCard);
  }

  if (!voterList.children.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-empty';
    empty.textContent = 'Aucun vote enregistré.';
    voterList.appendChild(empty);
  }

  voterBlock.appendChild(voterList);
  container.appendChild(voterBlock);
}

export function renderDashboard({ votesData, visitsData }) {
  const container = document.getElementById('votes-summary');
  container.innerHTML = '';

  if (visitsData) {
    container.appendChild(createVisitAnalyticsCard(visitsData));
  }

  renderVotes(votesData, { reset: false });
}

async function fetchAdminJson(path, token) {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  return response;
}

async function showDashboard(token) {
  let votesData;
  let visitsData;
  try {
    const [votesResponse, visitsResponse] = await Promise.all([
      fetchAdminJson('/api/votes', token),
      fetchAdminJson('/api/visits', token),
    ]);

    if (votesResponse.status === 401 || visitsResponse.status === 401) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      document.getElementById('login-section').hidden = false;
      document.getElementById('dashboard-section').hidden = true;
      document.getElementById('login-status').textContent = 'Session expiree, reconnectez-vous.';
      return;
    }

    if (!votesResponse.ok || !visitsResponse.ok) {
      throw new Error('Admin data request failed');
    }

    votesData = await votesResponse.json();
    visitsData = await visitsResponse.json();
  } catch (error) {
    document.getElementById('login-section').hidden = false;
    document.getElementById('dashboard-section').hidden = true;
    document.getElementById('login-status').textContent = 'Erreur reseau, reessayez.';
    return;
  }

  document.getElementById('login-section').hidden = true;
  document.getElementById('dashboard-section').hidden = false;
  renderDashboard({ votesData, visitsData });
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
        ? 'Erreur reseau, reessayez.'
        : 'Mot de passe incorrect.';
      return;
    }

    storeToken(token);
    showDashboard(token);
  });
});
