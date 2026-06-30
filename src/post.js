import config from './config.js';

export const postPhotoToTelegram = async (photoBuffer, caption, chatId = config.channel) => {
  if (!config.token || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN or chat id missing');
  }

  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  form.append('photo', new Blob([photoBuffer], { type: 'image/png' }), 'weekly-chart.png');

  const res = await fetch(`https://api.telegram.org/bot${config.token}/sendPhoto`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram error: ${data.description}`);
  return data.result;
};

// Send a photo by URL (Telegram fetches it server-side — no download needed here).
export const postPhotoUrlToTelegram = async (photoUrl, caption, chatId = config.channel) => {
  if (!config.token || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN or chat id missing');
  }

  const res = await fetch(`https://api.telegram.org/bot${config.token}/sendPhoto`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption, parse_mode: 'HTML' }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram error: ${data.description}`);
  return data.result;
};

// Post the digest to the Telegram channel via the Bot API (no deps).
export const postToTelegram = async (text, chatId = config.channel) => {
  if (!config.token || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN or chat id missing');
  }

  const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram error: ${data.description}`);
  return data.result;
};
