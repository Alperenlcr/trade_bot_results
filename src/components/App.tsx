import React from 'react';
import { sx } from './styleUtil';
import type { SiteInitialData, SeriesPoint } from '../lib/loadSiteData';
import type { Lang } from '../i18n/utils';
import { contactUrl } from '../data/contact';
import { exchanges } from '../data/exchanges';

// data/indices/daily.csv sütunları (scripts/fetch-indices.mjs üretir). Renkler global.css › .app.
const INDICES = [
  { key: 'spx', label: 'S&P 500', color: '--spx' },
  { key: 'ndx', label: 'Nasdaq-100', color: '--ndx' },
];

interface Props {
  locale: Lang;
  initialData: SiteInitialData;
  // Astro'nun isimli slot'ları (HomePage.astro › slot="how" / "trust"); SSR'da statik HTML olarak gelir.
  how?: React.ReactNode;
  trust?: React.ReactNode;
}

interface Selection { a: number; b: number }
interface LightboxState { kind: 'image' | 'video'; i: number }

interface State {
  tf: string;
  showBtc: boolean;
  showIdx: string[];
  log: boolean;
  view: 'chart' | 'monthly';
  metric: 'portfolio' | 'btc';
  selection: Selection | null;
  ready: boolean;
  tFrom: string; tTo: string; tNewest: boolean;
  faqOpen: number | null;
  calcAmount: string; calcDate: string;
  perfLoaded: boolean; perfStart: string | null; perfEnd: string | null;
  lb: LightboxState | null;
  refModal: boolean; refPlatform: 'binance' | 'bybit';
  refRefNick: string; refRefID: string; refNewNick: string; refEmail: string;
  refSubmitting: boolean; refDone: boolean; refErr: string;
}

export default class App extends React.Component<Props, State> {
  chartData: Record<string, SeriesPoint[]> = {};
  allEnds: SeriesPoint[] = [];
  idx: { t: number[]; v: number[][] } | null = null; // v[i] = INDICES[i] kapanışları
  monthly: { m: string; p: number; b: number }[] = [];
  yearly: { y: string; p: number; b: number }[] = [];
  trades: { type: string; start: string; entry: number; end: string; exit: number; dur: number; pnl: number | null }[] = [];
  tMin = ''; tMax = '';
  heroBasic: { annual: number; years: number; totalMult: number; tradeCount: number; btcMult: number } | null = null;
  heroAnnual: number | null = null;
  heroWorst1Y: number | null = null;
  perfIdx: Record<string, number> = {};
  perfByStart: Map<string, string[][]> = new Map();
  perfStarts: string[] = [];
  _perfStarted = false;
  canvas: HTMLCanvasElement | null = null;
  _ro: ResizeObserver | null = null;
  sel: Selection | null = null;
  hoverI: number | null = null;
  _X: ((t: number) => number) | null = null;
  _Y: ((v: number) => number) | null = null;
  _padL = 0; _plotW = 0; _yd: [number, number] = [0, 1];

  constructor(props: Props) {
    super(props);
    // All of this is a pure function of props (no DOM/browser APIs), so it
    // runs here instead of componentDidMount — that way the server-rendered
    // HTML already has real hero stats / trades / monthly data instead of
    // placeholders, since it was embedded at build time and doesn't need a
    // fetch to become available.
    const d = props.initialData;
    this.monthly = d.monthly;
    this.yearly = d.yearly;
    this.trades = d.trades;
    this.allEnds = d.allEnds;
    const tradeDates = this.trades.flatMap((x) => x.end ? [x.start.slice(0, 10), x.end.slice(0, 10)] : [x.start.slice(0, 10)]);
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    this.tMin = tradeDates.reduce((a, b) => (b < a ? b : a));
    this.tMax = tradeDates.reduce((a, b) => (b > a ? b : a), todayStr);
    this.computeHeroBasic();

    this.state = {
      tf: props.initialData.defaultTf,
      showBtc: true, showIdx: INDICES.map((x) => x.key), log: false,
      view: 'chart', metric: 'portfolio',
      selection: null,
      ready: true,
      tFrom: this.tMin, tTo: this.tMax, tNewest: true,
      faqOpen: 0,
      calcAmount: '500', calcDate: this.isoDate(this.allEnds[1].t - 365 * 864e5),
      perfLoaded: false, perfStart: null, perfEnd: null,
      lb: null,
      refModal: false, refPlatform: 'binance', refRefNick: '', refRefID: '', refNewNick: '', refEmail: '',
      refSubmitting: false, refDone: false, refErr: '',
    };
  }

  get lang() { return this.props.locale; }
  get i18n() { return this.props.initialData.i18n; }
  get cfg() { return this.props.initialData.config; }
  get t(): any { return (this.i18n && this.i18n[this.lang]) || {}; }

  async componentDidMount() {
    this.loadPerf();
    this.countUp();
    // Endeks dosyası gelmezse grafik yine çizilir, yalnız endeks çizgileri olmaz.
    await Promise.all([this.ensureTf(this.state.tf), this.loadIdx().catch(() => {})]);
    this.forceUpdate(() => this.drawChart());
    // Hesaplayıcı tüm geçmişe ihtiyaç duyar; ilk grafik çizildikten sonra arka planda yüklenir.
    this.ensureTf('all').then(() => this.forceUpdate(), () => {});
  }

  // Son değer SSR HTML'inde hazır (SEO, JS'siz); burada yalnızca 0'dan sayarak oraya varılır.
  // DOM'a doğrudan yazılır: her karede setState tüm dashboard'u yeniden render ederdi.
  countUp() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = [...document.querySelectorAll<HTMLElement>('.app [data-count]')].map((el) => ({
      el, target: Number(el.dataset.count), prefix: el.dataset.prefix ?? '',
      fmt: new Intl.NumberFormat(this.loc(), JSON.parse(el.dataset.format ?? '{}')),
    }));
    if (!els.length) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1400, 1);
      const eased = 1 - (1 - p) ** 3;
      for (const c of els) c.el.textContent = c.prefix + c.fmt.format(Math.round(c.target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  async fetchCsv(name: string, dir = '/data/tables/') {
    const r = await fetch(dir + name);
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`); // yoksa 404 sayfası CSV diye okunurdu
    const txt = await r.text();
    const lines = txt.trim().split('\n');
    const head = lines[0].split(',');
    const rows = new Array(lines.length - 1);
    for (let i = 1; i < lines.length; i++) rows[i - 1] = lines[i].split(',');
    return { head, rows };
  }

  computeHeroBasic() {
    const d = this.allEnds; if (!d || !d.length) return;
    const last = d[d.length - 1], first = d[0];
    const years = (last.t - first.t) / (365.25 * 864e5);
    const totalMult = 1 + last.p / 100;
    const annual = (Math.pow(totalMult, 1 / years) - 1) * 100;
    this.heroBasic = { annual, years, totalMult, tradeCount: (this.trades || []).length, btcMult: 1 + last.b / 100 };
  }

  async loadPerf() {
    if (this._perfStarted) return; this._perfStarted = true;
    const d = await this.fetchCsv('performance.csv');
    const H = d.head; const idx: Record<string, number> = {}; H.forEach((h, i) => idx[h] = i); this.perfIdx = idx;
    this.perfByStart = new Map();
    for (const r of d.rows) {
      const s = r[0]; if (!this.perfByStart.has(s)) this.perfByStart.set(s, []);
      this.perfByStart.get(s)!.push(r);
    }
    this.perfStarts = [...this.perfByStart.keys()].sort();
    const lastEnd = this.perfStarts.reduce((mx, s) => { const es = this.perfByStart.get(s)!; const e = es[es.length - 1][1]; return e > mx ? e : mx; }, '');
    const frFull = this.perfRow(this.perfStarts[0], lastEnd);
    const mw = frFull ? frFull[idx['MIN_ROLLING_1Y']] : null; this.heroWorst1Y = (mw === '' || mw == null) ? null : +mw;
    const target = this.parseTs(lastEnd) - 5 * 365.25 * 864e5;
    let s5 = this.perfStarts[0], best = Infinity;
    for (const s of this.perfStarts) { const dd = Math.abs(this.parseTs(s) - target); if (dd < best) { best = dd; s5 = s; } }
    const ends5 = this.endsFor(s5);
    const defEnd = ends5.includes(lastEnd) ? lastEnd : ends5[ends5.length - 1];
    const fr5 = this.perfRow(s5, defEnd); const a1 = fr5 ? fr5[idx['AVG_ROLLING_1Y']] : null;
    this.heroAnnual = (a1 === '' || a1 == null) ? null : +a1;
    this.setState({ perfLoaded: true, perfStart: s5, perfEnd: defEnd });
  }

  endsFor(start: string) { const a = this.perfByStart.get(start) || []; return a.map((r) => r[1]); }
  perfRow(start: string, end: string) { const a = this.perfByStart.get(start) || []; return a.find((r) => r[1] === end) || a[a.length - 1]; }

  setPerfStart = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = e.target.value; const ends = this.endsFor(s); const cur = this.state.perfEnd;
    const end = cur && ends.includes(cur) ? cur : ends[ends.length - 1];
    this.setState({ perfStart: s, perfEnd: end });
  };
  setPerfEnd = (e: React.ChangeEvent<HTMLSelectElement>) => this.setState({ perfEnd: e.target.value });

  setTFrom = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ tFrom: e.target.value });
  setTTo = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ tTo: e.target.value });
  resetTrades = () => this.setState({ tFrom: this.tMin, tTo: this.tMax });
  toggleSort = () => this.setState({ tNewest: !this.state.tNewest });
  setFaq = (i: number) => this.setState({ faqOpen: this.state.faqOpen === i ? null : i });
  openImg = (i: number) => this.setState({ lb: { kind: 'image', i } });

  // Kurulum ekran görüntüleri yalnızca TR ve EN için var.
  imgLang() { return this.lang === 'tr' ? 'tr' : 'en'; }

  bold(str: string) {
    return str.split(/\*\*(.*?)\*\*/g).map((s, i) =>
      i % 2 === 1 ? React.createElement('strong', { key: i, style: { color: 'var(--text)', fontWeight: '700' } }, s) : s
    );
  }

  buildTermsEl() {
    const sections: { title: string; intro: string[]; items: string[] }[] = this.t.ref_terms_sections || [];
    const R = React.createElement;
    const self = this;
    return R('div', { style: { fontSize: '13px', lineHeight: '1.65', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: '12px' } },
      sections.map((s, i) => {
        const children: React.ReactNode[] = [];
        children.push(R('div', { key: 't', style: { fontWeight: '700', color: 'var(--text)', marginBottom: '4px', fontSize: '13px' } }, s.title));
        s.intro.forEach((line, j) => {
          children.push(R('p', { key: 'i' + j, style: { marginBottom: s.items.length ? '4px' : '0' } }, self.bold(line)));
        });
        if (s.items.length) {
          const itemEls = s.items.map((item, j) =>
            R('div', { key: j, style: { display: 'flex', gap: '6px' } },
              R('span', { key: 'd', style: { flexShrink: '0', color: 'var(--text-mute)' } }, '-'),
              R('span', { key: 'c' }, self.bold(item))
            )
          );
          children.push(R('div', { key: 'il', style: { display: 'flex', flexDirection: 'column', gap: '3px' } }, itemEls));
        }
        return R('div', { key: i }, children);
      })
    );
  }

  closeRefModal = () => this.setState({ refModal: false });
  openRefModal = () => this.setState({ refModal: true, refDone: false, refErr: '', refSubmitting: false, refRefNick: '', refRefID: '', refNewNick: '', refEmail: '' });
  stopProp = (e: React.SyntheticEvent) => e.stopPropagation();
  setRefBinance = () => this.setState({ refPlatform: 'binance' });
  setRefBybit = () => this.setState({ refPlatform: 'bybit' });
  onRefRefNick = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ refRefNick: e.target.value });
  onRefRefID = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ refRefID: e.target.value });
  onRefNewNick = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ refNewNick: e.target.value });
  onRefEmail = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ refEmail: e.target.value });

  submitRef = async () => {
    const { refRefNick, refRefID, refNewNick, refEmail, refPlatform } = this.state;
    const t = this.t;
    if (!refEmail.trim()) { this.setState({ refErr: t.err_email_empty }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(refEmail.trim())) { this.setState({ refErr: t.err_email_invalid }); return; }
    if (!refRefNick.trim()) { this.setState({ refErr: t.err_ref_nick }); return; }
    if (!refRefID.trim()) { this.setState({ refErr: t.err_ref_id }); return; }
    if (!refNewNick.trim()) { this.setState({ refErr: t.err_new_nick }); return; }
    this.setState({ refSubmitting: true, refErr: '' });
    const ep = (this.cfg && this.cfg.referral && this.cfg.referral.formEndpoint) || '';
    const payload = {
      platform: refPlatform,
      email: refEmail.trim(),
      referrerNickname: refRefNick.trim(),
      referrerID: refRefID.trim(),
      referredNickname: refNewNick.trim(),
      submittedAt: new Date().toISOString(),
    };
    if (ep) {
      try {
        const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) });
        const json = await r.json().catch(() => ({}));
        if (json.success === false) throw new Error(json.error || 'Server error');
        this.setState({ refSubmitting: false, refDone: true });
        setTimeout(() => this.setState({ refModal: false }), 3000);
      } catch (e) {
        this.setState({ refSubmitting: false, refErr: t.ref_error });
      }
    } else {
      window.open((this.cfg && this.cfg.referral && this.cfg.referral.url) || '#', '_blank');
      this.setState({ refSubmitting: false, refDone: true });
      setTimeout(() => this.setState({ refModal: false }), 3000);
    }
  };

  openVid = (i: number) => this.setState({ lb: { kind: 'video', i } });
  lbClose = () => this.setState({ lb: null });
  lbStop = (e: React.SyntheticEvent) => { e.stopPropagation(); };
  lbPrev = (e?: React.SyntheticEvent) => {
    e && e.stopPropagation(); const lb = this.state.lb; if (!lb) return;
    const n = lb.kind === 'image' ? ((this.cfg && this.cfg.guideSteps) || 6) : ((this.cfg && this.cfg.videos) || []).length;
    this.setState({ lb: { kind: lb.kind, i: (lb.i + n - 1) % n } });
  };
  lbNext = (e?: React.SyntheticEvent) => {
    e && e.stopPropagation(); const lb = this.state.lb; if (!lb) return;
    const n = lb.kind === 'image' ? ((this.cfg && this.cfg.guideSteps) || 6) : ((this.cfg && this.cfg.videos) || []).length;
    this.setState({ lb: { kind: lb.kind, i: (lb.i + 1) % n } });
  };

  buildTrades() {
    const tr = this.trades || []; const from = this.state.tFrom, to = this.state.tTo;
    let rows = tr.filter((x) => { const d = x.start.slice(0, 10); if (from && d < from) return false; if (to && d > to) return false; return true; });
    rows = rows.slice().sort((a, b) => (this.state.tNewest ? (a.start < b.start ? 1 : -1) : (a.start > b.start ? 1 : -1)));
    let win = 0, loss = 0, sum = 0, cnt = 0;
    rows.forEach((x) => { if (x.pnl == null) return; cnt++; sum += x.pnl; if (x.pnl >= 0) win++; else loss++; });
    const view = rows.map((x) => {
      const isLong = x.type === 'buy'; const open = x.pnl == null;
      const pnlColor = open ? 'var(--text-mute)' : (x.pnl! >= 0 ? 'var(--pos)' : 'var(--neg)');
      return {
        dir: isLong ? this.t.t_long : this.t.t_short,
        dirColor: isLong ? 'var(--pos)' : 'var(--neg)',
        dirBg: isLong ? 'color-mix(in srgb,var(--pos) 14%,transparent)' : 'color-mix(in srgb,var(--neg) 14%,transparent)',
        start: this.fmtDate(this.parseTs(x.start)),
        entry: '$' + this.fmtNum(x.entry, 0),
        end: open ? this.t.t_open : this.fmtDate(this.parseTs(x.end)),
        exit: open ? '-' : ('$' + this.fmtNum(x.exit, 0)),
        dur: x.dur + this.t.t_days,
        pnl: open ? '-' : this.fmtPct(x.pnl, 1), pnlColor,
        rowBg: open ? 'color-mix(in srgb,var(--accent) 7%,transparent)' : 'transparent',
      };
    });
    return { rows: view, total: tr.length, shown: rows.length, win, loss, avg: cnt ? sum / cnt : 0 };
  }

  buildPerf() {
    if (!this.state.perfLoaded) return null;
    let s = this.state.perfStart!, e = this.state.perfEnd!;
    if (s > e) { const tmp = s; s = e; e = tmp; }
    const r = this.perfRow(s, e); if (!r) return null;
    const I = this.perfIdx; const num = (k: string) => { const v = r[I[k]]; return v === '' || v == null ? null : +v; };
    const wins = num('WIN_COUNT') || 0, losses = num('LOSE_COUNT') || 0;
    const wr = (wins + losses) ? wins / (wins + losses) * 100 : 0;
    const dd = num('MAX_DRAWDOWN_VALUE');
    const ddRange = r[I['MAX_DRAWDOWN_RANGE']] || '';
    const roi = num('PORTFOLIO_ROI'), broi = num('BTC_ROI');
    const t = this.t;
    const winLabel = (k: string): string => (({ '1M': t.win_1m, '3M': t.win_3m, '6M': t.win_6m, '1Y': t.win_1y, '2Y': t.win_2y } as Record<string, string>)[k]);
    const mk = (k: string) => {
      const avg = num('AVG_ROLLING_' + k), mn = num('MIN_ROLLING_' + k), mx = num('MAX_ROLLING_' + k);
      const empty = avg == null;
      return { win: winLabel(k), avg: this.fmtPct(avg, 1), min: this.fmtPct(mn, 1), max: this.fmtPct(mx, 1),
        minColor: mn == null ? 'var(--text-mute)' : (mn >= 0 ? 'var(--pos)' : 'var(--neg)'),
        avgColor: 'var(--text)', maxColor: 'var(--pos)', dim: empty ? 'opacity:.35' : '' };
    };
    const rolling = ['1M', '3M', '6M', '1Y', '2Y'].map(mk);
    const ddR = ddRange.includes('_') ? ddRange.split('_').map((x: string) => this.fmtDate(this.parseTs(x))).join(' → ') : '';
    return {
      rolling,
      roi: this.fmtPct(roi, 0), roiMult: roi != null ? this.fmtX(1 + roi / 100) : '',
      roiColor: roi == null ? 'var(--text-mute)' : (roi >= 0 ? 'var(--pos)' : 'var(--neg)'),
      broi: this.fmtPct(broi, 1), broiMult: broi != null ? this.fmtX(1 + broi / 100) : '',
      maxdd: dd != null ? this.ltr('-' + Math.abs(dd).toFixed(1) + '%') : '-', ddRange: ddR,
      winrate: wr.toFixed(0) + '%', winLose: wins + ' / ' + losses,
      startDate: this.fmtDate(this.parseTs(s)), endDate: this.fmtDate(this.parseTs(e)),
    };
  }

  parseTs(s: string) { return new Date(s.replace(' ', 'T') + (s.length <= 10 ? 'T00:00:00' : '')).getTime(); }
  isoDate(t: number) { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  setCalcAmount = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ calcAmount: e.target.value });
  setCalcDate = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ calcDate: e.target.value });
  // all.csv üzerinden simülasyon. Kâr payı high-water mark ile her veri noktasında kesilir.
  // ponytail: borsalar kâr payını günlük/pozisyon kapanışında keser; 8 saatlik noktalar buna yakın bir yaklaşım.
  calc(amount: number, t0: number) {
    const d = this.chartData.all;
    const i0 = d ? d.findIndex((x) => x.t >= t0) : -1;
    if (!d || i0 < 0 || i0 >= d.length - 1 || !(amount > 0)) return null;
    const c = this.cfg.calculator ?? {};
    const share = c.deductProfitShare ? (c.profitSharePct ?? 0) / 100 : 0;
    const eq = (x: number) => 1 + x / 100;
    let v = amount, hwm = amount, fee = 0, peak = amount, dd = 0;
    for (let k = i0 + 1; k < d.length; k++) {
      v *= eq(d[k].p) / eq(d[k - 1].p);
      if (v > hwm) { const f = (v - hwm) * share; v -= f; fee += f; hwm = v; }
      peak = Math.max(peak, v); dd = Math.min(dd, (v / peak - 1) * 100);
    }
    const last = d[d.length - 1];
    return { start: d[i0].t, end: last.t, value: v, fee, dd, sharePct: share * 100, btc: amount * eq(last.b) / eq(d[i0].b) };
  }
  toSeries(rows: string[][]): SeriesPoint[] { return rows.map((r) => ({ t: this.parseTs(r[0]), p: +r[1], b: +r[2] })); }

  ensureTf = async (tf: string) => {
    if (this.chartData[tf]) return;
    const d = await this.fetchCsv(tf + '.csv');
    this.chartData[tf] = this.toSeries(d.rows);
  };

  async loadIdx() {
    if (this.idx) return;
    // Son 2 yıl saatlik (hourly.csv), dışı günlük (daily.csv); saatlik gelmezse/eskirse günlük tamamlar.
    const [d, h] = await Promise.all([
      this.fetchCsv('daily.csv', '/data/indices/'),
      this.fetchCsv('hourly.csv', '/data/indices/').catch(() => ({ rows: [] as string[][] })),
    ]);
    const h0 = h.rows.length ? this.parseTs(h.rows[0][0]) : Infinity;
    const h1 = h.rows.length ? this.parseTs(h.rows[h.rows.length - 1][0]) : -Infinity;
    const rows = [...d.rows.filter((r) => this.parseTs(r[0]) < h0), ...h.rows, ...d.rows.filter((r) => this.parseTs(r[0]) > h1)];
    this.idx = { t: rows.map((r) => this.parseTs(r[0])), v: INDICES.map((_, i) => rows.map((r) => +r[i + 1])) };
  }
  toggleIdx = async (key: string) => {
    await this.loadIdx();
    const on = this.state.showIdx;
    this.setState({ showIdx: on.includes(key) ? on.filter((k) => k !== key) : [...on, key] }, () => this.drawChart());
  };
  // t anındaki son kapanış (hafta sonu/tatilde bir önceki gün); t0'a göre % getiri.
  idxClose(i: number, t: number) {
    const ts = this.idx!.t; let lo = 0, hi = ts.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ts[m] <= t) lo = m; else hi = m - 1; }
    return this.idx!.v[i][lo];
  }
  idxRet(i: number, t: number, t0: number) { return (this.idxClose(i, t) / this.idxClose(i, t0) - 1) * 100; }
  activeIdx() { return this.idx ? INDICES.map((x, i) => ({ ...x, i })).filter((x) => this.state.showIdx.includes(x.key)) : []; }

  // ---------- formatters ----------
  loc() { return ({ en: 'en-US', tr: 'tr-TR', ar: 'ar-u-nu-latn', zh: 'zh-Hans-u-nu-latn' } as const)[this.lang]; }
  // RTL'de '+12%' → '12%+' olarak görünmesin diye işaretli sayılar LTR yalıtılır (LRI … PDI).
  ltr(s: string) { return this.lang === 'ar' ? '\u2066' + s + '\u2069' : s; }
  fmtPct(v: number | null | undefined, dec = 1, sign = true) { if (v == null || isNaN(v)) return '-'; const s = v > 0 && sign ? '+' : ''; return this.ltr(s + v.toLocaleString(this.loc(), { minimumFractionDigits: dec, maximumFractionDigits: dec }) + '%'); }
  fmtX(m: number) { if (m >= 1000) return '×' + (m / 1000).toLocaleString(this.loc(), { maximumFractionDigits: m >= 10000 ? 0 : 1 }) + 'K'; return '×' + m.toLocaleString(this.loc(), { maximumFractionDigits: m >= 100 ? 0 : 1 }); }
  fmtNum(v: number, dec = 0) { return v.toLocaleString(this.loc(), { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  fmtDate(ts: number) { const d = new Date(ts); return d.toLocaleDateString(this.loc(), { day: '2-digit', month: 'short', year: 'numeric' }); }

  // ---------- handlers ----------
  toggleBtc = () => this.setState({ showBtc: !this.state.showBtc }, () => this.drawChart());
  toggleLog = () => this.setState({ log: !this.state.log }, () => this.drawChart());
  setViewChart = () => this.setState({ view: 'chart' }, () => setTimeout(() => this.drawChart(), 0));
  setViewMonthly = () => this.setState({ view: 'monthly' });
  setMetricPortfolio = () => this.setState({ metric: 'portfolio' });
  setMetricBtc = () => this.setState({ metric: 'btc' });
  selectTf = async (tf: string) => {
    const autoLog = (tf === '3y' || tf === '5y' || tf === 'all');
    await this.ensureTf(tf);
    this.setState({ tf, log: autoLog, selection: null }, () => this.drawChart());
  };
  clearSelection = () => { this.sel = null; this.setState({ selection: null }, () => this.drawChart()); };

  // ---------- chart ----------
  canvasRef = (el: HTMLCanvasElement | null) => {
    if (!el) return;
    if (this.canvas === el) return;
    this.canvas = el;
    if (this._ro) this._ro.disconnect();
    this._ro = new ResizeObserver(() => this.drawChart());
    this._ro.observe(el);
    this.attachChartEvents(el);
    this.drawChart();
  };

  getColors() {
    const cs = getComputedStyle(this.canvas!);
    const g = (k: string) => cs.getPropertyValue(k).trim();
    return { accent: g('--accent'), btc: g('--btc'), text: g('--text-dim'), mute: g('--text-mute'), grid: g('--grid'), surface: g('--surface'), bg: g('--bg-elev'), border: g('--border-2'), pos: g('--pos'), spx: g('--spx'), ndx: g('--ndx') };
  }

  curData(): SeriesPoint[] { return this.chartData[this.state.tf] || []; }

  drawChart() {
    const el = this.canvas, data = this.curData();
    if (!el || !data.length) return;
    const ctx = el.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    el.width = W * dpr; el.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const c = this.getColors();
    const padL = 54, padR = 14, padT = 14, padB = 26;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const eq = (x: number) => 1 + x / 100;
    const showBtc = this.state.showBtc, log = this.state.log;
    const t0 = data[0].t, t1 = data[data.length - 1].t;
    let lo = Infinity, hi = -Infinity;
    for (const d of data) { const vp = eq(d.p); lo = Math.min(lo, vp); hi = Math.max(hi, vp); if (showBtc) { const vb = eq(d.b); lo = Math.min(lo, vb); hi = Math.max(hi, vb); } }
    const idxOn = this.activeIdx();
    for (const x of idxOn) for (const d of data) { const v = eq(this.idxRet(x.i, d.t, t0)); lo = Math.min(lo, v); hi = Math.max(hi, v); }
    if (log) { lo = Math.max(lo, 0.05); }
    const pad = (hi - lo) * 0.06; const dlo = lo - pad, dhi = hi + pad;
    const X = (t: number) => padL + (t - t0) / (t1 - t0) * plotW;
    let Y: (v: number) => number;
    if (log) { const llo = Math.log(Math.max(lo * 0.9, 0.01)), lhi = Math.log(hi * 1.08); Y = (v) => padT + plotH - (Math.log(Math.max(v, 0.01)) - llo) / (lhi - llo) * plotH; this._yd = [Math.exp(llo), Math.exp(lhi)]; }
    else { Y = (v) => padT + plotH - (v - dlo) / (dhi - dlo) * plotH; this._yd = [dlo, dhi]; }
    this._X = X; this._Y = Y; this._padL = padL; this._plotW = plotW;
    ctx.font = "11px 'Space Mono', monospace";
    ctx.textBaseline = 'middle';
    const ticks = this.yTicks(this._yd[0], this._yd[1], log);
    ctx.strokeStyle = c.grid; ctx.fillStyle = c.mute; ctx.lineWidth = 1;
    for (const tk of ticks) { const y = Y(tk); if (y < padT - 1 || y > padT + plotH + 1) continue; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(this.tickLabel(tk), padL - 8, y); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const xt = this.xTicks(t0, t1, 5);
    for (const tt of xt) { const x = X(tt); ctx.fillStyle = c.mute; ctx.fillText(this.xLabel(tt, t1 - t0), x, padT + plotH + 7); }
    const sel = this.sel;
    if (sel) { const xa = X(data[sel.a].t), xb = X(data[sel.b].t); ctx.fillStyle = c.accent + '1f'; ctx.fillRect(Math.min(xa, xb), padT, Math.abs(xb - xa), plotH); ctx.strokeStyle = c.accent + '66'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(xa, padT); ctx.lineTo(xa, padT + plotH); ctx.moveTo(xb, padT); ctx.lineTo(xb, padT + plotH); ctx.stroke(); ctx.setLineDash([]); }
    if (showBtc) { ctx.strokeStyle = c.btc; ctx.lineWidth = 1.4; ctx.globalAlpha = .9; ctx.beginPath(); data.forEach((d, i) => { const x = X(d.t), y = Y(eq(d.b)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.globalAlpha = 1; }
    for (const x0 of idxOn) { ctx.strokeStyle = c[x0.key]; ctx.lineWidth = 1.4; ctx.globalAlpha = .9; ctx.beginPath(); data.forEach((d, i) => { const x = X(d.t), y = Y(eq(this.idxRet(x0.i, d.t, t0))); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.globalAlpha = 1; }
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, c.accent + '33'); grad.addColorStop(1, c.accent + '00');
    ctx.beginPath(); data.forEach((d, i) => { const x = X(d.t), y = Y(eq(d.p)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.lineTo(X(t1), padT + plotH); ctx.lineTo(X(t0), padT + plotH); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); data.forEach((d, i) => { const x = X(d.t), y = Y(eq(d.p)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.strokeStyle = c.accent; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    const hi2 = this.hoverI;
    if (hi2 != null && data[hi2]) {
      const d = data[hi2]; const x = X(d.t); ctx.strokeStyle = c.border; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + plotH); ctx.stroke(); ctx.setLineDash([]);
      const yp = Y(eq(d.p)); ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(x, yp, 3.5, 0, 7); ctx.fill();
      if (showBtc) { const yb = Y(eq(d.b)); ctx.fillStyle = c.btc; ctx.beginPath(); ctx.arc(x, yb, 3, 0, 7); ctx.fill(); }
      for (const x0 of idxOn) { ctx.fillStyle = c[x0.key]; ctx.beginPath(); ctx.arc(x, Y(eq(this.idxRet(x0.i, d.t, t0))), 3, 0, 7); ctx.fill(); }
      this.drawTooltip(ctx, x, d, c, W, padT, t0);
    }
  }

  drawTooltip(ctx: CanvasRenderingContext2D, x: number, d: SeriesPoint, c: Record<string, string>, W: number, padT: number, t0: number) {
    const lines = [this.fmtDate(d.t), this.t.legend_portfolio + ': ' + this.fmtPct(d.p, 1)];
    const colors = [c.mute, c.accent];
    if (this.state.showBtc) { lines.push('BTC: ' + this.fmtPct(d.b, 1)); colors.push(c.btc); }
    for (const x0 of this.activeIdx()) { lines.push(x0.label + ': ' + this.fmtPct(this.idxRet(x0.i, d.t, t0), 1)); colors.push(c[x0.key]); }
    ctx.font = "11px 'Space Mono', monospace";
    let w = 0; lines.forEach((l) => w = Math.max(w, ctx.measureText(l).width));
    const bw = w + 18, bh = lines.length * 15 + 12;
    let bx = x + 12; if (bx + bw > W - 4) bx = x - 12 - bw;
    const by = padT + 8;
    ctx.fillStyle = c.bg; ctx.strokeStyle = c.border; ctx.lineWidth = 1;
    this.roundRect(ctx, bx, by, bw, bh, 4); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => { ctx.fillStyle = colors[i]; ctx.font = (i === 0 ? '600 ' : '') + "11px 'Space Mono', monospace"; ctx.fillText(l, bx + 9, by + 7 + i * 15); });
  }
  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  yTicks(lo: number, hi: number, log: boolean) {
    if (log) {
      const out: number[] = []; const bases = [1, 2, 5]; const e = Math.floor(Math.log10(lo));
      for (let p = e; p <= Math.ceil(Math.log10(hi)); p++) { for (const b of bases) { const v = b * Math.pow(10, p); if (v >= lo * 0.9 && v <= hi * 1.1) out.push(v); } }
      return out.length ? out : [lo, hi];
    }
    const span = hi - lo; const step = this.niceStep(span / 5); const out: number[] = []; let v = Math.ceil(lo / step) * step;
    for (; v <= hi; v += step) out.push(v); return out;
  }
  niceStep(x: number) { const e = Math.pow(10, Math.floor(Math.log10(x))); const f = x / e; const nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10; return nf * e; }
  tickLabel(v: number) {
    if (v >= 1000) return '×' + (v / 1000).toLocaleString(this.loc(), { maximumFractionDigits: v >= 10000 ? 0 : 1 }) + 'K';
    if (v >= 10) return '×' + v.toLocaleString(this.loc(), { maximumFractionDigits: 0 });
    return '×' + v.toLocaleString(this.loc(), { maximumFractionDigits: 1 });
  }
  xTicks(t0: number, t1: number, n: number) { const out: number[] = []; for (let i = 0; i <= n; i++) out.push(t0 + (t1 - t0) * i / n); return out; }
  xLabel(ts: number, span: number) { const d = new Date(ts); if (span > 2 * 365 * 864e5) return '' + d.getFullYear(); const mo = d.toLocaleDateString(this.loc(), { month: 'short' }); return mo + ' ' + String(d.getFullYear()).slice(2); }

  attachChartEvents(el: HTMLCanvasElement) {
    const idxAt = (cx: number) => {
      const data = this.curData(); if (!data.length) return 0; const rect = el.getBoundingClientRect(); const x = cx - rect.left;
      const t0 = data[0].t, t1 = data[data.length - 1].t; const frac = (x - this._padL) / this._plotW; const tt = t0 + frac * (t1 - t0);
      let lo = 0, hi = data.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (data[m].t < tt) lo = m + 1; else hi = m; }
      return Math.max(0, Math.min(data.length - 1, lo));
    };
    let dragging = false, startI = 0;
    const move = (e: PointerEvent) => { const cx = e.clientX; this.hoverI = idxAt(cx); if (dragging) { const cur = idxAt(cx); this.sel = { a: Math.min(startI, cur), b: Math.max(startI, cur) }; } this.drawChart(); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => { this.hoverI = null; this.drawChart(); });
    el.addEventListener('pointerdown', (e) => { dragging = true; startI = idxAt(e.clientX); this.sel = { a: startI, b: startI }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointerup', () => { dragging = false; if (this.sel && Math.abs(this.sel.b - this.sel.a) > 1) { this.setState({ selection: { ...this.sel } }); } else { this.sel = null; this.setState({ selection: null }); } this.drawChart(); });
  }

  buildMonthly() {
    const map: Record<string, { m: string; p: number; b: number }> = {}; (this.monthly || []).forEach((r) => map[r.m] = r);
    const ymap: Record<string, { y: string; p: number; b: number }> = {}; (this.yearly || []).forEach((r) => ymap[r.y] = r);
    const years = [...new Set((this.monthly || []).map((r) => r.m.slice(0, 4)))];
    const metric = this.state.metric;
    const cell = (v: number | null) => {
      if (v == null || isNaN(v)) return { label: '', style: `padding:7px 4px;text-align:center;font-family:var(--font-display);font-size:12px;color:var(--text-mute);background:var(--surface-2);border-radius:2px;opacity:.4` };
      const a = Math.min(Math.abs(v) / 55, 1);
      const col = v >= 0 ? `color-mix(in srgb, var(--pos) ${10 + a * 72}%, transparent)` : `color-mix(in srgb, var(--neg) ${10 + a * 72}%, transparent)`;
      const tc = a >= 0.75 ? 'var(--bg)' : a >= 0.25 ? 'var(--text)' : (v >= 0 ? 'var(--pos)' : 'var(--neg)');
      return { label: this.ltr((v > 0 ? '+' : '') + v.toFixed(0)), style: `padding:7px 4px;text-align:center;font-family:var(--font-display);font-size:12px;font-weight:600;color:${tc};background:${col};border-radius:2px` };
    };
    return years.map((y) => {
      const cells = [];
      for (let m = 1; m <= 12; m++) { const key = y + '-' + String(m).padStart(2, '0'); const r = map[key]; const v = r ? (metric === 'portfolio' ? r.p : r.b) : null; cells.push(cell(v)); }
      const yr = ymap[y]; const yv = yr ? (metric === 'portfolio' ? yr.p : yr.b) : null;
      const yc = cell(yv);
      return { year: y, cells, yearLabel: yc.label, yearStyle: yc.style + ';font-weight:600;border:1px solid var(--border)' };
    });
  }

  render() {
    const wrap = sx(`max-width:1200px;margin:0 auto;padding:0 24px`);
    return (
      <div className="app" style={sx(`background:var(--bg);color:var(--text);font-family:var(--font-body)`)}>
        <div style={wrap}>
          {this.renderHero()}
          {this.renderPerformance()}
          {this.renderCalculator()}
        </div>
        {this.props.how}
        {this.props.trust}
        <div style={wrap}>
          {this.renderStrategy()}
          {this.renderTrades()}
          {this.renderAnalysis()}
          {this.renderFaq()}
          {this.renderGuide()}
          {this.renderCta()}
        </div>
        {this.renderLightbox()}
        {this.renderReferralModal()}
      </div>
    );
  }

  renderHero() {
    const t = this.t;
    const hb = this.heroBasic;
    const yrTxt = t.yr;
    const liveYears = Math.max(1, new Date().getFullYear() - 2025);
    const heroStats = hb ? [
      { value: this.heroAnnual != null ? this.fmtPct(this.heroAnnual, 0) : '···', label: t.st_annual, sub: t.st_annual_sub, color: 'var(--pos)' },
      { value: this.heroWorst1Y != null ? this.fmtPct(this.heroWorst1Y, 1) : '···', label: t.st_worst, sub: t.st_worst_sub, color: 'var(--accent)' },
      { value: liveYears + '+' + yrTxt, label: t.st_live, sub: t.st_live_sub, color: 'var(--text)' },
      { value: Math.floor(hb.years) + yrTxt, label: t.st_track, sub: hb.tradeCount + ' ' + t.st_track_sub, color: 'var(--text)' },
    ] : [0, 1, 2, 3].map(() => ({ value: '···', label: '', sub: '', color: 'var(--text-mute)' }));
    // data/binance.json + data/bybit.json toplamı (günlük action); dosyalar yoksa kart hiç gösterilmez.
    const fs = this.cfg.followerStats;
    // Kısaltma yok: tr'de compact "$103,5 B" (bin) milyar gibi okunuyordu.
    const usdFmt = { maximumFractionDigits: 0 } as const;
    const followerCard = fs?.portfolioUsd != null && fs?.followers != null && (
      <dl style={sx(`margin:0;padding:28px;border-radius:6px;border:1px solid var(--border);border-top:2px solid var(--accent);background:var(--surface);box-shadow:var(--shadow)`)}>
        <dt style={sx(`font-size:14px;color:var(--text-dim)`)}>{t.stat_portfolio}</dt>
        {/* "$" elle eklenir: bazı diller (ar) currency stilinde uzun "US$" üretip kartı taşırıyor. */}
        <dd data-count={fs.portfolioUsd} data-prefix="$" data-format={JSON.stringify(usdFmt)} style={sx(`margin:8px 0 0;font-family:var(--font-display);font-weight:700;font-size:36px;letter-spacing:-0.02em;font-variant-numeric:tabular-nums`)}>{'$' + new Intl.NumberFormat(this.loc(), usdFmt).format(fs.portfolioUsd)}</dd>
        <div style={sx(`margin-top:24px;padding-top:24px;border-top:1px solid var(--border)`)}>
          <dt style={sx(`font-size:14px;color:var(--text-dim)`)}>{t.stat_followers}</dt>
          <dd data-count={fs.followers} style={sx(`margin:8px 0 0;font-family:var(--font-display);font-weight:700;font-size:24px;letter-spacing:-0.02em;color:var(--pos);font-variant-numeric:tabular-nums`)}>{new Intl.NumberFormat(this.loc()).format(fs.followers)}</dd>
        </div>
      </dl>
    );
    return (
      <section style={sx(`padding:72px 0 40px`)}>
        <div className="hero-grid" style={sx(`display:grid;grid-template-columns:${followerCard ? 'minmax(0,1fr) 20rem' : '1fr'};gap:48px;align-items:center;margin-bottom:48px`)}>
        <div>
        <div style={sx(`display:inline-flex;align-items:center;gap:8px;padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:var(--surface);font-family:var(--font-display);font-size:12px;color:var(--text-dim);margin-bottom:26px`)}>
          <span style={sx(`width:7px;height:7px;border-radius:50%;background:var(--pos);animation:pulse 2s infinite`)}></span>{t.hero_badge}
        </div>
        <h1 style={sx(`font-family:var(--font-display);font-weight:600;font-size:clamp(34px,5vw,58px);line-height:1.04;letter-spacing:-1.5px;max-width:18ch;margin-bottom:22px`)}>{t.hero_title}</h1>
        <p style={sx(`font-size:clamp(16px,2vw,19px);color:var(--text-dim);max-width:60ch;line-height:1.6;margin-bottom:34px`)}>{t.hero_sub}</p>
        <div style={sx(`display:flex;gap:12px;flex-wrap:wrap`)}>
          <a href="#connect" className="lift" style={sx(`height:48px;padding:0 24px;border-radius:4px;background:var(--accent);color:var(--accent-contrast);font-weight:600;font-size:15px;text-decoration:none;display:inline-flex;align-items:center;gap:8px`)}>{t.hero_cta_primary} →</a>
        </div>
        </div>
        {followerCard}
        </div>
        <div style={sx(`display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px`)}>
          {heroStats.map((s, i) => (
            <div key={i} className="lift" style={sx(`padding:22px;border-radius:6px;border:1px solid var(--border);background:var(--surface);box-shadow:var(--shadow)`)}>
              <div style={sx(`font-family:var(--font-display);font-weight:600;font-size:34px;letter-spacing:-1px;color:${s.color};line-height:1`)}>{s.value}</div>
              <div style={sx(`font-size:13px;color:var(--text);font-weight:600;margin-top:10px`)}>{s.label}</div>
              <div style={sx(`font-size:12px;color:var(--text-mute);margin-top:3px;line-height:1.4`)}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  renderPerformance() {
    const t = this.t;
    const tfBtn = (active: boolean) => `height:30px;padding:0 13px;border-radius:4px;border:none;cursor:pointer;font-family:var(--font-display);font-size:12.5px;font-weight:600;transition:all .15s;${active ? 'background:var(--accent);color:var(--accent-contrast)' : 'background:transparent;color:var(--text-dim)'}`;
    const timeframes = ['3m', '6m', '1y', '3y', '5y', 'all'].map((id) => ({ id, label: t['tf_' + id], style: tfBtn(this.state.tf === id) }));
    const viewBtn = (active: boolean) => `height:30px;padding:0 16px;border-radius:4px;border:none;cursor:pointer;font-family:var(--font-body);font-size:13px;font-weight:600;transition:all .15s;${active ? 'background:var(--accent);color:var(--accent-contrast)' : 'background:transparent;color:var(--text-dim)'}`;
    const ctrlBtn = (active: boolean) => `height:32px;padding:0 12px;border-radius:4px;border:1px solid ${active ? 'var(--accent)' : 'var(--border)'};background:${active ? 'color-mix(in srgb,var(--accent) 14%,transparent)' : 'var(--surface-2)'};color:${active ? 'var(--accent)' : 'var(--text-dim)'};cursor:pointer;font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:7px;transition:all .15s`;
    const metBtn = (active: boolean) => `height:28px;padding:0 13px;border-radius:2px;border:none;cursor:pointer;font-size:12.5px;font-weight:600;${active ? 'background:var(--accent);color:var(--accent-contrast)' : 'background:transparent;color:var(--text-dim)'}`;
    const data = this.curData(); const lastP = data.length ? data[data.length - 1].p : null;
    const chartHeadValue = lastP != null ? this.fmtPct(lastP, 1) : '···';
    const chartHeadMult = lastP != null ? this.fmtX(1 + lastP / 100) : '';
    const chartHeadColor = lastP == null ? 'var(--text)' : (lastP >= 0 ? 'var(--pos)' : 'var(--neg)');
    let hasSelection = false, selReturn = '', selBtc = '', selDates = '', selColor = 'var(--pos)';
    let selIdx: { key: string; label: string; color: string; v: string }[] = [];
    const sel = this.state.selection;
    if (sel && data.length) {
      const a = data[sel.a], b = data[sel.b]; const eq = (x: number) => 1 + x / 100;
      const rp = (eq(b.p) / eq(a.p) - 1) * 100; const rb = (eq(b.b) / eq(a.b) - 1) * 100;
      selIdx = this.activeIdx().map((x) => ({ ...x, v: this.fmtPct(this.idxRet(x.i, b.t, a.t), 1) }));
      hasSelection = true; selReturn = this.fmtPct(rp, 1); selBtc = this.fmtPct(rb, 1); selColor = rp >= 0 ? 'var(--pos)' : 'var(--neg)'; selDates = this.fmtDate(a.t) + ' → ' + this.fmtDate(b.t);
    }
    const monthLabels = Array.from({ length: 12 }, (_, m) => new Date(2000, m, 1).toLocaleDateString(this.loc(), { month: 'short' }));
    const monthlyRows = this.state.ready ? this.buildMonthly() : [];
    const isChartView = this.state.view === 'chart', isMonthlyView = this.state.view === 'monthly';

    return (
      <section id="performance" style={sx(`padding:56px 0`)}>
        <div style={sx(`display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:24px`)}>
          <div>
            <div style={sx(`font-family:var(--font-display);font-size:12px;color:var(--accent);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px`)}>{t.perf_eyebrow}</div>
            <h2 style={sx(`font-family:var(--font-display);font-weight:600;font-size:clamp(26px,3.5vw,38px);letter-spacing:-.8px`)}>{t.perf_title}</h2>
          </div>
          <div style={sx(`display:inline-flex;padding:4px;border-radius:4px;border:1px solid var(--border);background:var(--surface)`)}>
            <button onClick={this.setViewChart} style={sx(viewBtn(isChartView))}>{t.view_chart}</button>
            <button onClick={this.setViewMonthly} style={sx(viewBtn(isMonthlyView))}>{t.view_monthly}</button>
          </div>
        </div>

        <div style={sx(`border:1px solid var(--border);border-radius:6px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden`)}>
          <div style={sx(`display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:18px 20px;border-bottom:1px solid var(--border)`)}>
            <div style={sx(`display:inline-flex;padding:3px;border-radius:4px;background:var(--surface-2);gap:2px`)}>
              {timeframes.map((tf) => (
                <button key={tf.id} onClick={() => this.selectTf(tf.id)} style={sx(tf.style)}>{tf.label}</button>
              ))}
            </div>
            <div style={sx(`display:flex;align-items:center;gap:8px`)}>
              <button onClick={this.toggleBtc} style={sx(ctrlBtn(this.state.showBtc))}>
                <span style={sx(`width:9px;height:9px;border-radius:2px;background:var(--btc)`)}></span>{t.compare_btc}
              </button>
              {INDICES.map((x) => (
                <button key={x.key} onClick={() => this.toggleIdx(x.key)} style={sx(ctrlBtn(this.state.showIdx.includes(x.key)))}>
                  <span style={sx(`width:9px;height:9px;border-radius:2px;background:var(${x.color})`)}></span>{x.label}
                </button>
              ))}
              <button onClick={this.toggleLog} style={sx(ctrlBtn(this.state.log))}>Log</button>
            </div>
          </div>

          {isChartView && (
            <div style={sx(`padding:20px 20px 8px`)}>
              <div style={sx(`display:flex;align-items:baseline;gap:20px;flex-wrap:wrap;margin-bottom:6px`)}>
                <div>
                  <div style={sx(`font-size:11px;color:var(--text-mute);font-family:var(--font-display);letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px;display:flex;align-items:center;gap:7px`)}><span style={sx(`width:14px;height:3px;border-radius:2px;background:var(--accent)`)}></span><span style={sx(`color:var(--accent);font-weight:600`)}>{t.legend_portfolio}</span> · {t.cumulative}</div>
                  <div style={sx(`display:flex;align-items:baseline;gap:6px`)}>
                    <span style={sx(`font-family:var(--font-display);font-weight:600;font-size:30px;letter-spacing:-.5px;color:${chartHeadColor}`)}>{chartHeadValue}</span>
                    <span style={sx(`font-size:13px;color:var(--text-mute)`)}>{chartHeadMult}</span>
                  </div>
                </div>
                {hasSelection && (
                  <div style={sx(`margin-inline-start:auto;display:flex;align-items:center;gap:16px;padding:10px 14px;border-radius:4px;background:var(--surface-2);border:1px solid var(--border)`)}>
                    <div>
                      <div style={sx(`font-size:10.5px;color:var(--text-mute);font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px`)}>{t.selected_range}</div>
                      <div style={sx(`font-size:12.5px;color:var(--text-dim);font-family:var(--font-display);margin-top:2px`)}>{selDates}</div>
                    </div>
                    <div style={sx(`text-align:end`)}>
                      <div style={sx(`font-family:var(--font-display);font-weight:600;font-size:20px;color:${selColor}`)}>{selReturn}</div>
                      <div style={sx(`font-size:11px;color:var(--btc);font-family:var(--font-display)`)}>BTC {selBtc}</div>
                      {selIdx.map((x) => <div key={x.key} style={sx(`font-size:11px;color:var(${x.color});font-family:var(--font-display)`)}>{x.label} {x.v}</div>)}
                    </div>
                    <button onClick={this.clearSelection} style={sx(`width:26px;height:26px;border-radius:4px;border:1px solid var(--border);background:var(--bg-elev);color:var(--text-dim);cursor:pointer;font-size:14px`)}>✕</button>
                  </div>
                )}
              </div>
              <div style={sx(`position:relative;width:100%;height:380px`)}>
                <canvas ref={this.canvasRef} style={sx(`width:100%;height:100%;display:block;cursor:crosshair;touch-action:none`)}></canvas>
              </div>
              <div style={sx(`display:flex;align-items:center;gap:18px;padding:10px 2px 6px;font-size:12px;color:var(--text-dim);flex-wrap:wrap`)}>
                <span style={sx(`display:inline-flex;align-items:center;gap:7px`)}><span style={sx(`width:14px;height:3px;border-radius:2px;background:var(--accent)`)}></span>{t.legend_portfolio}</span>
                {this.state.showBtc && <span style={sx(`display:inline-flex;align-items:center;gap:7px`)}><span style={sx(`width:14px;height:3px;border-radius:2px;background:var(--btc)`)}></span>{t.legend_btc}</span>}
                {this.activeIdx().map((x) => <span key={x.key} style={sx(`display:inline-flex;align-items:center;gap:7px`)}><span style={sx(`width:14px;height:3px;border-radius:2px;background:var(${x.color})`)}></span>{x.label}</span>)}
                <span style={sx(`margin-inline-start:auto;color:var(--text-mute);font-size:11.5px`)}>{this.state.showIdx.length > 0 && <>{t.idx_source} · </>}{t.chart_hint}</span>
              </div>
            </div>
          )}

          {isMonthlyView && (
            <div style={sx(`padding:18px 20px`)}>
              <div style={sx(`display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap`)}>
                <div style={sx(`display:inline-flex;padding:3px;border-radius:4px;background:var(--surface-2);gap:2px`)}>
                  <button onClick={this.setMetricPortfolio} style={sx(metBtn(this.state.metric === 'portfolio'))}>{t.legend_portfolio}</button>
                  <button onClick={this.setMetricBtc} style={sx(metBtn(this.state.metric === 'btc'))}>BTC</button>
                </div>
                <span style={sx(`font-size:12px;color:var(--text-mute);margin-inline-start:auto`)}>{t.monthly_hint}</span>
              </div>
              <div style={sx(`overflow-x:auto`)}>
                <table style={sx(`border-collapse:separate;border-spacing:3px;width:100%;min-width:760px`)}>
                  <thead>
                    <tr>
                      <th style={sx(`font-family:var(--font-display);font-size:11px;color:var(--text-mute);font-weight:500;text-align:start;padding:4px 8px`)}>{t.year}</th>
                      {monthLabels.map((m, i) => (
                        <th key={i} style={sx(`font-family:var(--font-display);font-size:11px;color:var(--text-mute);font-weight:500;padding:4px 0;text-align:center`)}>{m}</th>
                      ))}
                      <th style={sx(`font-family:var(--font-display);font-size:11px;color:var(--accent);font-weight:600;padding:4px 8px;text-align:center`)}>{t.year_total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows!.map((row, i) => (
                      <tr key={i}>
                        <td style={sx(`font-family:var(--font-display);font-size:12.5px;color:var(--text);font-weight:600;padding:4px 8px`)}>{row.year}</td>
                        {row.cells.map((c, j) => (
                          <td key={j} style={sx(c.style)}>{c.label}</td>
                        ))}
                        <td style={sx(row.yearStyle)}>{row.yearLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  renderCalculator() {
    const t = this.t;
    const amount = Number(this.state.calcAmount);
    const r = this.chartData.all ? this.calc(amount, this.parseTs(this.state.calcDate)) : null;
    const usd = (v: number) => (v < 0 ? '-$' : '$') + new Intl.NumberFormat(this.loc(), { maximumFractionDigits: 0 }).format(Math.abs(v));
    const pct = (v: number) => this.fmtPct((v / amount - 1) * 100, 1);
    const color = (v: number) => (v >= amount ? 'var(--pos)' : 'var(--neg)');
    const label = `display:flex;flex-direction:column;gap:5px;font-size:11px;color:var(--text-mute);font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px`;
    const input = `height:42px;padding:0 12px;border-radius:4px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:var(--font-display);font-size:15px`;
    const cell = `padding:18px 20px;border-radius:6px;background:var(--surface-2);border:1px solid var(--border)`;
    const cellLabel = `font-size:12.5px;color:var(--text-dim);margin-bottom:6px`;
    return (
      <section id="calculator" style={sx(`padding:56px 0`)}>
        <div style={sx(`margin-bottom:24px`)}>
          <div style={sx(`font-family:var(--font-display);font-size:12px;color:var(--accent);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px`)}>{t.calc_eyebrow}</div>
          <h2 style={sx(`font-family:var(--font-display);font-weight:600;font-size:clamp(26px,3.5vw,38px);letter-spacing:-.8px;margin-bottom:10px`)}>{t.calc_title}</h2>
          <p style={sx(`font-size:15px;color:var(--text-dim);max-width:62ch;line-height:1.6`)}>{t.calc_sub}</p>
        </div>
        <div style={sx(`border:1px solid var(--border);border-top:2px solid var(--accent);border-radius:6px;background:var(--surface);box-shadow:var(--shadow);padding:24px`)}>
          <div style={sx(`display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px`)}>
            <label style={sx(label)}>{t.calc_amount}
              <input type="number" inputMode="decimal" min="1" step="any" value={this.state.calcAmount} onChange={this.setCalcAmount} style={sx(input + ';width:180px')} />
            </label>
            <label style={sx(label)}>{t.calc_date}
              <input type="date" min={this.isoDate(this.allEnds[0].t)} max={this.isoDate(this.allEnds[1].t - 864e5)} value={this.state.calcDate} onChange={this.setCalcDate} style={sx(input)} />
            </label>
          </div>
          {!this.chartData.all ? (
            <div style={sx(`color:var(--text-mute);font-family:var(--font-display)`)}>···</div>
          ) : !r ? (
            <div style={sx(`color:var(--text-mute);font-size:14px`)}>{t.calc_invalid}</div>
          ) : (
            <div style={sx(`display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px`)}>
              <div style={sx(cell + ';border-color:var(--accent)')}>
                <div style={sx(cellLabel + ';display:flex;align-items:center;gap:7px')}><span style={sx(`width:14px;height:3px;border-radius:2px;background:var(--accent)`)}></span><span style={sx(`color:var(--accent);font-weight:600`)}>{t.legend_portfolio}</span> · {t.calc_value}</div>
                <div style={sx(`font-family:var(--font-display);font-weight:700;font-size:30px;color:${color(r.value)}`)}>{usd(r.value)}</div>
                <div style={sx(`font-size:13px;color:var(--text-dim);margin-top:4px`)}>{t.calc_profit}: {this.ltr(usd(r.value - amount))} ({pct(r.value)})</div>
              </div>
              <div style={sx(cell)}>
                <div style={sx(cellLabel)}>{t.calc_btc}</div>
                <div style={sx(`font-family:var(--font-display);font-weight:600;font-size:24px;color:var(--btc)`)}>{usd(r.btc)}</div>
                <div style={sx(`font-size:13px;color:var(--text-dim);margin-top:4px`)}>{pct(r.btc)}</div>
              </div>
              <div style={sx(cell)}>
                <div style={sx(cellLabel)}>{r.sharePct ? t.calc_fee.replace('{pct}', String(r.sharePct)) : t.calc_fee_off}</div>
                <div style={sx(`font-family:var(--font-display);font-weight:600;font-size:24px;color:var(--text)`)}>{r.sharePct ? usd(r.fee) : '-'}</div>
              </div>
              <div style={sx(cell)}>
                <div style={sx(cellLabel)}>{t.calc_dd}</div>
                <div style={sx(`font-family:var(--font-display);font-weight:600;font-size:24px;color:var(--neg)`)}>{this.fmtPct(r.dd, 1)}</div>
              </div>
            </div>
          )}
          <p style={sx(`margin-top:18px;font-size:12px;color:var(--text-mute);line-height:1.6`)}>
            {r && <>{this.fmtDate(r.start)} → {this.fmtDate(r.end)} · </>}{t.calc_note}
          </p>
        </div>
      </section>
    );
  }

  renderTrades() {
    const t = this.t;
    const tb = this.state.ready ? this.buildTrades() : { rows: [] as any[], total: 0, shown: 0, win: 0, loss: 0, avg: 0 };
    const sortLabel = this.state.tNewest ? t.sort_new : t.sort_old;
    return (
      <section id="trades" style={sx(`padding:56px 0`)}>
        <div style={sx(`margin-bottom:24px`)}>
          <div style={sx(`font-family:var(--font-display);font-size:12px;color:var(--accent);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px`)}>{t.trades_eyebrow}</div>
          <h2 style={sx(`font-family:var(--font-display);font-weight:600;font-size:clamp(26px,3.5vw,38px);letter-spacing:-.8px;margin-bottom:10px`)}>{t.trades_title}</h2>
          <p style={sx(`font-size:15px;color:var(--text-dim);max-width:62ch;line-height:1.6`)}>{t.trades_sub}</p>
        </div>
        <div style={sx(`border:1px solid var(--border);border-radius:6px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden`)}>
          <div style={sx(`display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap;padding:18px 20px;border-bottom:1px solid var(--border)`)}>
            <label style={sx(`display:flex;flex-direction:column;gap:5px;font-size:11px;color:var(--text-mute);font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px`)}>{t.filter_from}
              <input type="date" min={this.tMin} max={this.tMax} value={this.state.tFrom} onChange={this.setTFrom} style={sx(`height:38px;padding:0 10px;border-radius:4px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:var(--font-display);font-size:13px`)} />
            </label>
            <label style={sx(`display:flex;flex-direction:column;gap:5px;font-size:11px;color:var(--text-mute);font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px`)}>{t.filter_to}
              <input type="date" min={this.tMin} max={this.tMax} value={this.state.tTo} onChange={this.setTTo} style={sx(`height:38px;padding:0 10px;border-radius:4px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:var(--font-display);font-size:13px`)} />
            </label>
            <button onClick={this.resetTrades} style={sx(`height:38px;padding:0 14px;border-radius:4px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);font-size:13px;cursor:pointer;font-weight:500`)}>{t.filter_reset}</button>
            <button onClick={this.toggleSort} style={sx(`height:38px;padding:0 14px;border-radius:4px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);font-size:13px;cursor:pointer;font-weight:500;font-family:var(--font-display)`)}>⇅ {sortLabel}</button>
            <div style={sx(`margin-inline-start:auto;display:flex;gap:18px;align-items:center;font-size:13px`)}>
              <span style={sx(`color:var(--text-mute);font-family:var(--font-display);font-size:12px`)}>{tb.shown} / {tb.total} {t.trades_word}</span>
              <span style={sx(`color:var(--pos);font-family:var(--font-display);font-size:12px`)}>{tb.win} {t.wins}</span>
              <span style={sx(`color:var(--neg);font-family:var(--font-display);font-size:12px`)}>{tb.loss} {t.losses}</span>
              <span style={sx(`font-family:var(--font-display);font-size:12px;color:${tb.avg >= 0 ? 'var(--pos)' : 'var(--neg)'}`)}>{this.fmtPct(tb.avg, 1)} {t.avg_pnl}</span>
            </div>
          </div>
          <div style={sx(`max-height:540px;overflow:auto`)}>
            <table style={sx(`width:100%;border-collapse:collapse;min-width:640px`)}>
              <thead style={sx(`position:sticky;top:0;z-index:2`)}>
                <tr style={sx(`background:var(--surface-2)`)}>
                  <th style={sx(`text-align:start;padding:11px 20px;font-family:var(--font-display);font-size:11px;color:var(--text-mute);font-weight:500;text-transform:uppercase;letter-spacing:.5px`)}>{t.th_dir}</th>
                  <th style={sx(`text-align:start;padding:11px 12px;font-family:var(--font-display);font-size:11px;color:var(--text-mute);font-weight:500;text-transform:uppercase;letter-spacing:.5px`)}>{t.th_start}</th>
                  <th style={sx(`text-align:end;padding:11px 12px;font-family:var(--font-display);font-size:11px;color:var(--text-mute);font-weight:500;text-transform:uppercase;letter-spacing:.5px`)}>{t.th_entry}</th>
                  <th style={sx(`text-align:start;padding:11px 12px;font-family:var(--font-display);font-size:11px;color:var(--text-mute);font-weight:500;text-transform:uppercase;letter-spacing:.5px`)}>{t.th_end}</th>
                  <th style={sx(`text-align:end;padding:11px 12px;font-family:var(--font-display);font-size:11px;color:var(--text-mute);font-weight:500;text-transform:uppercase;letter-spacing:.5px`)}>{t.th_exit}</th>
                  <th style={sx(`text-align:end;padding:11px 12px;font-family:var(--font-display);font-size:11px;color:var(--text-mute);font-weight:500;text-transform:uppercase;letter-spacing:.5px`)}>{t.th_dur}</th>
                  <th style={sx(`text-align:end;padding:11px 20px;font-family:var(--font-display);font-size:11px;color:var(--text-mute);font-weight:500;text-transform:uppercase;letter-spacing:.5px`)}>{t.th_pnl}</th>
                </tr>
              </thead>
              <tbody>
                {tb.rows.map((r, i) => (
                  <tr key={i} style={sx(`border-top:1px solid var(--border);background:${r.rowBg}`)}>
                    <td style={sx(`padding:11px 20px`)}><span style={sx(`display:inline-block;padding:3px 9px;border-radius:2px;font-size:11.5px;font-weight:600;font-family:var(--font-display);color:${r.dirColor};background:${r.dirBg}`)}>{r.dir}</span></td>
                    <td style={sx(`padding:11px 12px;font-family:var(--font-display);font-size:12.5px;color:var(--text-dim)`)}>{r.start}</td>
                    <td style={sx(`padding:11px 12px;font-family:var(--font-display);font-size:12.5px;color:var(--text);text-align:end`)}>{r.entry}</td>
                    <td style={sx(`padding:11px 12px;font-family:var(--font-display);font-size:12.5px;color:var(--text-dim)`)}>{r.end}</td>
                    <td style={sx(`padding:11px 12px;font-family:var(--font-display);font-size:12.5px;color:var(--text);text-align:end`)}>{r.exit}</td>
                    <td style={sx(`padding:11px 12px;font-family:var(--font-display);font-size:12.5px;color:var(--text-mute);text-align:end`)}>{r.dur}</td>
                    <td style={sx(`padding:11px 20px;font-family:var(--font-display);font-size:13px;font-weight:600;color:${r.pnlColor};text-align:end`)}>{r.pnl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }

  renderAnalysis() {
    const t = this.t;
    const selStyle = `height:38px;padding:0 12px;border-radius:4px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-family:var(--font-display);font-size:13px;cursor:pointer;min-width:150px`;
    const perfStartOpts = (this.perfStarts || []).map((d) => ({ value: d, label: this.fmtDate(this.parseTs(d)) }));
    const perfEndOpts = (this.state.perfStart ? this.endsFor(this.state.perfStart) : []).map((d) => ({ value: d, label: this.fmtDate(this.parseTs(d)) }));
    const perf = this.buildPerf();
    return (
      <section id="analysis" style={sx(`padding:56px 0`)}>
        <div style={sx(`margin-bottom:24px`)}>
          <div style={sx(`font-family:var(--font-display);font-size:12px;color:var(--accent);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px`)}>{t.an_eyebrow}</div>
          <h2 style={sx(`font-family:var(--font-display);font-weight:600;font-size:clamp(26px,3.5vw,38px);letter-spacing:-.8px;margin-bottom:10px`)}>{t.an_title}</h2>
          <p style={sx(`font-size:15px;color:var(--text-dim);max-width:72ch;line-height:1.6`)}>{t.an_sub}</p>
        </div>

        <div className="an-grid" style={sx(`display:grid;grid-template-columns:1.25fr .85fr;gap:18px;align-items:start`)}>
          <div style={sx(`border:1px solid var(--border);border-radius:6px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden`)}>
            <div style={sx(`display:flex;gap:14px;flex-wrap:wrap;padding:18px 20px;border-bottom:1px solid var(--border)`)}>
              <label style={sx(`display:flex;flex-direction:column;gap:5px;font-size:11px;color:var(--text-mute);font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px`)}>{t.an_from}
                <select value={this.state.perfStart || ''} onChange={this.setPerfStart} style={sx(selStyle)}>
                  {perfStartOpts.map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label style={sx(`display:flex;flex-direction:column;gap:5px;font-size:11px;color:var(--text-mute);font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px`)}>{t.an_to}
                <select value={this.state.perfEnd || ''} onChange={this.setPerfEnd} style={sx(selStyle)}>
                  {perfEndOpts.map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            </div>
            {this.state.perfLoaded && perf && (
              <div style={sx(`padding:18px 20px`)}>
                <div style={sx(`display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:18px`)}>
                  <div style={sx(`padding:14px;border-radius:6px;background:var(--surface-2);border:1px solid var(--border)`)}>
                    <div style={sx(`font-size:11px;color:var(--text-mute);font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px`)}>{t.an_roi}</div>
                    <div style={sx(`font-family:var(--font-display);font-weight:600;font-size:24px;color:${perf.roiColor};line-height:1`)}>{perf.roi}</div>
                    <div style={sx(`font-size:11px;color:var(--text-mute);font-family:var(--font-display);margin-top:3px`)}>{perf.roiMult}</div>
                  </div>
                  <div style={sx(`padding:14px;border-radius:6px;background:var(--surface-2);border:1px solid var(--border)`)}>
                    <div style={sx(`font-size:11px;color:var(--text-mute);font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px`)}>{t.an_btc}</div>
                    <div style={sx(`font-family:var(--font-display);font-weight:600;font-size:24px;color:var(--btc);line-height:1`)}>{perf.broi}</div>
                    <div style={sx(`font-size:11px;color:var(--text-mute);font-family:var(--font-display);margin-top:3px`)}>{perf.broiMult}</div>
                  </div>
                  <div style={sx(`padding:14px;border-radius:6px;background:var(--surface-2);border:1px solid var(--border)`)}>
                    <div style={sx(`font-size:11px;color:var(--text-mute);font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px`)}>{t.an_maxdd}</div>
                    <div style={sx(`font-family:var(--font-display);font-weight:600;font-size:24px;color:var(--neg);line-height:1`)}>{perf.maxdd}</div>
                    <div style={sx(`font-size:10.5px;color:var(--text-mute);font-family:var(--font-display);margin-top:3px`)}>{perf.ddRange}</div>
                  </div>
                  <div style={sx(`padding:14px;border-radius:6px;background:var(--surface-2);border:1px solid var(--border)`)}>
                    <div style={sx(`font-size:11px;color:var(--text-mute);font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px`)}>{t.an_winrate}</div>
                    <div style={sx(`font-family:var(--font-display);font-weight:600;font-size:24px;color:var(--text);line-height:1`)}>{perf.winrate}</div>
                    <div style={sx(`font-size:11px;color:var(--text-mute);font-family:var(--font-display);margin-top:3px`)}>{perf.winLose}</div>
                  </div>
                </div>
                <div style={sx(`overflow-x:auto;margin:0 -2px`)}>
                  <table style={sx(`width:100%;min-width:380px;border-collapse:collapse`)}>
                    <thead>
                      <tr>
                        <th style={sx(`text-align:start;padding:9px 10px;font-family:var(--font-display);font-size:11px;color:var(--text-mute);font-weight:500;text-transform:uppercase;letter-spacing:.5px`)}>{t.an_window}</th>
                        <th style={sx(`text-align:end;padding:9px 10px;font-family:var(--font-display);font-size:11px;color:var(--accent);font-weight:600;text-transform:uppercase;letter-spacing:.5px`)}>{t.an_avg}</th>
                        <th style={sx(`text-align:end;padding:9px 10px;font-family:var(--font-display);font-size:11px;color:var(--text-mute);font-weight:500;text-transform:uppercase;letter-spacing:.5px`)}>{t.an_min}</th>
                        <th style={sx(`text-align:end;padding:9px 10px;font-family:var(--font-display);font-size:11px;color:var(--text-mute);font-weight:500;text-transform:uppercase;letter-spacing:.5px`)}>{t.an_max}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perf.rolling.map((rw, i) => (
                        <tr key={i} style={sx(`border-top:1px solid var(--border);${rw.dim}`)}>
                          <td style={sx(`padding:11px 10px;font-size:13.5px;font-weight:600;color:var(--text)`)}>{rw.win}</td>
                          <td style={sx(`padding:11px 10px;text-align:end;font-family:var(--font-display);font-size:13.5px;font-weight:600;color:var(--text)`)}>{rw.avg}</td>
                          <td style={sx(`padding:11px 10px;text-align:end;font-family:var(--font-display);font-size:13px;color:${rw.minColor}`)}>{rw.min}</td>
                          <td style={sx(`padding:11px 10px;text-align:end;font-family:var(--font-display);font-size:13px;color:var(--pos)`)}>{rw.max}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={sx(`font-size:12.5px;color:var(--text-mute);line-height:1.6;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)`)}>{t.an_note}</p>
              </div>
            )}
            {!this.state.perfLoaded && (
              <div style={sx(`padding:60px 20px;text-align:center;color:var(--text-mute);font-family:var(--font-display);font-size:13px`)}><span style={sx(`animation:pulse 1.4s infinite`)}>{t.an_loading}</span></div>
            )}
          </div>

          <div style={sx(`border:1px solid var(--border);border-radius:6px;background:var(--surface);box-shadow:var(--shadow);overflow:hidden`)}>
            <div style={sx(`padding:16px 20px;border-bottom:1px solid var(--border);font-family:var(--font-display);font-weight:600;font-size:15px`)}>{t.an_explainer}</div>
            <div style={sx(`padding:20px;display:flex;flex-direction:column;gap:16px`)}>
              <p style={sx(`font-size:13.5px;color:var(--text-dim);line-height:1.62`)}>{t.an_explain_b1}</p>
              <div style={sx(`display:flex;flex-direction:column;gap:9px;padding:16px;border-radius:6px;background:var(--surface-2);border:1px solid var(--border)`)}>
                <div style={sx(`display:flex;align-items:center;justify-content:space-between;font-family:var(--font-display);font-size:10px;color:var(--text-mute);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px`)}><span>{t.an_viz_full}</span><span>{t.an_viz_caption}</span></div>
                <div style={sx(`position:relative;height:13px;border-radius:4px;background:var(--border)`)}><div style={sx(`position:absolute;left:2%;top:0;bottom:0;width:30%;border-radius:4px;background:var(--accent);opacity:.95`)}></div></div>
                <div style={sx(`position:relative;height:13px;border-radius:4px;background:var(--border)`)}><div style={sx(`position:absolute;left:35%;top:0;bottom:0;width:30%;border-radius:4px;background:var(--accent);opacity:.7`)}></div></div>
                <div style={sx(`position:relative;height:13px;border-radius:4px;background:var(--border)`)}><div style={sx(`position:absolute;left:68%;top:0;bottom:0;width:30%;border-radius:4px;background:var(--accent);opacity:.5`)}></div></div>
              </div>
              <p style={sx(`font-size:13.5px;color:var(--text-dim);line-height:1.62`)}>{t.an_explain_b2}</p>
              <div style={sx(`display:flex;gap:8px`)}>
                <div style={sx(`flex:1;text-align:center;padding:9px 4px;border-radius:4px;background:color-mix(in srgb,var(--neg) 13%,transparent);font-family:var(--font-display);font-size:10.5px;font-weight:600;color:var(--neg);text-transform:uppercase;letter-spacing:.5px`)}>{t.an_res_min}</div>
                <div style={sx(`flex:1;text-align:center;padding:9px 4px;border-radius:4px;background:var(--surface-2);font-family:var(--font-display);font-size:10.5px;font-weight:600;color:var(--text);text-transform:uppercase;letter-spacing:.5px`)}>{t.an_res_avg}</div>
                <div style={sx(`flex:1;text-align:center;padding:9px 4px;border-radius:4px;background:color-mix(in srgb,var(--pos) 13%,transparent);font-family:var(--font-display);font-size:10.5px;font-weight:600;color:var(--pos);text-transform:uppercase;letter-spacing:.5px`)}>{t.an_res_max}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  renderStrategy() {
    const t = this.t;
    const strategyCards: { t: string; b: string }[] = t.strategy || [];
    return (
      <section id="strategy" style={sx(`padding:56px 0`)}>
        <div style={sx(`margin-bottom:24px`)}>
          <div style={sx(`font-family:var(--font-display);font-size:12px;color:var(--accent);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px`)}>{t.str_eyebrow}</div>
          <h2 style={sx(`font-family:var(--font-display);font-weight:600;font-size:clamp(26px,3.5vw,38px);letter-spacing:-.8px`)}>{t.str_title}</h2>
        </div>
        <div style={sx(`display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px`)}>
          {strategyCards.map((c, i) => (
            <div key={i} className="lift" style={sx(`padding:22px;border-radius:6px;border:1px solid var(--border);background:var(--surface);box-shadow:var(--shadow)`)}>
              <div style={sx(`font-family:var(--font-display);font-weight:600;font-size:17px;margin-bottom:9px;letter-spacing:-.3px`)}>{c.t}</div>
              <p style={sx(`font-size:14px;color:var(--text-dim);line-height:1.62`)}>{c.b}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  renderFaq() {
    const t = this.t;
    const faqItems: { q: string; a: string }[] = t.faq || [];
    return (
      <section id="faq" style={sx(`padding:56px 0`)}>
        <div style={sx(`margin-bottom:24px`)}>
          <div style={sx(`font-family:var(--font-display);font-size:12px;color:var(--accent);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px`)}>{t.faq_eyebrow}</div>
          <h2 style={sx(`font-family:var(--font-display);font-weight:600;font-size:clamp(26px,3.5vw,38px);letter-spacing:-.8px`)}>{t.faq_title}</h2>
        </div>
        <div style={sx(`display:flex;flex-direction:column;gap:10px;max-width:880px`)}>
          {faqItems.map((f, i) => {
            const open = this.state.faqOpen === i;
            const icon = open ? '−' : '+';
            const aStyle = `overflow:hidden;transition:max-height .3s ease,opacity .25s ease,padding .3s ease;` + (open ? `max-height:600px;opacity:1;padding:0 20px 18px` : `max-height:0;opacity:0;padding:0 20px`);
            return (
              <div key={i} style={sx(`border:1px solid var(--border);border-radius:6px;background:var(--surface);overflow:hidden`)}>
                <button onClick={() => this.setFaq(i)} style={sx(`width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:17px 20px;background:transparent;border:none;cursor:pointer;text-align:start;color:var(--text);font-family:var(--font-display);font-weight:500;font-size:15.5px`)}>
                  <span>{f.q}</span>
                  <span style={sx(`flex:none;width:24px;height:24px;border-radius:4px;background:var(--surface-2);display:grid;place-items:center;color:var(--accent);font-size:16px;font-weight:600`)}>{icon}</span>
                </button>
                <div style={sx(aStyle)}>
                  <p style={sx(`font-size:14px;color:var(--text-dim);line-height:1.65`)}>{f.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  renderGuide() {
    const t = this.t;
    const lang = this.lang;
    const cfg = this.cfg || { videos: [], referral: {} };
    const videos: { title: string; provider: string; open: () => void }[] = (cfg.videos || []).map((v: any, i: number) => ({ title: v.title[lang] ?? v.title.en, provider: v.provider, open: () => this.openVid(i) }));
    const step = (n: number) => `/assets/guide/step-${n}-${this.imgLang()}.jpeg`;
    const stepWebp = (n: number) => `/assets/guide/step-${n}-${this.imgLang()}.webp`;
    const stepAlt = (n: number) => `${t.gd_step_alt} ${n}`;
    const nums = [1, 2, 3, 4, 5, 6];
    return (
      <section id="guide" style={sx(`padding:56px 0`)}>
        <div style={sx(`margin-bottom:24px`)}>
          <div style={sx(`font-family:var(--font-display);font-size:12px;color:var(--accent);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px`)}>{t.gd_eyebrow}</div>
          <h2 style={sx(`font-family:var(--font-display);font-weight:600;font-size:clamp(26px,3.5vw,38px);letter-spacing:-.8px;margin-bottom:10px`)}>{t.gd_title}</h2>
          <p style={sx(`font-size:15px;color:var(--text-dim);max-width:62ch;line-height:1.6`)}>{t.gd_sub}</p>
        </div>
        <div style={sx(`display:flex;align-items:baseline;gap:12px;margin-bottom:14px;flex-wrap:wrap`)}>
          <span style={sx(`font-family:var(--font-display);font-size:12px;color:var(--text-mute);text-transform:uppercase;letter-spacing:.5px`)}>{t.gd_steps}</span>
          <span style={sx(`font-size:12px;color:var(--text-mute)`)}>· {t.gd_zoom_hint}</span>
        </div>
        <div style={sx(`display:flex;gap:14px;overflow-x:auto;padding:2px 2px 16px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch`)}>
          {nums.map((n) => (
            <div key={n} style={sx(`flex:none;width:184px;scroll-snap-align:start`)}>
              <div onClick={() => this.openImg(n - 1)} className="lift" style={sx(`position:relative;border-radius:6px;overflow:hidden;border:1px solid var(--border);background:#0d0d0d;box-shadow:var(--shadow);cursor:zoom-in`)}>
                <picture style={sx(`display:block;width:100%;aspect-ratio:922/2049`)}>
                  <source srcSet={stepWebp(n)} type="image/webp" />
                  <img src={step(n)} alt={stepAlt(n)} loading="lazy" width={922} height={2049} style={sx(`width:100%;height:100%;object-fit:cover;object-position:top center;display:block`)} />
                </picture>
                <span style={sx(`position:absolute;top:10px;inset-inline-start:10px;width:27px;height:27px;border-radius:4px;background:var(--accent);color:var(--accent-contrast);display:grid;place-items:center;font-family:var(--font-display);font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.35)`)}>{n}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={sx(`margin-top:34px`)}>
          <div style={sx(`font-family:var(--font-display);font-size:12px;color:var(--text-mute);text-transform:uppercase;letter-spacing:.5px;margin-bottom:14px`)}>{t.gd_videos}</div>
          <div style={sx(`display:flex;gap:14px;overflow-x:auto;padding:2px 2px 14px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch`)}>
            {videos.map((v, i) => (
              <div key={i} onClick={v.open} className="lift" style={sx(`flex:none;width:300px;scroll-snap-align:start;border:1px solid var(--border);border-radius:6px;overflow:hidden;background:var(--surface);box-shadow:var(--shadow);cursor:pointer`)}>
                <div style={sx(`position:relative;aspect-ratio:16/9;background:color-mix(in srgb,var(--accent) 10%,var(--surface-2));display:grid;place-items:center`)}>
                  <span style={sx(`width:54px;height:54px;border-radius:50%;background:var(--accent);display:grid;place-items:center;color:var(--accent-contrast);font-size:20px;padding-left:4px;box-shadow:0 4px 16px rgba(0,0,0,.25)`)}>▶</span>
                  <span style={sx(`position:absolute;top:11px;inset-inline-start:13px;font-family:var(--font-display);font-size:10.5px;font-weight:600;color:var(--text-dim);letter-spacing:.5px;text-transform:uppercase`)}>{v.provider}</span>
                </div>
                <div style={sx(`padding:13px 15px;font-size:14px;font-weight:600;color:var(--text)`)}>{v.title}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={this.openRefModal} className="lift" style={sx(`display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-top:30px;padding:24px 26px;border-radius:6px;border:1px solid var(--border);background:color-mix(in srgb,var(--accent) 7%,var(--surface));box-shadow:var(--shadow);cursor:pointer;width:100%;text-align:start`)}>
          <span style={sx(`flex:none;width:54px;height:54px;border-radius:6px;background:color-mix(in srgb,var(--accent) 20%,transparent);display:grid;place-items:center;color:var(--accent)`)}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><circle cx="9" cy="8" r="3.4"></circle><circle cx="16.6" cy="9.2" r="2.7"></circle><path d="M2.5 19.2c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5z"></path><path d="M15.2 14c2.9.1 5 1.9 5 4.8h-3.3c0-1.9-.6-3.5-1.7-4.8z"></path></svg>
          </span>
          <div style={sx(`flex:1;min-width:220px`)}>
            <div style={sx(`font-family:var(--font-display);font-weight:600;font-size:19px;letter-spacing:-.3px;color:var(--text);margin-bottom:5px`)}>{t.ref_title}</div>
            <div style={sx(`font-size:14px;color:var(--text-dim);line-height:1.55`)}>{t.ref_body}</div>
          </div>
          <span style={sx(`flex:none;display:inline-flex;align-items:center;gap:9px;height:46px;padding:0 22px;border-radius:6px;background:var(--accent);color:var(--accent-contrast);font-weight:600;font-size:15px`)}>{t.ref_btn} →</span>
        </button>
      </section>
    );
  }

  renderCta() {
    const t = this.t;
    return (
      <section id="connect" style={sx(`padding:40px 0 64px`)}>
        <div style={sx(`border:1px solid var(--border);border-radius:6px;overflow:hidden;background:var(--surface);box-shadow:var(--shadow)`)}>
          <div className="cta-grid" style={sx(`display:grid;grid-template-columns:1fr 1fr`)}>
            <div style={sx(`padding:clamp(28px,4vw,46px);display:flex;flex-direction:column;justify-content:center;gap:14px;background:color-mix(in srgb,var(--accent) 8%,var(--surface))`)}>
              <div style={sx(`font-family:var(--font-display);font-size:12px;color:var(--accent);letter-spacing:1px;text-transform:uppercase`)}>{t.cta_eyebrow}</div>
              <h2 style={sx(`font-family:var(--font-display);font-weight:600;font-size:clamp(24px,3vw,34px);letter-spacing:-.6px;line-height:1.12`)}>{t.cta_title}</h2>
              <p style={sx(`font-size:15px;color:var(--text-dim);line-height:1.6`)}>{t.cta_sub}</p>
              <a href={contactUrl} style={sx(`font-family:var(--font-display);font-size:13px;color:var(--accent);text-decoration:none;margin-top:2px`)}>{t.cta_contact} ↗</a>
            </div>
            <div style={sx(`padding:clamp(28px,4vw,46px);display:flex;flex-direction:column;gap:12px;justify-content:center;border-inline-start:1px solid var(--border)`)}>
              {exchanges.map((ex) => (
                <a key={ex.name} href={ex.url} target="_blank" rel="sponsored noopener" className="lift" style={sx(`display:flex;align-items:center;gap:14px;padding:15px 18px;border-radius:6px;background:var(--accent);color:var(--accent-contrast);text-decoration:none;font-weight:600;font-size:15px`)}>
                  <img src={ex.logo} alt="" style={sx(`width:34px;height:34px;border-radius:4px;object-fit:cover;flex:none`)} />
                  <span style={sx(`flex:1`)}>{ex.name + ' ' + t.cta_portfolio}</span>
                  <span style={sx(`font-size:17px`)}>→</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  renderLightbox() {
    const t = this.t;
    const lang = this.lang;
    const lb = this.state.lb;
    if (!lb) return null;
    const cfg = this.cfg || { videos: [] };
    let lbImg = '', lbImgWebp = '', lbEmbed = '', lbCaption = '', lbCounter = '';
    const isImage = lb.kind === 'image', isVideo = lb.kind === 'video';
    let lbAlt = '';
    if (isImage) { lbImg = `/assets/guide/step-${lb.i + 1}-${this.imgLang()}.jpeg`; lbImgWebp = `/assets/guide/step-${lb.i + 1}-${this.imgLang()}.webp`; lbCounter = `${lb.i + 1} / 6`; lbCaption = t.gd_steps || ''; lbAlt = `${t.gd_step_alt} ${lb.i + 1}`; }
    else { const v = (cfg.videos || [])[lb.i] || {}; lbEmbed = v.embed || ''; lbCounter = `${lb.i + 1} / ${(cfg.videos || []).length}`; lbCaption = v.title ? (v.title[lang] ?? v.title.en) : ''; }
    return (
      <div onClick={this.lbClose} style={sx(`position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.86);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px`)}>
        <button onClick={this.lbClose} aria-label="close" style={sx(`position:absolute;top:16px;right:16px;width:42px;height:42px;border-radius:6px;border:1px solid rgba(255,255,255,.18);background:rgba(20,24,28,.6);color:#fff;font-size:18px;cursor:pointer;z-index:2`)}>✕</button>
        <button onClick={this.lbPrev} aria-label="prev" style={sx(`position:absolute;left:12px;top:50%;transform:translateY(-50%);width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(20,24,28,.6);color:#fff;font-size:22px;cursor:pointer;z-index:2`)}>‹</button>
        <button onClick={this.lbNext} aria-label="next" style={sx(`position:absolute;right:12px;top:50%;transform:translateY(-50%);width:46px;height:46px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(20,24,28,.6);color:#fff;font-size:22px;cursor:pointer;z-index:2`)}>›</button>
        <div onClick={this.lbStop} style={sx(`display:flex;flex-direction:column;align-items:center;gap:14px;max-width:94vw`)}>
          {isImage && (
            <picture>
              <source srcSet={lbImgWebp} type="image/webp" />
              <img src={lbImg} alt={lbAlt} width={922} height={2049} style={sx(`max-height:80vh;max-width:min(90vw,440px);width:auto;height:auto;border-radius:6px;box-shadow:0 24px 60px rgba(0,0,0,.5);display:block`)} />
            </picture>
          )}
          {isVideo && (
            <div style={sx(`width:min(92vw,920px);aspect-ratio:16/9;border-radius:6px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.5);background:#000`)}>
              <iframe src={lbEmbed} title="video" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen style={sx(`width:100%;height:100%;border:0;display:block`)}></iframe>
            </div>
          )}
          <div style={sx(`display:flex;align-items:center;gap:12px;color:rgba(255,255,255,.85);font-family:var(--font-display);font-size:13px`)}>
            <span style={sx(`font-weight:600`)}>{lbCaption}</span>
            <span style={sx(`color:rgba(255,255,255,.5)`)}>{lbCounter}</span>
          </div>
        </div>
      </div>
    );
  }

  renderReferralModal() {
    const t = this.t;
    if (!this.state.refModal) return null;
    const refBinanceStyle = `display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:4px;border:2px solid ${this.state.refPlatform === 'binance' ? 'var(--accent)' : 'var(--border)'};background:${this.state.refPlatform === 'binance' ? 'color-mix(in srgb,var(--accent) 12%,transparent)' : 'var(--surface-2)'};color:var(--text);font-weight:600;font-size:14px;cursor:pointer`;
    const refBybitStyle = `display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:4px;border:2px solid ${this.state.refPlatform === 'bybit' ? 'var(--accent)' : 'var(--border)'};background:${this.state.refPlatform === 'bybit' ? 'color-mix(in srgb,var(--accent) 12%,transparent)' : 'var(--surface-2)'};color:var(--text);font-weight:600;font-size:14px;cursor:pointer`;
    const refSubmitStyle = `width:100%;height:48px;border-radius:6px;border:none;background:${this.state.refSubmitting ? 'var(--border)' : 'var(--accent)'};color:${this.state.refSubmitting ? 'var(--text-mute)' : 'var(--accent-contrast)'};font-weight:600;font-size:15px;cursor:${this.state.refSubmitting ? 'not-allowed' : 'pointer'}`;
    const refSubmitLabel = this.state.refSubmitting ? t.ref_submitting : t.ref_submit;
    const termsContent = this.buildTermsEl();
    return (
      <div onClick={this.closeRefModal} style={sx(`position:fixed;inset:0;z-index:210;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px`)}>
        <div onClick={this.stopProp} style={sx(`width:100%;max-width:520px;max-height:90vh;overflow-y:auto;border-radius:6px;background:var(--bg-elev);border:1px solid var(--border);box-shadow:0 24px 64px rgba(0,0,0,.4)`)}>
          <div style={sx(`display:flex;align-items:center;justify-content:space-between;padding:22px 24px 18px;border-bottom:1px solid var(--border)`)}>
            <div style={sx(`display:flex;align-items:center;gap:12px`)}>
              <span style={sx(`width:36px;height:36px;border-radius:4px;background:color-mix(in srgb,var(--accent) 18%,transparent);display:grid;place-items:center;color:var(--accent)`)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="9" cy="8" r="3.4"></circle><circle cx="16.6" cy="9.2" r="2.7"></circle><path d="M2.5 19.2c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5z"></path><path d="M15.2 14c2.9.1 5 1.9 5 4.8h-3.3c0-1.9-.6-3.5-1.7-4.8z"></path></svg>
              </span>
              <span style={sx(`font-family:var(--font-display);font-weight:600;font-size:17px;letter-spacing:-.3px`)}>{t.ref_modal_title}</span>
            </div>
            <button onClick={this.closeRefModal} style={sx(`width:34px;height:34px;border-radius:4px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-dim);cursor:pointer;font-size:16px;display:grid;place-items:center`)}>✕</button>
          </div>

          {this.state.refDone && (
            <div style={sx(`padding:40px 24px;text-align:center`)}>
              <div style={sx(`width:64px;height:64px;border-radius:6px;background:color-mix(in srgb,var(--pos) 15%,transparent);display:grid;place-items:center;margin:0 auto 18px;font-size:30px;color:var(--pos)`)}>✓</div>
              <div style={sx(`font-family:var(--font-display);font-weight:600;font-size:22px;color:var(--pos);margin-bottom:10px`)}>{t.ref_success_title}</div>
              <div style={sx(`font-size:14px;color:var(--text-dim);line-height:1.6;margin-bottom:24px`)}>{t.ref_success_body}</div>
              <div style={sx(`font-size:12px;color:var(--text-mute);font-family:var(--font-display)`)}>{t.ref_success_hint}</div>
            </div>
          )}

          {!this.state.refDone && (
            <div style={sx(`padding:22px 24px;display:flex;flex-direction:column;gap:18px`)}>
              <div>
                <div style={sx(`font-size:12px;color:var(--text-mute);font-family:var(--font-display);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px`)}>{t.ref_platform}</div>
                <div style={sx(`display:flex;gap:8px`)}>
                  <button onClick={this.setRefBinance} style={sx(refBinanceStyle)}>
                    <img src="/assets/logos/binance.png" alt="" style={sx(`width:18px;height:18px;border-radius:2px;object-fit:cover`)} /> Binance
                  </button>
                  <button onClick={this.setRefBybit} style={sx(refBybitStyle)}>
                    <img src="/assets/logos/bybit.png" alt="" style={sx(`width:18px;height:18px;border-radius:2px;object-fit:cover`)} /> Bybit
                  </button>
                </div>
              </div>

              <label style={sx(`display:flex;flex-direction:column;gap:6px`)}>
                <span style={sx(`font-size:13px;font-weight:600;color:var(--text)`)}>{t.ref_email} <span style={sx(`color:var(--neg)`)}>*</span></span>
                <input type="email" value={this.state.refEmail} onInput={this.onRefEmail} placeholder={t.ref_email_ph} style={sx(`height:44px;padding:0 14px;border-radius:4px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:14px;font-family:var(--font-body)`)} />
              </label>

              <label style={sx(`display:flex;flex-direction:column;gap:6px`)}>
                <span style={sx(`font-size:13px;font-weight:600;color:var(--text)`)}>{t.ref_ref_nick} <span style={sx(`color:var(--neg)`)}>*</span></span>
                <input type="text" value={this.state.refRefNick} onInput={this.onRefRefNick} placeholder={t.ref_ref_nick_ph} style={sx(`height:44px;padding:0 14px;border-radius:4px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:14px;font-family:var(--font-body)`)} />
              </label>

              <label style={sx(`display:flex;flex-direction:column;gap:6px`)}>
                <span style={sx(`font-size:13px;font-weight:600;color:var(--text)`)}>{t.ref_ref_id} <span style={sx(`color:var(--neg)`)}>*</span></span>
                <input type="text" inputMode="numeric" value={this.state.refRefID} onInput={this.onRefRefID} placeholder={t.ref_ref_id_ph} style={sx(`height:44px;padding:0 14px;border-radius:4px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:14px;font-family:var(--font-display)`)} />
                <span style={sx(`font-size:11.5px;color:var(--text-mute);line-height:1.5`)}>{t.ref_uid_hint}</span>
              </label>

              <label style={sx(`display:flex;flex-direction:column;gap:6px`)}>
                <span style={sx(`font-size:13px;font-weight:600;color:var(--text)`)}>{t.ref_new_nick} <span style={sx(`color:var(--neg)`)}>*</span></span>
                <input type="text" value={this.state.refNewNick} onInput={this.onRefNewNick} placeholder={t.ref_new_nick_ph} style={sx(`height:44px;padding:0 14px;border-radius:4px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font-size:14px;font-family:var(--font-body)`)} />
              </label>

              <div style={sx(`padding:14px;border-radius:4px;background:var(--surface-2);border:1px solid var(--border)`)}>
                {termsContent}
              </div>

              {!!this.state.refErr && (
                <div style={sx(`padding:11px 14px;border-radius:4px;background:color-mix(in srgb,var(--neg) 12%,transparent);border:1px solid var(--neg);font-size:13px;color:var(--neg)`)}>{this.state.refErr}</div>
              )}

              <button onClick={this.submitRef} style={sx(refSubmitStyle)}>{refSubmitLabel}</button>
            </div>
          )}
        </div>
      </div>
    );
  }
}
