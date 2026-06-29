// CoinGecko free API — no key, browser-and-server friendly.
const URL =
  'https://api.coingecko.com/api/v3/simple/price' +
  '?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';

const COINS = [
  { id: 'bitcoin', label: 'Bitcoin' },
  { id: 'ethereum', label: 'Ethereum' },
];

// Returns [{ label, price, change24h }]. Empty array if the call fails
// so the digest can still go out (news-only) instead of going silent.
export const getPrices = async () => {
  try {
    const res = await fetch(URL, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json();
    return COINS.map(({ id, label }) => ({
      label,
      price: data[id]?.usd ?? null,
      change24h: data[id]?.usd_24h_change ?? null,
    })).filter((c) => c.price != null);
  } catch (e) {
    console.error('Price error:', e.message);
    return [];
  }
};
