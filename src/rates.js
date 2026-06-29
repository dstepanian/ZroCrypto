// Fiat (AMD cross-rates) + precious metals. Both free, no key, CORS-enabled.
const FX_URL = 'https://open.er-api.com/v6/latest/USD';
const metalUrl = (sym) => `https://api.gold-api.com/price/${sym}`;

// Returns { fiat: [{ code, flag, amd }], metals: [{ label, emoji, usd }] }.
// Either list may be empty on failure — the digest still goes out.
export const getRates = async () => {
  const out = { fiat: [], metals: [] };

  // AMD per 1 USD / EUR / RUB (base is USD, so cross-divide for the others).
  try {
    const r = await (await fetch(FX_URL, { headers: { accept: 'application/json' } })).json();
    if (r.result === 'success' && r.rates?.AMD) {
      const amd = r.rates.AMD;
      const per = (code) => (r.rates[code] ? amd / r.rates[code] : null);
      out.fiat = [
        { code: 'USD', flag: '🇺🇸', amd },
        { code: 'EUR', flag: '🇪🇺', amd: per('EUR') },
        { code: 'RUB', flag: '🇷🇺', amd: per('RUB') },
      ].filter((x) => x.amd != null);
    }
  } catch (e) {
    console.error('FX error:', e.message);
  }

  // Spot gold/silver in USD per troy ounce.
  try {
    const [xau, xag] = await Promise.all([
      fetch(metalUrl('XAU')).then((r) => r.json()),
      fetch(metalUrl('XAG')).then((r) => r.json()),
    ]);
    if (xau?.price) out.metals.push({ label: 'Ոսկի', emoji: '🥇', usd: xau.price });
    if (xag?.price) out.metals.push({ label: 'Արծաթ', emoji: '🥈', usd: xag.price });
  } catch (e) {
    console.error('Metals error:', e.message);
  }

  return out;
};
