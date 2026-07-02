export function resolveVoteAction(existingEntry, requestedValue) {
  if (existingEntry && existingEntry.value === requestedValue) {
    return { action: 'delete' };
  }
  return { action: 'set', value: requestedValue };
}

export function computeVoteSummary(entries) {
  let up = 0;
  let down = 0;
  const voters = [];

  for (const [visitorId, entry] of entries) {
    if (entry.value === 'up') up += 1;
    if (entry.value === 'down') down += 1;
    voters.push({ visitorId, name: entry.name, value: entry.value, ts: entry.ts });
  }

  voters.sort((a, b) => a.ts - b.ts);

  return { up, down, voters };
}
