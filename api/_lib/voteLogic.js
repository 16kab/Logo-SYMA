import { LOGO_IDS } from '../../js/logos.js';
import { PALETTE_KEYS } from '../../js/palettes.js';

function emptyRankCounts() {
  return Object.fromEntries(LOGO_IDS.map((_, index) => [index + 1, 0]));
}

export function computeRankedVoteSummary(entries) {
  const palettes = Object.fromEntries(PALETTE_KEYS.map((key) => [key, 0]));
  const logos = Object.fromEntries(LOGO_IDS.map((logoId) => [
    logoId,
    { score: 0, averageRank: null, voteCount: 0, rankCounts: emptyRankCounts() },
  ]));
  const voters = [];

  for (const [visitorId, entry] of entries) {
    if (entry.paletteKey in palettes) {
      palettes[entry.paletteKey] += 1;
    }

    for (const logoId of LOGO_IDS) {
      const rank = entry.ranking && entry.ranking[logoId];
      if (!Number.isInteger(rank) || rank < 1 || rank > LOGO_IDS.length) continue;
      logos[logoId].score += rank;
      logos[logoId].voteCount += 1;
      logos[logoId].rankCounts[rank] += 1;
    }

    voters.push({
      visitorId,
      name: entry.name,
      paletteKey: entry.paletteKey,
      ranking: entry.ranking,
      message: entry.message,
      ts: entry.ts,
    });
  }

  for (const logo of Object.values(logos)) {
    logo.averageRank = logo.voteCount ? logo.score / logo.voteCount : null;
  }

  voters.sort((a, b) => a.ts - b.ts);
  return { palettes, logos, voters };
}
