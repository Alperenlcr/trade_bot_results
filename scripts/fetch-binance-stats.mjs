// Pulls the lead-trader AUM and current copier count from Binance's public copy-trading API
// into data/binance.json (hero follower card). Run daily by .github/workflows/indices.yml.
// On any error it exits non-zero without touching the existing file.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORTFOLIO_ID = '4965482140792366337';
const OUT = fileURLToPath(new URL('../data/binance.json', import.meta.url));

const res = await fetch(
  `https://www.binance.com/bapi/futures/v1/friendly/future/copy-trade/lead-portfolio/detail?portfolioId=${PORTFOLIO_ID}`,
  { headers: { 'User-Agent': 'Mozilla/5.0', clienttype: 'web' } },
);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const { code, data } = await res.json();
const aum = Number(data?.aumAmount);
const copiers = data?.currentCopyCount;
if (code !== '000000' || !Number.isFinite(aum) || !Number.isInteger(copiers)) {
  throw new Error(`unexpected response: code=${code} aum=${data?.aumAmount} copiers=${copiers}`);
}
const stats = { portfolioUsd: Math.round(aum), followers: copiers };
writeFileSync(OUT, JSON.stringify(stats) + '\n');
console.log('[fetch-binance-stats]', stats);
