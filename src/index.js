import config from './config.js';
import { aggregate } from './aggregate.js';
import { getPrices } from './prices.js';
import { getSentiment } from './sentiment.js';
import { getRates } from './rates.js';
import { getTrending } from './trending.js';
import { curate } from './curate.js';
import { formatDigest, formatTweet, yerevanISO, englishDate } from './format.js';
import { postToTelegram, postPhotoToTelegram, postPhotoUrlToTelegram } from './post.js';
import { buildDailyCard } from './chart.js';
import { appendHistory } from './history.js';

const run = async () => {
  console.log(`[zrocrypto] starting${config.dry ? ' (dry run)' : ''}`);

  // Prices, raw news, market sentiment, fiat/metal rates and trending coins in parallel.
  const [prices, raw, sentiment, rates, trending] = await Promise.all([
    getPrices(), aggregate(), getSentiment(), getRates(), getTrending(),
  ]);
  console.log(`[zrocrypto] ${prices.length} prices, ${raw.length} raw news items` +
    (sentiment ? `, F&G ${sentiment.value}` : '') +
    `, ${rates.fiat.length} fiat, ${rates.metals.length} metals, ${trending.length} trending`);

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

  const text = formatDigest({ prices, items, overview, sentiment, rates, trending });
  const tweet = formatTweet({ prices, items, sentiment });

  if (config.dry) {
    if (config.print) {
      console.log('\n----- DIGEST PREVIEW -----\n');
      console.log(text.replace(/<\/?[bi]>/g, ''));
      console.log('\n----- TWEET PREVIEW -----\n');
      console.log(tweet);
      console.log('\n--------------------------\n');
    }
    console.log('[zrocrypto] dry run — not posting');
    return;
  }

  const result = await postToTelegram(text);
  console.log(`[zrocrypto] posted message ${result.message_id} to ${config.channel}`);

  // DM the admin a ready-to-paste tweet + image, so X posting stays a manual,
  // human-voiced action (auto-posting to X needs paid API tiers; this doesn't).
  // Prefer a real lead image from the top story; fall back to a generated chart,
  // then to text-only if both fail.
  if (config.adminChatId) {
    try {
      const newsImage = items.find((it) => it.image)?.image || '';
      let sent = false;

      if (newsImage) {
        try {
          await postPhotoUrlToTelegram(newsImage, tweet, config.adminChatId);
          sent = true;
        } catch (e) {
          console.warn('[zrocrypto] news image send failed, falling back to chart:', e.message);
        }
      }

      if (!sent) {
        let card = null;
        try {
          card = await buildDailyCard(prices, { date: englishDate() });
        } catch (e) {
          console.warn('[zrocrypto] daily card skipped:', e.message);
        }
        if (card) await postPhotoToTelegram(card, tweet, config.adminChatId);
        else await postToTelegram(tweet, config.adminChatId);
      }
      console.log('[zrocrypto] sent tweet draft to admin chat');
    } catch (e) {
      console.warn('[zrocrypto] admin DM failed:', e.message);
    }
  }

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
