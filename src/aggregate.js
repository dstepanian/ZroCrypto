import { fetchFeeds } from './fetchRss.js';
import { FEEDS } from './feeds.js';

const stripHtml = (s = '') =>
  s.replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const WINDOW_MS = 24 * 60 * 60 * 1000;

// Best-effort lead image for an RSS item: enclosure, then media:content/thumbnail,
// then the first <img> found in the raw HTML content. Empty string if none found.
const extractImage = (item) => {
  if (item.enclosure?.url && (!item.enclosure.type || /^image\//.test(item.enclosure.type))) {
    return item.enclosure.url;
  }
  const fromMedia = (field) => {
    const v = item[field];
    const entry = Array.isArray(v) ? v[0] : v;
    return entry?.$?.url || entry?.url || '';
  };
  const media = fromMedia('mediaContent') || fromMedia('mediaThumbnail');
  if (media) return media;
  const html = item.content || item['content:encoded'] || '';
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return match ? match[1] : '';
};

// Pull all feeds, keep items from the last 24h, dedupe by link, cap the list.
export const aggregate = async ({ windowMs = WINDOW_MS, cap = 40 } = {}) => {
  const feeds = await fetchFeeds(FEEDS);
  const now = Date.now();
  const seen = new Set();
  const items = [];

  for (const feed of feeds) {
    const source = feed.title || '';
    for (const item of feed.items || []) {
      const link = (item.link || '').trim();
      if (!link || seen.has(link)) continue;

      const ts = new Date(item.isoDate || item.pubDate || 0).getTime();
      if (!ts || now - ts > windowMs) continue;

      seen.add(link);
      items.push({
        title: (item.title || '').trim(),
        text: stripHtml(item.contentSnippet || item.content || '').slice(0, 400),
        link,
        source,
        date: ts,
        image: extractImage(item),
      });
    }
  }

  items.sort((a, b) => b.date - a.date);
  return items.slice(0, cap);
};
