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

export { yerevanDate };
