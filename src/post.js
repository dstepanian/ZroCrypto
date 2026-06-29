import config from './config.js';

// Post the digest to the Telegram channel via the Bot API (no deps).
export const postToTelegram = async (text) => {
  if (!config.token || !config.channel) {
    throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL missing');
  }

  const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.channel,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram error: ${data.description}`);
  return data.result;
};
