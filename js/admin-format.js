import { PALETTES } from './palettes.js';

export function formatPaletteLabel(paletteKey) {
  return PALETTES[paletteKey]?.label || paletteKey;
}

export function formatAverageRank(averageRank) {
  return averageRank === null ? 'n/a' : averageRank.toFixed(2);
}

export function formatRankingDetail(ranking, logos) {
  return Object.entries(ranking || {})
    .sort((a, b) => a[1] - b[1])
    .map(([logoId, rank]) => {
      const logo = logos.find((item) => item.id === logoId);
      return `${rank}. ${logo ? logo.name : logoId}`;
    })
    .join(' / ');
}
