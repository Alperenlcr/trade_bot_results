// Pulls the Bybit lead-trader AUM and current follower count into data/bybit.json (hero follower
// card; loadSiteData sums it with data/binance.json). Run daily by .github/workflows/indices.yml.
// Bybit's API sits behind Akamai bot protection that rejects plain HTTP clients (403), so the call
// is made from inside a real headless Chrome tab after opening the leader page (sets the cookies).
// On any error it exits non-zero without touching the existing file.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LEADER = encodeURIComponent('/wQF7+GkKrFNJGsT/+8rhw==');
const PAGE = `https://www.bybit.com/copyTrade/trade-center/detail?leaderMark=${LEADER}`;
const API = `/x-api/fapi/beehive/private/v1/pub-leader/info?leaderMark=${LEADER}`;
const OUT = fileURLToPath(new URL('../data/bybit.json', import.meta.url));
const PORT = 9335;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(path.join(tmpdir(), 'bybit-'));
const chrome = spawn(process.env.CHROME ?? 'google-chrome-stable', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run',
  '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  'about:blank',
], { stdio: 'ignore' });

try {
  let tab;
  for (let i = 0; i < 20 && !tab; i++) {
    await sleep(500);
    tab = await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')).catch(() => null);
  }
  if (!tab) throw new Error('Chrome did not start');
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = {};
  ws.onmessage = (e) => { const m = JSON.parse(e.data); pending[m.id]?.(m.result); };
  const send = (method, params) => new Promise((r) => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });

  await send('Page.navigate', { url: PAGE });
  let body;
  for (let i = 0; i < 6 && !body; i++) { // Akamai cookies can take a few seconds to settle
    await sleep(3000);
    const { result } = await send('Runtime.evaluate', {
      expression: `fetch(${JSON.stringify(API)}).then((r) => r.ok ? r.text() : null)`, awaitPromise: true, returnByValue: true,
    });
    body = result?.value;
  }
  ws.close();
  if (!body) throw new Error('API kept returning an error');

  const { retCode, result: d } = JSON.parse(body);
  const aum = Number(d?.aumE8) / 1e8;
  const followers = Number(d?.currentFollowerCount);
  if (retCode !== 0 || !Number.isFinite(aum) || !Number.isInteger(followers)) {
    throw new Error(`unexpected response: retCode=${retCode} aumE8=${d?.aumE8} followers=${d?.currentFollowerCount}`);
  }
  const stats = { portfolioUsd: Math.round(aum), followers };
  writeFileSync(OUT, JSON.stringify(stats) + '\n');
  console.log('[fetch-bybit-stats]', stats);
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
