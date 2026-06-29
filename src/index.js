import config from './config.js';
import { aggregate } from './aggregate.js';
import { getPrices } from './prices.js';
import { getSentiment } from './sentiment.js';
import { curate } from './curate.js';
import { formatDigest, yerevanISO } from './format.js';
import { postToTelegram } from './post.js';
import { appendHistory } from './history.js';

const run = async () => {
  console.log(`[zrocrypto] starting${config.dry ? ' (dry run)' : ''}`);

  // Prices, raw news and market sentiment in parallel.
  const [prices, raw, sentiment] = await Promise.all([getPrices(), aggregate(), getSentiment()]);
  console.log(`[zrocrypto] ${prices.length} prices, ${raw.length} raw news items` +
    (sentiment ? `, F&G ${sentiment.value}` : ''));

  // Curate via Gemini; on failure, fall back to a price-only digest.
  let items = [];
  let overview = '';
  try {
    ({ items, overview } = await curate(raw));
    console.log(`[zrocrypto] curated ${items.length} items`);
  } catch (e) {
    console.error('[zrocrypto] curation failed, posting prices only:', e.message);
  }

  if (!prices.length && !items.length) {
    console.error('[zrocrypto] nothing to post — aborting');
    process.exit(1);
  }

  const text = formatDigest({ prices, items, overview, sentiment });

  if (config.dry) {
    if (config.print) {
      console.log('\n----- DIGEST PREVIEW -----\n');
      console.log(text.replace(/<\/?[bi]>/g, ''));
      console.log('\n--------------------------\n');
    }
    console.log('[zrocrypto] dry run — not posting');
    return;
  }

  const result = await postToTelegram(text);
  console.log(`[zrocrypto] posted message ${result.message_id} to ${config.channel}`);

  // Record this day's snapshot for the weekly recap (one entry per day).
  const count = appendHistory({
    date: yerevanISO(),
    ts: Date.now(),
    fng: sentiment,
    prices,
    overview,
    items,
  });
  console.log(`[zrocrypto] history now holds ${count} day(s)`);
};

run()
  .then(() => process.exit(0)) // fetch keep-alive sockets would otherwise hang the process
  .catch((e) => {
    console.error('[zrocrypto] fatal:', e);
    process.exit(1);
  });
