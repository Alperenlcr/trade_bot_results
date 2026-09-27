import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// data/ lives at the repo root (untouched — a daily external automation
// updates data/tables/*.csv and pushes directly to it), two levels above
// this file (src/lib/loadSiteData.ts -> src/ -> repo root).
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DATA_DIR = path.join(ROOT, 'data');

export interface MonthlyRow { m: string; p: number; b: number }
export interface YearlyRow { y: string; p: number; b: number }
export interface TradeRow { type: string; start: string; entry: number; end: string; exit: number; dur: number; pnl: number | null }
export interface SeriesPoint { t: number; p: number; b: number }

export interface SiteInitialData {
  i18n: Record<string, Record<string, any>>;
  config: Record<string, any>;
  monthly: MonthlyRow[];
  yearly: YearlyRow[];
  trades: TradeRow[];
  defaultTf: string;
  defaultSeries: SeriesPoint[];
  allSeries: SeriesPoint[];
}

function parseCsv(text: string): { head: string[]; rows: string[][] } {
  const lines = text.trim().split('\n');
  const head = lines[0].split(',');
  const rows = new Array(lines.length - 1);
  for (let i = 1; i < lines.length; i++) rows[i - 1] = lines[i].split(',');
  return { head, rows };
}

function readCsv(name: string): { head: string[]; rows: string[][] } {
  const text = readFileSync(path.join(DATA_DIR, 'tables', name), 'utf-8');
  return parseCsv(text);
}

const DEFAULT_TF = '1y';

export function loadSiteData(): SiteInitialData {
  const i18n = JSON.parse(readFileSync(path.join(DATA_DIR, 'i18n.json'), 'utf-8'));
  const config = JSON.parse(readFileSync(path.join(DATA_DIR, 'config.json'), 'utf-8'));

  const monthly: MonthlyRow[] = readCsv('monthly.csv').rows.map((r) => ({ m: r[0], p: +r[1], b: +r[2] }));
  const yearly: YearlyRow[] = readCsv('yearly.csv').rows.map((r) => ({ y: r[0], p: +r[1], b: +r[2] }));
  const trades: TradeRow[] = readCsv('trades.csv').rows.map((r) => ({
    type: r[0], start: r[1], entry: +r[2], end: r[3], exit: +r[4], dur: +r[5],
    pnl: r[6] === '' ? null : +r[6],
  }));

  const tfRows = readCsv(DEFAULT_TF + '.csv').rows;
  const defaultSeries: SeriesPoint[] = tfRows.map((r) => ({ t: parseTs(r[0]), p: +r[1], b: +r[2] }));

  // Always needed for the hero stats' annualized-return calc, independent of
  // whichever timeframe tab is selected — mirrors the original's unconditional
  // `all.csv` fetch in loadCore().
  const allRows = readCsv('all.csv').rows;
  const allSeries: SeriesPoint[] = allRows.map((r) => ({ t: parseTs(r[0]), p: +r[1], b: +r[2] }));

  return { i18n, config, monthly, yearly, trades, defaultTf: DEFAULT_TF, defaultSeries, allSeries };
}

function parseTs(s: string): number {
  return new Date(s.replace(' ', 'T') + (s.length <= 10 ? 'T00:00:00' : '')).getTime();
}
