# ZroCrypto

Armenian crypto news **digest** bot. Twice a day it pulls crypto RSS, grabs a
CoinGecko price snapshot, uses **Gemini Flash** to pick the 4–6 most important
stories and rewrite them in Armenian, then posts one clean digest to a Telegram
channel. Free to run — no server, GitHub Actions cron does the scheduling.

```
RSS feeds ─┐
           ├─▶ aggregate ─▶ Gemini curate ─▶ format ─▶ Telegram (1 digest post)
CoinGecko ─┘   (last 24h)   (pick 4-6, hy)
```

## Setup

1. `npm install`
2. `cp .env.example .env` and fill in:
   - `TELEGRAM_BOT_TOKEN` — from @BotFather
   - `TELEGRAM_CHANNEL` — e.g. `@yourchannel` (add the bot as **admin** of the channel)
   - `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/app/apikey)

## Run

```bash
npm run preview   # dry run, prints the digest to console (no posting)
npm run dry       # dry run, no console print
npm start         # builds AND posts to the channel
```

## Scheduling (free)

`.github/workflows/digest.yml` runs at **06:00 & 16:00 UTC = 10:00 & 20:00 Yerevan**.
Add the secrets in the repo: **Settings → Secrets and variables → Actions**
(`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL`, `GEMINI_API_KEY`). Optional repo
*variables*: `GEMINI_MODEL`, `SITE_URL`, `CHANNEL_HANDLE`. Use **Run workflow**
on the Actions tab to fire a manual test.

To change times, edit the `cron:` line (it's in UTC; subtract 4h from Yerevan).

## Demo site

`web/index.html` — a self-contained page that visualizes the pipeline with **live**
BTC/ETH prices and a Telegram-style digest preview. Open it directly or host it
statically (GitHub Pages, Netlify, the zromek.de server).

## Structure

| File | Role |
|------|------|
| `src/feeds.js` | RSS source list |
| `src/fetchRss.js` | parallel feed fetch |
| `src/aggregate.js` | merge, last-24h filter, dedupe, strip HTML |
| `src/prices.js` | CoinGecko BTC/ETH snapshot |
| `src/sentiment.js` | Crypto Fear & Greed index (daily mood gauge) |
| `src/curate.js` | Gemini Flash — pick + translate + day overview (JSON) |
| `src/format.js` | build the digest message (Armenian date, prices, news) |
| `src/post.js` | Telegram Bot API send |
| `src/index.js` | orchestrate the run |
