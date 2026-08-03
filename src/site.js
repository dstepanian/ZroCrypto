import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config.js';
import { loadHistory } from './history.js';
import {
  digestPath, homeArchiveLink, homeSeo, isPublishable,
  renderArchive, renderDigestPage, renderRobots, renderSitemap,
} from './render.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const OUT = path.join(ROOT, 'site');

// The landing page is hand-written and doesn't know the deploy URL; these
// markers are where the build fills in what only it can know.
const SEO_MARKER = '<!--zc:seo-->';
const ARCHIVE_MARKER = '<!--zc:archive-->';

const buildHome = (entries) => {
  const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
  for (const marker of [SEO_MARKER, ARCHIVE_MARKER]) {
    if (!html.includes(marker)) {
      console.error(`[site] web/index.html is missing ${marker} — the build can't place its SEO tags`);
      process.exit(1);
    }
  }
  return html
    .replace(SEO_MARKER, homeSeo())
    .replace(ARCHIVE_MARKER, homeArchiveLink(entries));
};

const run = () => {
  // Newest first: that's the order the archive lists and the sitemap dates.
  const entries = loadHistory().filter(isPublishable).reverse();

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.cpSync(WEB, OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'index.html'), buildHome(entries));

  if (entries.length) {
    fs.mkdirSync(path.join(OUT, 'digest'), { recursive: true });
    entries.forEach((entry, i) => {
      // The archive runs newest → oldest, so "next" is the earlier index.
      const page = renderDigestPage(entry, { prev: entries[i + 1], next: entries[i - 1] });
      fs.writeFileSync(path.join(OUT, digestPath(entry)), page);
    });
    fs.writeFileSync(path.join(OUT, 'digest', 'index.html'), renderArchive(entries));
  } else {
    // Early days: history has no curated content yet. Still deploy the landing
    // page rather than fail — the archive appears on its own once digests land.
    console.warn('[site] no publishable days in history.json — building the landing page only');
  }

  fs.writeFileSync(path.join(OUT, 'sitemap.xml'), renderSitemap(entries));
  fs.writeFileSync(path.join(OUT, 'robots.txt'), renderRobots());

  console.log(`[site] built ${entries.length} digest page(s) into site/ for ${config.siteBaseUrl}`);
};

run();
