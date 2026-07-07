// CoinGecko markets — top coins by market cap with their 24h change. We derive
// the day's biggest gainer and loser from the top `per_page` coins (top-50 by
// market cap) to keep movers recognizable and avoid microcap pump-and-dumps.
const URL =
  'https://api.coingecko.com/api/v3/coins/markets' +
  '?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h';

// Returns { topGainer, topLoser } (each { name, symbol, change24h }) or null on
// failure, so the digest still goes out without a movers line.
export const getMovers = async () => {
  try {
    const res = await fetch(URL, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`CoinGecko markets ${res.status}`);
    const data = await res.json();
    const coins = (data || [])
      .filter((c) => typeof c.price_change_percentage_24h === 'number')
      .map((c) => ({
        name: c.name,
        symbol: c.symbol?.toUpperCase(),
        change24h: c.price_change_percentage_24h,
      }))
      .filter((c) => c.symbol);
    if (!coins.length) return null;
    const sorted = [...coins].sort((a, b) => b.change24h - a.change24h);
    return { topGainer: sorted[0], topLoser: sorted[sorted.length - 1] };
  } catch (e) {
    console.error('Movers error:', e.message);
    return null;
  }
};
