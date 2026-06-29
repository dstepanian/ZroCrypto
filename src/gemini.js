import config from './config.js';

const endpoint = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

// Single place that calls Gemini and returns parsed JSON matching responseSchema.
// Throws on failure so callers can fall back.
export const generateJson = async (prompt, responseSchema) => {
  if (!config.geminiKey) throw new Error('GEMINI_API_KEY missing');

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
  return JSON.parse(text);
};
