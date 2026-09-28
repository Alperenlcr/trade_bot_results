// Downloads S&P 500 and Nasdaq-100 closes into data/indices/:
//   daily.csv  — FRED daily closes since 2018 (no API key needed)
//   hourly.csv — Yahoo Finance hourly closes, last 730 days (the chart's 3m/6m/1y
//                bot data is 1–4h, so daily closes looked like stairs there)
// Run daily by .github/workflows/indices.yml. A failed source leaves its existing
// file untouched and makes the script exit non-zero.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SERIES = ['SP500', 'NASDAQ100'];
const YAHOO = ['^GSPC', '^NDX']; // same order as SERIES
const START = '2018-03-01'; // portfolio history starts 2018-03-08
const DIR = fileURLToPath(new URL('../data/indices/', import.meta.url));
mkdirSync(DIR, { recursive: true });

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

// Keyed by bar end in UTC ("YYYY-MM-DD HH:MM", same format/zone as data/tables/*.csv),
// so the chart never shows a close before its hour is over.
async function fetchHourly(symbol) {
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=60m&range=730d`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const r = (await res.json()).chart.result[0];
  const close = r.indicators.quote[0].close;
  const map = new Map();
  r.timestamp.forEach((t, i) => {
    if (close[i] != null) map.set(new Date((t + 3600) * 1000).toISOString().slice(0, 16).replace('T', ' '), close[i].toFixed(2));
  });
  if (map.size < 1000) throw new Error(`${symbol}: only ${map.size} rows`);
  return map;
}

async function write(file, fetchOne, ids) {
  try {
    const [a, b] = await Promise.all(ids.map(fetchOne));
    const rows = [...a.keys()].filter((d) => b.has(d)).sort().map((d) => `${d},${a.get(d)},${b.get(d)}`);
    writeFileSync(DIR + file, `DATE,${SERIES.join(',')}\n${rows.join('\n')}\n`);
    console.log(`[fetch-indices] ${file}: ${rows.length} rows, last ${rows.at(-1)}`);
  } catch (e) {
    console.error(`[fetch-indices] ${file} not updated:`, e.message);
    process.exitCode = 1;
  }
}

await write('daily.csv', fetchSeries, SERIES);
await write('hourly.csv', fetchHourly, YAHOO);
