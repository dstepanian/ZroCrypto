// CoinGecko free "trending" endpoint — the most-searched coins right now.
// More editorial than raw % movers (which are usually tiny pump-and-dumps).
const URL = 'https://api.coingecko.com/api/v3/search/trending';

// Returns [{ name, symbol, change24h, link }] for the top trending coins.
// `link` points at the coin's CoinGecko page. Empty array on failure so the
// digest still goes out.
export const getTrending = async (limit = 3) => {
  try {
    const res = await fetch(URL, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`CoinGecko trending ${res.status}`);
    const data = await res.json();
    return (data.coins || [])
      .slice(0, limit)
      .map((c) => ({
        name: c.item?.name,
        symbol: c.item?.symbol?.toUpperCase(),
        change24h: c.item?.data?.price_change_percentage_24h?.usd ?? null,
        link: c.item?.id ? `https://www.coingecko.com/en/coins/${c.item.id}` : null,
      }))
      .filter((c) => c.name && c.symbol);
  } catch (e) {
    console.error('Trending error:', e.message);
    return [];
  }
};
