import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { useTranslations, type Lang } from '../i18n/utils';

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
  allEnds: [SeriesPoint, SeriesPoint];
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

// Yalnızca istenen dilin metinleri gömülür (island prop'u 4 dil taşımasın). SSS
// ve takipçi kartı etiketleri sitenin geri kalanıyla aynı kaynaktan, src/i18n/{lang}.json'dan gelir.
export function loadSiteData(lang: Lang): SiteInitialData {
  const dash = JSON.parse(readFileSync(path.join(DATA_DIR, 'i18n.json'), 'utf-8'));
  const site = useTranslations(lang);
  const i18n = { [lang]: {
    ...dash[lang], faq: site.faq.items,
    stat_portfolio: site.hero.stats.portfolio, stat_followers: site.hero.stats.followers,
  } };
  const config = JSON.parse(readFileSync(path.join(DATA_DIR, 'config.json'), 'utf-8'));
  // Binance + Bybit AUM ve takipçi sayısı toplamı (scripts/fetch-{binance,bybit}-stats.mjs);
  // hiçbir dosya yoksa takipçi kartı gizlenir.
  const exchangeStats = ['binance.json', 'bybit.json'].map((f) => path.join(DATA_DIR, f)).filter(existsSync)
    .map((f) => JSON.parse(readFileSync(f, 'utf-8')) as { portfolioUsd: number; followers: number });
  if (exchangeStats.length) config.followerStats = {
    portfolioUsd: exchangeStats.reduce((sum, x) => sum + x.portfolioUsd, 0),
    followers: exchangeStats.reduce((sum, x) => sum + x.followers, 0),
  };

  const monthly: MonthlyRow[] = readCsv('monthly.csv').rows.map((r) => ({ m: r[0], p: +r[1], b: +r[2] }));
  const yearly: YearlyRow[] = readCsv('yearly.csv').rows.map((r) => ({ y: r[0], p: +r[1], b: +r[2] }));
  const trades: TradeRow[] = readCsv('trades.csv').rows.map((r) => ({
    type: r[0], start: r[1], entry: +r[2], end: r[3], exit: +r[4], dur: +r[5],
    pnl: r[6] === '' ? null : +r[6],
  }));

  // Grafik serileri gömülmez (sayfanın ~%70'iydi); App bunları açılışta fetch eder.
  // Hero istatistikleri yalnızca all.csv'nin ilk ve son noktasına bakar, SSR'da hazır olsun diye onlar gömülür.
  const allRows = readCsv('all.csv').rows;
  const pt = (r: string[]): SeriesPoint => ({ t: parseTs(r[0]), p: +r[1], b: +r[2] });
  const allEnds: [SeriesPoint, SeriesPoint] = [pt(allRows[0]), pt(allRows[allRows.length - 1])];

  return { i18n, config, monthly, yearly, trades, defaultTf: DEFAULT_TF, allEnds };
}

function parseTs(s: string): number {
  return new Date(s.replace(' ', 'T') + (s.length <= 10 ? 'T00:00:00' : '')).getTime();
}
