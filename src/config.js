import 'dotenv/config';

const config = {
  token: process.env.TELEGRAM_BOT_TOKEN,
  channel: process.env.TELEGRAM_CHANNEL,
  adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
  geminiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  siteUrl: process.env.SITE_URL || 'zromek.de',
  // Where the generated site is published — canonical URLs and the sitemap are
  // absolute, so this has to match the real host exactly.
  siteBaseUrl: process.env.SITE_BASE_URL || 'https://dstepanian.github.io/ZroCrypto',
  channelHandle: process.env.CHANNEL_HANDLE || process.env.TELEGRAM_CHANNEL || '',
  // Optional Search Console meta-tag verification token (the value only, not the tag).
  googleVerification: process.env.GOOGLE_SITE_VERIFICATION || '',
  digestMin: Number(process.env.DIGEST_MIN || 4),
  digestMax: Number(process.env.DIGEST_MAX || 6),
  // CLI flags
  dry: process.argv.includes('--dry'),
  print: process.argv.includes('--print'),
};

export default config;
