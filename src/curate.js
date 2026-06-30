import config from './config.js';
import { generateJson } from './gemini.js';

const buildPrompt = (rawItems, min, max) => `
You are a crypto news editor for an Armenian-speaking audience.
Below are ${rawItems.length} raw news items from the last 24 hours.

Your job:
1. Pick the ${min}-${max} most important / market-moving items. Ignore pure price
   noise, low-quality posts, ads, opinion fluff, and near-duplicate stories.
2. Write each as ONE clear, neutral sentence in fluent Armenian (Eastern Armenian).
3. Keep crypto tickers, company names and product names in their original form
   (e.g. Bitcoin, ETF, SEC, BlackRock, Solana) — do not transliterate them.
4. "headline" = a short Armenian title (max ~7 words). "summary" = one Armenian sentence.
5. "source" = the NUMBER of the raw item (from the numbered list below) this story is based on.
   This is required so we can link back to the original article.
6. "overview" = ONE or TWO sentences in Armenian capturing the OVERALL picture / mood of
   the day across all the items (the big theme, not a single story). Neutral, editorial tone.

Return ONLY JSON matching the schema. No markdown, no commentary.

Raw items:
${rawItems.map((it, n) => `${n + 1}. ${it.title}: ${it.text}`).join('\n')}
`.trim();

const dailySchema = {
  type: 'object',
  properties: {
    overview: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          summary: { type: 'string' },
          source: { type: 'integer' },
        },
        required: ['headline', 'summary', 'source'],
      },
    },
  },
  required: ['overview', 'items'],
};

// Daily digest. Returns { overview, items: [{ headline, summary }] }.
// Throws on failure so the caller can decide on a price-only fallback.
export const curate = async (rawItems) => {
  if (!rawItems.length) return { overview: '', items: [] };
  const parsed = await generateJson(buildPrompt(rawItems, config.digestMin, config.digestMax), dailySchema);
  const items = (Array.isArray(parsed.items) ? parsed.items : [])
    .slice(0, config.digestMax)
    .map(({ headline, summary, source }) => {
      // Gemini returns a 1-based index into the numbered raw list; map it to the article.
      const raw = rawItems[source - 1];
      return { headline, summary, link: raw?.link || '', source: raw?.source || '' };
    });
  return { overview: (parsed.overview || '').trim(), items };
};

const buildWeeklyPrompt = (days) => `
You are a crypto news editor for an Armenian-speaking audience writing a WEEKLY recap.
Below are daily summaries from the past ${days.length} days (oldest first). Each day has its
market mood (Fear & Greed value), the day's overview, and the day's headlines.

Your job:
1. "overview" = 2-3 sentences in fluent Eastern Armenian capturing the week's big arc —
   the dominant themes and how the mood/market evolved across the week.
2. "highlights" = the 4-6 most important developments of the WEEK as single Armenian
   sentences. Deduplicate stories that repeated across days, and focus on what mattered for
   the whole week rather than one-off daily noise. Keep tickers/company names original.

Return ONLY JSON matching the schema. No markdown, no commentary.

Daily data:
${days.map((d) => `## ${d.date} (Fear&Greed ${d.fng?.value ?? 'n/a'})
Overview: ${d.overview || '—'}
Headlines:
${(d.items || []).map((i) => `- ${i.headline}: ${i.summary}`).join('\n')}`).join('\n\n')}
`.trim();

const weeklySchema = {
  type: 'object',
  properties: {
    overview: { type: 'string' },
    highlights: { type: 'array', items: { type: 'string' } },
  },
  required: ['overview', 'highlights'],
};

// Weekly recap. Returns { overview, highlights: [string] }.
export const curateWeekly = async (days) => {
  const parsed = await generateJson(buildWeeklyPrompt(days), weeklySchema);
  const highlights = Array.isArray(parsed.highlights) ? parsed.highlights : [];
  return { overview: (parsed.overview || '').trim(), highlights: highlights.slice(0, 6) };
};
