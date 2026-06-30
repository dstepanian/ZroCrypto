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
const fmtAmd = (n) => (n >= 10 ? n.toFixed(1) : n.toFixed(2)); // dram: 368.1 vs 4.69
const fmtDram = (n) => Math.round(n).toLocaleString('en-US'); // large dram amounts: 48,128
// Directional change with an arrow instead of a sign, e.g. "↑0.6%" / "↓0.0%".
const fmtArrow = (c) => `${c >= 0 ? '↑' : '↓'}${Math.abs(c).toFixed(1)}%`;

const COIN_EMOJI = { Bitcoin: '🟠', Ethereum: '🔷' };
const coinEmoji = (label) => COIN_EMOJI[label] || '🔹';

// Build the Telegram digest message (HTML parse mode).
// Airy layout: blank lines between blocks, 🔸 markers, bold labels.
export const formatDigest = ({ prices = [], items = [], overview = '', sentiment = null, rates = null, trending = [] }, { date } = {}) => {
  const out = [];

  out.push(`📊 <b>Կրիպտո օրվա ամփոփում — ${date || yerevanDate()}</b>`);
  out.push('');

  // Day overview: mood gauge, then the trending line, then the AI big-picture line.
  if (sentiment) {
    out.push(`🧭 <b>Տրամադրություն՝</b> ${sentiment.dot} ${esc(sentiment.hy)} — ${sentiment.value}/100`);
    out.push('');
  }
  // Compact "trending now" line — most-searched coins with a 24h arrow.
  if (trending.length) {
    const parts = trending.map((t) => {
      const arrow = t.change24h != null ? ` ${fmtArrow(t.change24h)}` : '';
      return `${esc(t.name)} (${esc(t.symbol)})${arrow}`;
    });
    out.push(`🔥 <b>Թրենդում՝</b> ${parts.join(' · ')}`);
    out.push('');
  }
  if (overview) {
    out.push(`🧠 ${esc(overview)}`);
    out.push('');
  }

  // News first...
  if (items.length) {
    out.push('📰 <b>Գլխավոր նորություններ</b>');
    out.push('');
    items.forEach((it) => {
      // Append a subtle link arrow to the original article when we have the URL.
      const src = it.link ? ` <a href="${esc(it.link)}">↗</a>` : '';
      out.push(`🔸 ${esc(it.summary || it.headline)}${src}`);
      out.push(''); // breathing room between stories (and before the prices block)
    });
  }

  // ...prices/rates as a reference block at the bottom.
  const hasRates = rates && (rates.fiat?.length || rates.metals?.length);
  if (prices.length || hasRates) {
    out.push('💱 <b>Փոխարժեքներ</b>');
    prices.forEach((p) => {
      out.push(`${coinEmoji(p.label)} <b>${esc(p.label)}</b> — ${fmtPrice(p.price)} (${fmtArrow(p.change24h)})`);
    });
    (rates?.fiat || []).forEach((f) => {
      out.push(`${f.flag} <b>${esc(f.code)}</b> — ${fmtAmd(f.amd)} ֏`);
    });
    (rates?.metals || []).forEach((m) => {
      const val = m.amdPerGram != null
        ? `${fmtDram(m.amdPerGram)} ֏<i>/գ</i>`
        : `${fmtPrice(m.usdPerOz)} <i>/ունց</i>`;
      out.push(`${m.emoji} <b>${esc(m.label)}</b> — ${val}`);
    });
    out.push('');
  }

  out.push('➖➖➖➖➖➖➖➖➖➖');
  const handle = config.channelHandle ? `  |  ${esc(config.channelHandle)}` : '';
  out.push(`⚡ <b>${esc(config.siteUrl)}</b>${handle}`);

  return out.join('\n');
};

// Today's date in English, e.g. "July 1" (Yerevan calendar day).
export const englishDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Yerevan', month: 'long', day: 'numeric' }).format(d);

// X (Twitter) hard character cap.
const TWEET_LIMIT = 280;

// Build a short, plain-text, English, X-ready version of the daily digest for manual
// posting. No HTML — X doesn't support it. Hashtags go last so a truncation (rare,
// since this comfortably fits in 280 chars) drops them before anything that matters.
export const formatTweet = ({ prices = [], items = [], sentiment = null }, { date } = {}) => {
  const lines = [];
  lines.push(`📊 Daily Crypto Digest — ${date || englishDate()}`);
  lines.push('');

  if (sentiment) lines.push(`${sentiment.dot} Fear & Greed: ${sentiment.value}/100 (${sentiment.label})`);

  prices.forEach((p) => {
    lines.push(`${coinEmoji(p.label)} ${p.label}: ${fmtPrice(p.price)} (${fmtArrow(p.change24h)})`);
  });
  lines.push('');

  const top = items[0];
  if (top) {
    lines.push(`🔸 ${esc(top.enTitle || top.headline)}`);
    lines.push('');
  }

  const handle = config.channelHandle || (config.channel ? `t.me/${config.channel.replace(/^@/, '')}` : '');
  if (handle) lines.push(`📲 Join: ${handle}`);
  lines.push('#Bitcoin #Crypto #Ethereum');

  let text = lines.join('\n');
  if (text.length > TWEET_LIMIT) text = `${text.slice(0, TWEET_LIMIT - 1)}…`;
  return text;
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
      out.push(`${coinEmoji(label)} <b>${esc(label)}</b>  ${fmtPrice(w.from)} → ${fmtPrice(w.to)} (${fmtArrow(w.pct)})`);
    });
  }

  out.push('');
  out.push('➖➖➖➖➖➖➖➖➖➖');
  const handle = config.channelHandle ? `  |  ${esc(config.channelHandle)}` : '';
  out.push(`⚡ <b>${esc(config.siteUrl)}</b>${handle}`);

  return out.join('\n');
};

export { yerevanDate, yerevanISO };
