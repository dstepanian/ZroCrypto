// Fiat (AMD cross-rates) + precious metals. Both free, no key, CORS-enabled.
const FX_URL = 'https://open.er-api.com/v6/latest/USD';
const metalUrl = (sym) => `https://api.gold-api.com/price/${sym}`;

// Returns { fiat: [{ code, flag, amd }], metals: [{ label, emoji, usd }] }.
// Either list may be empty on failure — the digest still goes out.
const GRAMS_PER_OZT = 31.1034768; // troy ounce -> grams

export const getRates = async () => {
  const out = { fiat: [], metals: [] };
  let amdPerUsd = null;

  // AMD per 1 USD / EUR / RUB (base is USD, so cross-divide for the others).
  try {
    const r = await (await fetch(FX_URL, { headers: { accept: 'application/json' } })).json();
    if (r.result === 'success' && r.rates?.AMD) {
      amdPerUsd = r.rates.AMD;
      const per = (code) => (r.rates[code] ? amdPerUsd / r.rates[code] : null);
      out.fiat = [
        { code: 'USD', flag: '🇺🇸', amd: amdPerUsd },
        { code: 'EUR', flag: '🇪🇺', amd: per('EUR') },
        { code: 'RUB', flag: '🇷🇺', amd: per('RUB') },
      ].filter((x) => x.amd != null);
    }
  } catch (e) {
    console.error('FX error:', e.message);
  }

  // Spot gold/silver: API gives USD per troy ounce -> convert to AMD per gram.
  // If the FX rate is missing, fall back to the raw USD/oz figure.
  try {
    const [xau, xag] = await Promise.all([
      fetch(metalUrl('XAU')).then((r) => r.json()),
      fetch(metalUrl('XAG')).then((r) => r.json()),
    ]);
    const toMetal = (label, emoji, data) => {
      if (!data?.price) return null;
      if (amdPerUsd) return { label, emoji, amdPerGram: (data.price / GRAMS_PER_OZT) * amdPerUsd };
      return { label, emoji, usdPerOz: data.price };
    };
    [toMetal('Ոսկի', '🥇', xau), toMetal('Արծաթ', '🥈', xag)]
      .forEach((m) => m && out.metals.push(m));
  } catch (e) {
    console.error('Metals error:', e.message);
  }

  return out;
};
