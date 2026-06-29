import config from './config.js';

const MONTHS_HY = [
  'հունվարի', 'փետրվարի', 'մարտի', 'ապրիլի', 'մայիսի', 'հունիսի',
  'հուլիսի', 'օգոստոսի', 'սեպտեմբերի', 'հոկտեմբերի', 'նոյեմբերի', 'դեկտեմբերի',
];

// Today's date in Yerevan, e.g. "28 հունիսի".
const yerevanDate = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Yerevan', day: 'numeric', month: 'numeric',
  }).formatToParts(d);
  const day = parts.find((p) => p.type === 'day').value;
  const month = Number(parts.find((p) => p.type === 'month').value);
  return `${day} ${MONTHS_HY[month - 1]}`;
};

// Today's calendar date in Yerevan as YYYY-MM-DD (used as the history key).
const yerevanISO = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Yerevan', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

// Armenian date range from two YYYY-MM-DD strings, e.g. "23–29 հունիսի"
// or "28 հունիսի – 4 հուլիսի" across a month boundary.
const yerevanRange = (startISO, endISO) => {
  const [, am, ad] = startISO.split('-').map(Number);
  const [, bm, bd] = endISO.split('-').map(Number);
  if (am === bm) return `${ad}–${bd} ${MONTHS_HY[bm - 1]}`;
  return `${ad} ${MONTHS_HY[am - 1]} – ${bd} ${MONTHS_HY[bm - 1]}`;
};

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmtPrice = (n) => '$' + Math.round(n).toLocaleString('en-US');
const fmtChange = (c) => `${c >= 0 ? '+' : ''}${c.toFixed(1)}%`;

// Build the Telegram digest message (HTML parse mode).
// Airy layout: blank lines between blocks, 🔸 markers, bold labels.
export const formatDigest = ({ prices = [], items = [], overview = '', sentiment = null }, { date } = {}) => {
  const out = [];

  out.push(`📊 <b>Կրիպտո օրվա ամփոփում — ${date || yerevanDate()}</b>`);
  out.push('');

  // Day overview: mood gauge + AI big-picture line.
  if (sentiment) {
    out.push(`🧭 <b>Տրամադրություն՝</b> ${sentiment.dot} ${esc(sentiment.hy)} — ${sentiment.value}/100`);
  }
  if (overview) {
    out.push(`🧠 ${esc(overview)}`);
  }
  if (sentiment || overview) out.push('');

  prices.forEach((p, i) => {
    const dot = p.change24h >= 0 ? '🟢' : '🔴';
    const suffix = i === 0 ? ' <i>վերջին 24 ժ</i>' : '';
    out.push(`${dot} <b>${esc(p.label)}</b>  ${fmtPrice(p.price)}  •  ${fmtChange(p.change24h)}${suffix}`);
  });

  if (items.length) {
    out.push('');
    out.push('📰 <b>Գլխավոր նորություններ</b>');
    out.push('');
    items.forEach((it) => {
      out.push(`🔸 ${esc(it.summary || it.headline)}`);
      out.push(''); // breathing room between stories
    });
    out.pop(); // drop the trailing blank line
  }

  out.push('');
  out.push('➖➖➖➖➖➖➖➖➖➖');
  const handle = config.channelHandle ? `  |  ${esc(config.channelHandle)}` : '';
  out.push(`⚡ <b>${esc(config.siteUrl)}</b>${handle}`);

  return out.join('\n');
};

// Find a coin's first and last recorded price across the week.
const weekChange = (history, label) => {
  const first = history.find((e) => e.prices?.some((p) => p.label === label));
  const last = [...history].reverse().find((e) => e.prices?.some((p) => p.label === label));
  if (!first || !last) return null;
  const a = first.prices.find((p) => p.label === label).price;
  const b = last.prices.find((p) => p.label === label).price;
  return { from: a, to: b, pct: ((b - a) / a) * 100 };
};

// Build the weekly recap message (HTML parse mode).
export const formatWeekly = (history, { overview = '', highlights = [] }) => {
  const out = [];
  const start = history[0]?.date;
  const end = history[history.length - 1]?.date;

  out.push(`📅 <b>Շաբաթվա ամփոփում — ${yerevanRange(start, end)}</b>`);
  out.push('');

  // Mood trend across the week (first vs last day that had a reading).
  const firstFng = history.find((e) => e.fng)?.fng;
  const lastFng = [...history].reverse().find((e) => e.fng)?.fng;
  if (firstFng && lastFng) {
    out.push(`🧭 <b>Տրամադրությունը՝</b> ${firstFng.dot} ${esc(firstFng.hy)} (${firstFng.value}) → ` +
      `${lastFng.dot} ${esc(lastFng.hy)} (${lastFng.value})`);
  }
  if (overview) out.push(`🧠 ${esc(overview)}`);
  if (firstFng || overview) out.push('');

  if (highlights.length) {
    out.push('📌 <b>Շաբաթվա գլխավոր թեմաները</b>');
    out.push('');
    highlights.forEach((h) => {
      out.push(`🔸 ${esc(h)}`);
      out.push('');
    });
    out.pop();
  }

  const moves = ['Bitcoin', 'Ethereum'].map((l) => [l, weekChange(history, l)]).filter(([, w]) => w);
  if (moves.length) {
    out.push('');
    out.push('💰 <b>Շաբաթվա ընթացքում</b>');
    moves.forEach(([label, w]) => {
      const dot = w.pct >= 0 ? '🟢' : '🔴';
      out.push(`${dot} <b>${esc(label)}</b>  ${fmtPrice(w.from)} → ${fmtPrice(w.to)}  •  ${fmtChange(w.pct)}`);
    });
  }

  out.push('');
  out.push('➖➖➖➖➖➖➖➖➖➖');
  const handle = config.channelHandle ? `  |  ${esc(config.channelHandle)}` : '';
  out.push(`⚡ <b>${esc(config.siteUrl)}</b>${handle}`);

  return out.join('\n');
};

export { yerevanDate, yerevanISO };
