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
npm start         # builds AND posts the daily digest, then records the day in history.json

node src/weekly.js --dry --print   # preview the weekly recap (needs >=2 days of history)
node src/weekly.js                 # post the weekly recap
```

## Scheduling (free)

`.github/workflows/digest.yml` runs at **06:00 & 16:00 UTC = 10:00 & 20:00 Yerevan**.
Add the secrets in the repo: **Settings → Secrets and variables → Actions**
(`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL`, `GEMINI_API_KEY`). Optional repo
*variables*: `GEMINI_MODEL`, `SITE_URL`, `CHANNEL_HANDLE`. Use **Run workflow**
on the Actions tab to fire a manual test.

To change times, edit the `cron:` line (it's in UTC; subtract 4h from Yerevan).

### Weekly recap

Each daily run appends a trimmed snapshot (date, mood, prices, overview, headlines) to
`history.json` and the Actions workflow commits it back to the repo (one entry per day,
last 60 kept). `weekly.yml` runs **Sundays 17:00 UTC = 21:00 Yerevan**, reads the last 7
days, and posts a "📅 Շաբաթվա ամփոփում" — mood trend, week themes, and week-over-week
price moves. It self-skips until at least 2 days of history exist. The daily workflow needs
`contents: write` permission for the commit-back (already set).

## X / Twitter

X's API requires a paid tier for automated posting, so instead the daily run can DM
**you** a ready-to-paste tweet plus a small share-card image (24h % change bars, via
the same free QuickChart setup as the weekly chart) — you copy-paste it into X
yourself, which also performs better there than an obviously-automated post.

To enable it, set `TELEGRAM_ADMIN_CHAT_ID` (as a repo secret too):
1. Send any message to your bot in a private chat.
2. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` and read your `chat_id`
   from the response.
3. Set `TELEGRAM_ADMIN_CHAT_ID` to that value.

Leave it unset to skip this step entirely — the daily channel post is unaffected.

## Site (and why it exists)

`t.me/zrocry` can't rank in Google — Telegram pages are a dead end for search. So every
day that gets posted also becomes a **static HTML page**, the same trick ZroJobs uses:

```
history.json ─▶ npm run site ─▶ site/
                                ├── index.html        (landing page + WebSite JSON-LD)
                                ├── digest/index.html (archive, CollectionPage + ItemList)
                                ├── digest/2026-06-29.html … (NewsArticle per day)
                                ├── sitemap.xml
                                └── robots.txt
```

Each day page carries the overview, the curated headlines with source links, the price
table and the mood reading — all in the markup, no client-side rendering, so a crawler
sees the Armenian text without running JavaScript. Days that only got a price-only
fallback (curation failed) are skipped rather than published as thin content. Neighbouring
days are linked both ways, so a crawler landing on one page can walk the whole archive.

`web/index.html` is the hand-written landing page (live BTC/ETH ticker, pipeline
animation, Telegram-style preview). The build copies it and fills in the `<!--zc:seo-->`
and `<!--zc:archive-->` markers, since only the build knows the deploy URL.

```bash
npm run site   # writes site/ (gitignored)
npm test       # renderer + structured-data tests
```

`pages.yml` rebuilds and deploys after every **Crypto Digest** run — a `workflow_run`
trigger, because the digest commits `history.json` with `[skip ci]` and a push trigger
would never fire. One-time: Settings → Pages → Source → "GitHub Actions".

### Getting it indexed

1. Set the repo variable `SITE_BASE_URL` if the site isn't at
   **https://dstepanian.github.io/ZroCrypto/** — canonical URLs and the sitemap are
   absolute and have to match the real host exactly.
2. Add the property in [Search Console](https://search.google.com/search-console), then
   submit `sitemap.xml`. For meta-tag verification, put the token in the repo variable
   `GOOGLE_SITE_VERIFICATION` (value only, not the whole tag) and redeploy.
3. **Caveat:** on a project Pages URL, `robots.txt` lands at `/ZroCrypto/robots.txt`,
   which Google ignores — only a domain-root `robots.txt` counts. Crawling still works
   (nothing is disallowed) and the sitemap is submitted directly, but a custom domain is
   what makes the whole setup behave normally.

## Structure

| File | Role |
|------|------|
| `src/feeds.js` | RSS source list |
| `src/fetchRss.js` | parallel feed fetch |
| `src/aggregate.js` | merge, last-24h filter, dedupe, strip HTML |
| `src/prices.js` | CoinGecko BTC/ETH snapshot |
| `src/sentiment.js` | Crypto Fear & Greed index (daily mood gauge) |
| `src/rates.js` | AMD fiat rates (USD/EUR/RUB) + gold/silver |
| `src/gemini.js` | shared Gemini JSON call (used by daily + weekly) |
| `src/curate.js` | Gemini prompts — daily digest + weekly recap |
| `src/format.js` | build the daily and weekly messages |
| `src/post.js` | Telegram Bot API send |
| `src/history.js` | append/load `history.json` (one entry per day) |
| `src/index.js` | orchestrate the daily run |
| `src/weekly.js` | orchestrate the Sunday weekly recap |
| `src/render.js` | site HTML — day pages, archive, JSON-LD, sitemap, robots |
| `src/site.js` | build `site/` from `history.json` + `web/` |
