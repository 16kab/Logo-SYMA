function formatDateLabel(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatVisitCount(count) {
  return `${count} visite${count > 1 ? 's' : ''}`;
}

function appendText(parent, tagName, className, text, doc) {
  const element = doc.createElement(tagName);
  element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function formatChartSummary(daily) {
  const dailySummary = daily
    .map((day) => `${formatDateLabel(day.date)}, ${formatVisitCount(day.visits)}, durée moyenne ${formatDuration(day.averageDurationMs)}`)
    .join(' ; ');

  return `Visites anonymes par jour et durée moyenne : ${dailySummary}`;
}

export function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.round((durationMs || 0) / 1000));
  if (totalSeconds < 60) return `${totalSeconds} s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes} min ${seconds} s` : `${minutes} min`;
}

export function createVisitAnalyticsCard(visitsData, doc = document) {
  const card = doc.createElement('div');
  card.className = 'admin-card admin-visits-card';
  appendText(card, 'h3', '', 'Visites du site', doc);

  const metrics = doc.createElement('div');
  metrics.className = 'admin-visits-metrics';
  card.appendChild(metrics);

  const metricItems = [
    ['Total', formatVisitCount(visitsData.summary?.totalVisits || 0)],
    ['Durée moyenne', formatDuration(visitsData.summary?.averageDurationMs || 0)],
    ['Actives', `${visitsData.summary?.activeNow || 0} active${(visitsData.summary?.activeNow || 0) > 1 ? 's' : ''}`],
  ];

  for (const [label, value] of metricItems) {
    const item = doc.createElement('article');
    item.className = 'admin-visits-metric';
    appendText(item, 'p', 'admin-visits-metric__label', label, doc);
    appendText(item, 'p', 'admin-visits-metric__value', value, doc);
    metrics.appendChild(item);
  }

  const daily = visitsData.daily || [];
  if (!daily.length) {
    appendText(card, 'p', 'admin-empty', 'Aucune visite enregistrée.', doc);
    return card;
  }

  const maxVisits = Math.max(...daily.map((day) => day.visits), 1);
  const chart = doc.createElement('div');
  chart.className = 'admin-visits-chart';
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', formatChartSummary(daily));
  card.appendChild(chart);

  for (const day of daily) {
    const column = doc.createElement('div');
    column.className = 'admin-visits-chart__column';

    const bar = doc.createElement('span');
    bar.className = 'admin-visits-chart__bar';
    bar.style.height = `${Math.max(8, Math.round((day.visits / maxVisits) * 100))}%`;
    bar.setAttribute('title', `${formatVisitCount(day.visits)} - ${formatDuration(day.averageDurationMs)}`);

    appendText(column, 'span', 'admin-visits-chart__value', String(day.visits), doc);
    column.appendChild(bar);
    appendText(column, 'span', 'admin-visits-chart__label', formatDateLabel(day.date), doc);
    appendText(column, 'span', 'admin-visits-chart__duration', formatDuration(day.averageDurationMs), doc);
    chart.appendChild(column);
  }

  return card;
}
