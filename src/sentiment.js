// Crypto Fear & Greed Index — alternative.me, free, no key, CORS-enabled.
const URL = 'https://api.alternative.me/fng/?limit=1';

// English classification -> Armenian label + dot emoji by mood.
const MAP = {
  'Extreme Fear': { hy: 'Ծայրահեղ վախ', dot: '🔴' },
  'Fear': { hy: 'Վախ', dot: '🟠' },
  'Neutral': { hy: 'Չեզոք', dot: '🟡' },
  'Greed': { hy: 'Ագահություն', dot: '🟢' },
  'Extreme Greed': { hy: 'Ծայրահեղ ագահություն', dot: '🟢' },
};

// Returns { value, label, hy, dot } or null on failure (digest still goes out).
export const getSentiment = async () => {
  try {
    const res = await fetch(URL, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`FNG ${res.status}`);
    const d = await res.json();
    const row = d?.data?.[0];
    if (!row) return null;
    const label = row.value_classification;
    const m = MAP[label] || { hy: label, dot: '⚪' };
    return { value: Number(row.value), label, hy: m.hy, dot: m.dot };
  } catch (e) {
    console.error('Sentiment error:', e.message);
    return null;
  }
};
