import config from './config.js';
import { lastNDays } from './history.js';
import { curateWeekly } from './curate.js';
import { formatWeekly } from './format.js';
import { postToTelegram, postPhotoToTelegram } from './post.js';
import { buildWeeklyChart } from './chart.js';

// Telegram caps photo captions at 1024 characters.
const CAPTION_LIMIT = 1024;

const run = async () => {
  console.log(`[weekly] starting${config.dry ? ' (dry run)' : ''}`);

  const history = lastNDays(7);
  if (history.length < 2) {
    console.log(`[weekly] only ${history.length} day(s) of history — skipping until there's more`);
    return;
  }
  console.log(`[weekly] summarizing ${history.length} day(s): ${history[0].date} … ${history[history.length - 1].date}`);

  const summary = await curateWeekly(history);
  console.log(`[weekly] ${summary.highlights.length} highlights`);

  const text = formatWeekly(history, summary);

  if (config.dry) {
    if (config.print) {
      console.log('\n----- WEEKLY PREVIEW -----\n');
      console.log(text.replace(/<\/?b>|<\/?i>/g, ''));
      console.log('\n--------------------------\n');
    }
    console.log('[weekly] dry run — not posting');
    return;
  }

  // Try to generate a price chart; degrade gracefully if QuickChart is unavailable.
  let chart = null;
  try {
    chart = await buildWeeklyChart(history);
    console.log(`[weekly] chart generated (${chart.length} bytes)`);
  } catch (e) {
    console.warn('[weekly] chart skipped:', e.message);
  }

  if (chart) {
    if (text.length <= CAPTION_LIMIT) {
      // Everything fits in one photo+caption message.
      const result = await postPhotoToTelegram(chart, text);
      console.log(`[weekly] posted photo+caption as message ${result.message_id} to ${config.channel}`);
    } else {
      // Caption would be truncated — post photo first, then the full text.
      await postPhotoToTelegram(chart, '📊 ZroCrypto — Շաբաթի գնային գծապատկեր');
      const result = await postToTelegram(text);
      console.log(`[weekly] posted chart + text (${result.message_id}) to ${config.channel}`);
    }
  } else {
    const result = await postToTelegram(text);
    console.log(`[weekly] posted message ${result.message_id} to ${config.channel}`);
  }
};

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[weekly] fatal:', e);
    process.exit(1);
  });
