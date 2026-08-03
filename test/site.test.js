import test from 'node:test';
import assert from 'node:assert/strict';
import {
  digestLd, digestPath, isPublishable, renderArchive,
  renderDigestPage, renderRobots, renderSitemap,
} from '../src/render.js';

const day = {
  date: '2026-06-30',
  ts: Date.parse('2026-06-30T06:18:19.862Z'),
  fng: { value: 15, label: 'Extreme Fear', hy: 'Ծայրահեղ վախ', dot: '🔴' },
  prices: [
    { label: 'Bitcoin', price: 59258, change24h: -1.24 },
    { label: 'Ethereum', price: 1583.04, change24h: 0.41 },
  ],
  overview: 'Շուկան օրը փակեց անկումով։',
  items: [{
    headline: 'BlackRock-ի ETF-ը գրանցեց ռեկորդ',
    summary: 'BlackRock-ի Bitcoin ETF-ը մեկ օրում ներգրավեց 1 մլրդ դոլար։',
    link: 'https://example.com/etf',
    source: 'CoinDesk',
  }],
};

test('only days with editorial content become pages', () => {
  assert.equal(isPublishable(day), true);
  // A curation failure posts prices only — that day stays off the site.
  assert.equal(isPublishable({ ...day, overview: '', items: [] }), false);
  assert.equal(isPublishable({ date: '2026-06-29', overview: 'Հանգիստ օր։', items: [] }), true);
  assert.equal(isPublishable(undefined), false);
});

test('NewsArticle carries what Google needs to date and attribute the page', () => {
  const ld = digestLd(day);
  assert.equal(ld['@type'], 'NewsArticle');
  assert.equal(ld.inLanguage, 'hy-AM');
  assert.equal(ld.datePublished, '2026-06-30T06:18:19.862Z');
  assert.equal(ld.publisher.name, 'ZroCrypto');
  assert.match(ld.url, /\/digest\/2026-06-30\.html$/);
  assert.equal(ld.mainEntityOfPage['@id'], ld.url);
  assert.equal(ld.about[0].name, day.items[0].headline);

  // A day with no ts still dates itself from the Yerevan calendar key.
  assert.equal(digestLd({ ...day, ts: undefined }).datePublished, '2026-06-30T06:00:00.000Z');
});

test('the day page is crawlable without running JavaScript', () => {
  const html = renderDigestPage(day, { prev: { date: '2026-06-29' } });
  assert.match(html, /<html lang="hy">/);
  assert.match(html, /Bitcoin/);
  assert.match(html, /BlackRock-ի Bitcoin ETF-ը/);
  assert.match(html, /2026-06-29\.html/, 'neighbouring days are linked');
  assert.match(html, /rel="canonical" href="[^"]+\/digest\/2026-06-30\.html"/);
  assert.match(html, /<meta property="og:url"/);
});

test('quotes in curated text cannot break out of an attribute or the JSON-LD', () => {
  const nasty = { ...day, overview: 'Ասաց՝ "buy" <script>alert(1)</script> </script>' };
  const html = renderDigestPage(nasty);
  const embedded = html.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/)[1];

  assert.doesNotMatch(embedded, /</, 'no raw < survives into the JSON-LD block');
  assert.equal(JSON.parse(embedded).description, nasty.overview.slice(0, 155));
  assert.match(html, /content="[^"]*&quot;buy&quot;/, 'meta description keeps its quoting');
  assert.doesNotMatch(html, /<script>alert/);
});

test('sitemap covers the home page, the archive and every day', () => {
  const xml = renderSitemap([day]);
  assert.match(xml, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  assert.equal([...xml.matchAll(/<loc>/g)].length, 3);
  assert.match(xml, /<lastmod>2026-06-30<\/lastmod>/);

  // Before the first digest lands there is nothing but the landing page.
  assert.equal([...renderSitemap([]).matchAll(/<loc>/g)].length, 1);
});

test('robots points crawlers at the sitemap', () => {
  assert.match(renderRobots(), /^Sitemap: https?:\/\/\S+\/sitemap\.xml$/m);
});

test('the archive lists every day and declares them as an ItemList', () => {
  const html = renderArchive([day, { ...day, date: '2026-06-29' }]);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/)[1]);
  assert.equal(ld['@type'], 'CollectionPage');
  assert.equal(ld.mainEntity.itemListElement.length, 2);
  assert.equal(ld.mainEntity.itemListElement[0].position, 1);
  assert.match(html, /2026-06-29\.html/);
});

test('digest paths are date-based and stable', () => {
  assert.equal(digestPath(day), 'digest/2026-06-30.html');
});
