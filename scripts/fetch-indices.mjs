// Downloads daily S&P 500 and Nasdaq-100 closes from FRED (no API key needed)
// into data/indices/daily.csv. Run daily by .github/workflows/indices.yml.
// On any download error it exits non-zero without touching the existing file.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SERIES = ['SP500', 'NASDAQ100'];
const START = '2018-03-01'; // portfolio history starts 2018-03-08
const OUT = fileURLToPath(new URL('../data/indices/daily.csv', import.meta.url));

async function fetchSeries(id) {
  const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${START}`);
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  const map = new Map();
  for (const line of (await res.text()).trim().split('\n').slice(1)) {
    const [date, v] = line.split(',');
    if (v && v !== '.') map.set(date, v.trim()); // holidays come back empty
  }
  if (map.size < 1000) throw new Error(`${id}: only ${map.size} rows`);
  return map;
}

const [spx, ndx] = await Promise.all(SERIES.map(fetchSeries));
const rows = [...spx.keys()].filter((d) => ndx.has(d)).sort().map((d) => `${d},${spx.get(d)},${ndx.get(d)}`);
mkdirSync(fileURLToPath(new URL('../data/indices/', import.meta.url)), { recursive: true });
writeFileSync(OUT, `DATE,${SERIES.join(',')}\n${rows.join('\n')}\n`);
console.log(`[fetch-indices] ${rows.length} rows, last ${rows.at(-1)}`);
