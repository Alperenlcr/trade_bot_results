// Runs after `astro build`. Copies the static assets/data that live at the
// repo root (untouched, so the daily automation that pushes updated
// data/tables/*.csv keeps working exactly as before) into dist/, plus the
// large/lazy-fetched CSVs that are intentionally NOT embedded at build time.
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(ROOT, 'dist');

function copy(rel) {
  const src = path.join(ROOT, rel);
  const dest = path.join(DIST, rel);
  if (!existsSync(src)) { console.warn(`[copy-static] skip missing ${rel}`); return; }
  mkdirSync(path.dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`[copy-static] ${rel} -> dist/${rel}`);
}

copy('assets');
copy('CNAME');
copy('robots.txt');
copy('sitemap.xml');
copy('llms.txt');

// Large / lazily-fetched tables that are NOT embedded at build time — kept
// as static files so the client fetches them at runtime exactly like today.
const LAZY_TABLES = ['3m.csv', '6m.csv', '3y.csv', '5y.csv', 'all.csv', 'performance.csv'];
for (const f of LAZY_TABLES) copy(path.join('data', 'tables', f));
