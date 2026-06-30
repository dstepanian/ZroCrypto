const QC = 'https://quickchart.io/chart';

// Fetch a PNG of BTC+ETH prices across the given history entries.
// Uses Chart.js 2 syntax (QuickChart's default).
// Returns a Buffer, throws on failure.
export const buildWeeklyChart = async (history) => {
  const labels = history.map((e) => e.date.slice(5)); // MM-DD
  const btc = history.map((e) => e.prices?.find((p) => p.label === 'Bitcoin')?.price ?? null);
  const eth = history.map((e) => e.prices?.find((p) => p.label === 'Ethereum')?.price ?? null);

  const cfg = {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'BTC ($)',
          data: btc,
          borderColor: '#F7931A',
          backgroundColor: 'rgba(247,147,26,0.12)',
          yAxisID: 'y',
          lineTension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#F7931A',
          fill: true,
          borderWidth: 2,
        },
        {
          label: 'ETH ($)',
          data: eth,
          borderColor: '#627EEA',
          backgroundColor: 'rgba(98,126,234,0.10)',
          yAxisID: 'y1',
          lineTension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#627EEA',
          fill: true,
          borderWidth: 2,
        },
      ],
    },
    options: {
      legend: { labels: { fontColor: '#c8d0e0', fontSize: 13 } },
      scales: {
        xAxes: [{
          ticks: { fontColor: '#8899aa', fontSize: 12 },
          gridLines: { color: 'rgba(255,255,255,0.06)' },
        }],
        yAxes: [
          {
            id: 'y',
            position: 'left',
            ticks: { fontColor: '#F7931A', fontSize: 11 },
            gridLines: { color: 'rgba(255,255,255,0.06)' },
          },
          {
            id: 'y1',
            position: 'right',
            ticks: { fontColor: '#627EEA', fontSize: 11 },
            gridLines: { drawOnChartArea: false },
          },
        ],
      },
    },
  };

  const url = `${QC}?c=${encodeURIComponent(JSON.stringify(cfg))}&w=700&h=360&bkg=%230d1520`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`QuickChart ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

// Fetch a PNG share-card: a 24h % change bar per coin, green/red colored.
// Meant for the daily admin DM (paired with the tweet text), not the channel post.
export const buildDailyCard = async (prices, { date } = {}) => {
  const cfg = {
    type: 'bar',
    data: {
      labels: prices.map((p) => p.label),
      datasets: [{
        label: '24h %',
        data: prices.map((p) => p.change24h ?? 0),
        backgroundColor: prices.map((p) => (p.change24h >= 0 ? '#1fae6c' : '#e0455f')),
      }],
    },
    options: {
      title: {
        display: true,
        text: `ZroCrypto — 24ժ փոփոխություն (${date || ''})`,
        fontColor: '#c8d0e0',
        fontSize: 16,
      },
      legend: { display: false },
      scales: {
        xAxes: [{
          ticks: { fontColor: '#c8d0e0', fontSize: 13 },
          gridLines: { color: 'rgba(255,255,255,0.06)' },
        }],
        yAxes: [{
          ticks: { fontColor: '#8899aa', fontSize: 11 },
          gridLines: { color: 'rgba(255,255,255,0.06)' },
        }],
      },
    },
  };

  const url = `${QC}?c=${encodeURIComponent(JSON.stringify(cfg))}&w=600&h=400&bkg=%230d1520`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`QuickChart ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};
