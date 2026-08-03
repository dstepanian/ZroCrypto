import config from './config.js';
import { esc, hyDate } from './format.js';

// Telegram pages are a dead end for search — t.me/zrocry can't rank for
// "կրիպտո նորություններ". So every day we post also becomes a static HTML page
// here: no client-side rendering, everything a crawler needs in the markup.

export const digestPath = (entry) => `digest/${entry.date}.html`;
const absolute = (p) => `${config.siteBaseUrl.replace(/\/$/, '')}/${p}`;

// og:image has to be an absolute URL, and crawlers that reject SVG are common
// enough that the share card uses the raster avatar instead.
const OG_IMAGE = 'assets/telegram-profile/zrocrypto-avatar-01-monogram.png';

// esc() is enough for text nodes; attributes also have to survive a quote.
const attr = (s = '') => esc(s).replace(/"/g, '&quot;');

// A day is worth a page only if it carries editorial text. A prices-only
// fallback day (curation failed) would be thin, duplicate-looking content.
export const isPublishable = (entry) =>
  Boolean(entry?.date && (entry.overview || (entry.items || []).length));

const channelUrl = () => {
  const handle = (config.channelHandle || '').replace('@', '') || 'zrocry';
  return `https://t.me/${handle}`;
};

const ORG = {
  '@type': 'Organization',
  name: 'ZroCrypto',
  url: absolute(''),
  sameAs: [channelUrl()],
};

const summarize = (entry) => {
  const text = entry.overview
    || (entry.items || []).map((i) => i.summary || i.headline).join(' ');
  return text.replace(/\s+/g, ' ').slice(0, 155);
};

const pageTitle = (entry) => `Կրիպտո նորություններ հայերեն — ${hyDate(entry.date)}`;

// https://developers.google.com/search/docs/appearance/structured-data/article
export const digestLd = (entry) => ({
  '@context': 'https://schema.org',
  '@type': 'NewsArticle',
  headline: pageTitle(entry),
  description: summarize(entry),
  inLanguage: 'hy-AM',
  articleSection: 'Cryptocurrency',
  // ts is the moment the digest was actually posted; the date key is Yerevan-local.
  datePublished: new Date(entry.ts || `${entry.date}T10:00:00+04:00`).toISOString(),
  dateModified: new Date(entry.ts || `${entry.date}T10:00:00+04:00`).toISOString(),
  url: absolute(digestPath(entry)),
  mainEntityOfPage: { '@type': 'WebPage', '@id': absolute(digestPath(entry)) },
  author: ORG,
  publisher: ORG,
  ...((entry.items || []).length
    ? { about: entry.items.map((i) => ({ '@type': 'Thing', name: i.headline })) }
    : {}),
});

// JSON-LD sits inside <script>, where the HTML tokenizer still reads script
// data: a stray "</script>" ends the block and a "<script" can flip it into the
// escaped state. < is valid JSON and takes both out of curated text.
const ld = (data) => JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
export const ldScript = (data) => `<script type="application/ld+json">\n${ld(data)}\n</script>`;

// Shared <head> for every generated page. Kept in one place so canonical, OG and
// the verification token can't drift between the archive and a day page.
export const head = ({ title, description, canonical, extra = '' }) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${attr(title)} | ZroCrypto</title>
<meta name="description" content="${attr(description)}">
<link rel="canonical" href="${attr(canonical)}">
${config.googleVerification ? `<meta name="google-site-verification" content="${attr(config.googleVerification)}">\n` : ''}<meta property="og:site_name" content="ZroCrypto">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:url" content="${attr(canonical)}">
<meta property="og:image" content="${attr(absolute(OG_IMAGE))}">
<meta property="og:type" content="article">
<meta property="og:locale" content="hy_AM">
<meta name="twitter:card" content="summary">
${extra}`;

const STYLE = `<style>
:root { color-scheme: dark; --bg: #0b0e14; --panel: #131826; --line: #232a3d;
  --fg: #e7ecf5; --muted: #8b97b0; --accent: #4f8cff; --green: #2ecc71; --red: #ff5b6e; }
* { box-sizing: border-box; }
body { margin: 0 auto; padding: 2rem 1.25rem 4rem; max-width: 46rem; background: var(--bg); color: var(--fg);
  font: 1rem/1.65 -apple-system, "Segoe UI", system-ui, "Noto Sans Armenian", sans-serif; }
a { color: var(--accent); }
header { display: flex; align-items: center; gap: .6rem; border-bottom: 1px solid var(--line);
  padding-bottom: 1rem; margin-bottom: 1.75rem; }
header a { font-weight: 700; font-size: 1.1rem; color: var(--fg); text-decoration: none; }
h1 { font-size: 1.65rem; line-height: 1.3; margin: 0 0 .3rem; }
.date { color: var(--muted); margin: 0 0 1.75rem; }
.overview { background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
  padding: 1rem 1.15rem; margin: 0 0 1.75rem; }
h2 { font-size: 1.1rem; margin: 2rem 0 1rem; }
article { border-bottom: 1px solid var(--line); padding-bottom: 1.1rem; margin-bottom: 1.1rem; }
article h3 { font-size: 1.05rem; margin: 0 0 .35rem; }
article p { margin: 0 0 .4rem; }
article .src { color: var(--muted); font-size: .85rem; }
table { width: 100%; border-collapse: collapse; margin: 0 0 1.5rem; }
td { border-bottom: 1px solid var(--line); padding: .55rem 0; }
td:last-child { text-align: right; }
.up { color: var(--green); } .down { color: var(--red); }
ul.days { list-style: none; padding: 0; margin: 0; }
ul.days li { border-bottom: 1px solid var(--line); padding: .9rem 0; }
ul.days a { font-weight: 600; text-decoration: none; }
ul.days p { margin: .2rem 0 0; color: var(--muted); font-size: .92rem; }
nav.pager { display: flex; justify-content: space-between; gap: 1rem; margin-top: 2rem; }
footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--line);
  color: var(--muted); font-size: .9rem; }
</style>`;

const layout = ({ title, description, canonical, extra = '', root = '../', body }) => `<!doctype html>
<html lang="hy">
<head>
${head({ title, description, canonical, extra })}
<link rel="icon" type="image/svg+xml" href="${root}avatar.svg">
${STYLE}
</head>
<body>
<header>
<img src="${root}avatar.svg" alt="" width="32" height="32">
<a href="${root}">ZroCrypto — կրիպտո նորություններ հայերեն</a>
</header>
${body}
<footer>
<p>Ամեն օր երկու անգամ՝ Telegram-ում՝ <a href="${attr(channelUrl())}">${esc(config.channelHandle || '@zrocry')}</a> ·
<a href="${root}digest/">Բոլոր օրերը</a></p>
<p>Նյութը տեղեկատվական է և ներդրումային խորհրդատվություն չէ։</p>
</footer>
</body>
</html>
`;

const fmtPrice = (n) => '$' + Math.round(n).toLocaleString('en-US');
const fmtChange = (c) => `${c >= 0 ? '↑' : '↓'}${Math.abs(c).toFixed(1)}%`;

const priceTable = (prices = []) => (prices.length ? `<h2>Փոխարժեքներ</h2>
<table>
${prices.map((p) => `<tr><td>${esc(p.label)}</td><td>${fmtPrice(p.price)} ` +
  `<span class="${p.change24h >= 0 ? 'up' : 'down'}">${fmtChange(p.change24h)}</span></td></tr>`).join('\n')}
</table>` : '');

const newsList = (items = []) => (items.length ? `<h2>Օրվա գլխավոր նորությունները</h2>
${items.map((it) => `<article>
<h3>${esc(it.headline || '')}</h3>
<p>${esc(it.summary || '')}</p>
${it.link ? `<p class="src"><a href="${attr(it.link)}" rel="noopener nofollow" target="_blank">${esc(it.source || 'աղբյուրը')} ↗</a></p>` : ''}
</article>`).join('\n')}` : '');

// prev/next are the neighbouring days, so a crawler can walk the whole archive
// from any single page it happens to land on.
export const renderDigestPage = (entry, { prev, next } = {}) => layout({
  title: pageTitle(entry),
  description: summarize(entry),
  canonical: absolute(digestPath(entry)),
  extra: ldScript(digestLd(entry)),
  body: `
<h1>Կրիպտո օրվա ամփոփում</h1>
<p class="date"><time datetime="${attr(entry.date)}">${esc(hyDate(entry.date))}</time>${
  entry.fng ? ` · Տրամադրություն՝ ${esc(entry.fng.hy)} (${entry.fng.value}/100)` : ''
}</p>
${entry.overview ? `<p class="overview">${esc(entry.overview)}</p>` : ''}
${newsList(entry.items)}
${priceTable(entry.prices)}
<nav class="pager">
<span>${prev ? `<a href="${esc(prev.date)}.html">← ${esc(hyDate(prev.date))}</a>` : ''}</span>
<span>${next ? `<a href="${esc(next.date)}.html">${esc(hyDate(next.date))} →</a>` : ''}</span>
</nav>`,
});

export const renderArchive = (entries) => layout({
  title: 'Կրիպտո նորությունների արխիվ հայերեն',
  description: `${entries.length} օրվա կրիպտո ամփոփում հայերեն՝ Bitcoin, Ethereum, շուկայի տրամադրություն և գլխավոր նորությունները։`,
  canonical: absolute('digest/'),
  extra: ldScript({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'ZroCrypto — օրական ամփոփումների արխիվ',
    inLanguage: 'hy-AM',
    url: absolute('digest/'),
    isPartOf: { '@type': 'WebSite', name: 'ZroCrypto', url: absolute('') },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: entries.map((entry, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: absolute(digestPath(entry)),
        name: pageTitle(entry),
      })),
    },
  }),
  body: `
<h1>Օրական ամփոփումների արխիվ</h1>
<p class="date">${entries.length} օր</p>
<ul class="days">
${entries.map((entry) => `<li>
  <a href="${esc(entry.date)}.html">${esc(hyDate(entry.date))}</a>
  <p>${esc(summarize(entry).slice(0, 120))}</p>
</li>`).join('\n')}
</ul>`,
});

// Injected into the hand-written landing page at build time, where the base URL
// is finally known. Placeholders live in web/index.html.
export const homeSeo = () => [
  `<link rel="canonical" href="${attr(absolute(''))}">`,
  `<meta property="og:url" content="${attr(absolute(''))}">`,
  `<meta property="og:image" content="${attr(absolute(OG_IMAGE))}">`,
  config.googleVerification
    ? `<meta name="google-site-verification" content="${attr(config.googleVerification)}">`
    : '',
  ldScript({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ZroCrypto',
    alternateName: 'ZroCrypto — կրիպտո նորություններ հայերեն',
    inLanguage: 'hy-AM',
    url: absolute(''),
    publisher: ORG,
  }),
].filter(Boolean).join('\n');

export const homeArchiveLink = (entries) => (entries.length ? `<p class="cta">
  <a href="digest/">🗂 Օրական ամփոփումների արխիվ (${entries.length} օր) →</a>
</p>` : '');

export const renderSitemap = (entries) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
    { loc: absolute(''), lastmod: entries[0]?.date },
    ...(entries.length ? [{ loc: absolute('digest/'), lastmod: entries[0].date }] : []),
    ...entries.map((e) => ({ loc: absolute(digestPath(e)), lastmod: e.date })),
  ]
    .map(({ loc, lastmod }) =>
      `  <url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
    .join('\n')}
</urlset>
`;

export const renderRobots = () => `User-agent: *
Allow: /

Sitemap: ${absolute('sitemap.xml')}
`;
