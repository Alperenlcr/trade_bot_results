// performance.csv (TRADE_START × TRADE_END pencereleri) ortak yorumu. Build (loadSiteData.ts) hero
// istatistiklerini SSR'a gömmek için, istemci (App.tsx) analiz bölümü için kullanır; node:fs içermemeli.
import { parseTs } from './csv';

export function groupPerf({ head, rows }: { head: string[]; rows: string[][] }) {
  const idx: Record<string, number> = {}; head.forEach((h, i) => idx[h] = i);
  const byStart = new Map<string, string[][]>();
  for (const r of rows) {
    if (!byStart.has(r[0])) byStart.set(r[0], []);
    byStart.get(r[0])!.push(r);
  }
  const starts = [...byStart.keys()].sort();
  const endsFor = (s: string) => (byStart.get(s) || []).map((r) => r[1]);
  const row = (s: string, e: string) => { const a = byStart.get(s) || []; return a.find((r) => r[1] === e) || a[a.length - 1]; };
  const num = (v: string | undefined) => (v === '' || v == null ? null : +v);

  const lastEnd = starts.reduce((mx, s) => { const es = endsFor(s); const e = es[es.length - 1]; return e > mx ? e : mx; }, '');
  const worst1Y = num(row(starts[0], lastEnd)?.[idx['MIN_ROLLING_1Y']]);
  // Varsayılan pencere: son 5 yıla en yakın başlangıç → en son bitiş.
  const target = parseTs(lastEnd) - 5 * 365.25 * 864e5;
  let s5 = starts[0], best = Infinity;
  for (const s of starts) { const dd = Math.abs(parseTs(s) - target); if (dd < best) { best = dd; s5 = s; } }
  const ends5 = endsFor(s5);
  const defEnd = ends5.includes(lastEnd) ? lastEnd : ends5[ends5.length - 1];
  const annual = num(row(s5, defEnd)?.[idx['AVG_ROLLING_1Y']]);

  return { idx, byStart, starts, endsFor, row, defStart: s5, defEnd, annual, worst1Y };
}
