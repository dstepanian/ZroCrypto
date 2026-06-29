import config from './config.js';

const endpoint = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

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
5. "overview" = ONE or TWO sentences in Armenian capturing the OVERALL picture / mood of
   the day across all the items (the big theme, not a single story). Neutral, editorial tone.

Return ONLY JSON matching the schema. No markdown, no commentary.

Raw items:
${rawItems.map((it, n) => `${n + 1}. ${it.title}: ${it.text}`).join('\n')}
`.trim();

const responseSchema = {
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
        },
        required: ['headline', 'summary'],
      },
    },
  },
  required: ['overview', 'items'],
};

// Calls Gemini Flash. Returns { items: [{ headline, summary }] }.
// Throws on failure so the caller can decide on a price-only fallback.
export const curate = async (rawItems) => {
  if (!config.geminiKey) throw new Error('GEMINI_API_KEY missing');
  if (!rawItems.length) return { items: [] };

  const body = {
    contents: [
      { role: 'user', parts: [{ text: buildPrompt(rawItems, config.digestMin, config.digestMax) }] },
    ],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema,
    },
  };

  const res = await fetch(endpoint(config.geminiModel, config.geminiKey), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no text');

  const parsed = JSON.parse(text);
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  return { overview: (parsed.overview || '').trim(), items: items.slice(0, config.digestMax) };
};
