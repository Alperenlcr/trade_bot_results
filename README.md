A single-page dashboard that visualizes the backtest and live-style performance of the Executor BTC Trend-Following Bot (v5), a professional cryptocurrency algorithmic trading system. View the dashboard at [https://www.executor-bot.com](https://www.executor-bot.com) (English, also /tr/, /ar/, /zh/).

# Executor Trade — Website

Bitcoin (BTC) üzerinde çalışan, trend-takip esaslı algoritmik trading botu **Executor Trade**'in tanıtım ve performans sitesi. [Astro](https://astro.build) + Tailwind ile derlenir. 4 dil: `/` İngilizce (varsayılan), `/tr/`, `/ar/` (RTL), `/zh/`. Tek (koyu) tema. Hakkımızda + 4 yasal sayfa, çerez onayı (GA4 ve Clarity yalnızca onayla yüklenir).

Küçük özet veriler (`i18n.json`, `config.json`, `monthly.csv`, `yearly.csv`, `trades.csv`, varsayılan 1 yıllık seri) build zamanında sayfaya gömülür; büyük/nadiren kullanılan veriler (`performance.csv` ve diğer zaman aralığı CSV'leri) tarayıcıda çalışma anında `fetch` edilir — bu kısımlar `data/` güncellenince, rebuild olmadan bile anında günceldir.

**Önemli:** `assets/` ve `data/` klasörleri repo kökünde durur ve değiştirilmemelidir — günlük otomasyon `data/tables/*.csv` dosyalarını tam olarak bu yoldan güncelleyip push ediyor. Site Vercel'de barınır; her push Vercel'de otomatik build + yayın tetikler (`vercel.json`: trailing slash, `/en/` → `/` 301, `/_astro/` önbellek başlıkları).

## Geliştirme

```
npm install
npm run dev       # http://localhost:4321
npm run check     # astro check (tip kontrolü)
npm run build     # dist/ üretir (astro build + statik dosya kopyalama)
npm run preview   # üretilen dist/'i yerel olarak sun
```

## Klasör yapısı

```
.
├── src/
│   ├── layouts/BaseLayout.astro   # <head> (SEO.astro), Header, Footer, CookieConsent
│   ├── pages/
│   │   ├── [...path].astro        # tüm dil × sayfa kombinasyonları (slug'lar: src/i18n/utils.ts)
│   │   ├── 404.astro
│   │   └── sitemap.xml.ts
│   ├── i18n/                      # site metinleri (en/tr/ar/zh.json) + getPath / useTranslations
│   ├── data/                      # contact.ts (PUBLIC_CONTACT_URL), exchanges.ts (affiliate linkleri)
│   ├── styles/global.css          # Tailwind, fontlar, marka token'ları, dashboard CSS değişkenleri
│   ├── lib/loadSiteData.ts        # build-time veri okuma (data/i18n.json, config.json, küçük CSV'ler)
│   └── components/
│       ├── App.tsx                # dashboard adası (grafik, tablolar, SSS, rehber, referral formu)
│       ├── HomePage.astro         # ana sayfa: App + sections/ (HowItWorks, Features, Trust)
│       └── styleUtil.ts           # inline CSS string → React style objesi yardımcı fonksiyonu
├── scripts/copy-static.mjs        # build sonrası assets/, robots.txt, sitemap.xml, llms.txt
│                                   #   ve lazy-fetch edilen büyük CSV'leri dist/'e kopyalar
├── scripts/fetch-indices.mjs      # FRED'den S&P 500 + Nasdaq-100 günlük kapanış → data/indices/daily.csv
├── scripts/fetch-binance-stats.mjs # Binance AUM + takipçi sayısı → data/binance.json (takipçi kartı)
├── scripts/fetch-bybit-stats.mjs  # Bybit AUM + takipçi sayısı → data/bybit.json (headless Chrome ile)
├── .github/workflows/indices.yml  # üç fetch script'ini her gün 01:30 UTC'de çalıştırıp commit'ler
├── assets/
│   ├── logos/                     # binance.png, bybit.png, logo.png, favicon.ico
│   └── guide/                     # step-1..6-tr/en.jpeg (Binance/Bybit kurulum adımları)
└── data/
    ├── i18n.json                  # Dashboard metinleri (en / tr / ar / zh)
    ├── config.json                # Platform linkleri, referans linki, videolar
    ├── binance.json, bybit.json   # Borsa başına AUM + takipçi; sitede toplamları (indices.yml günceller)
    ├── indices/daily.csv          # S&P 500 / Nasdaq-100 (indices.yml günceller; grafikte karşılaştırma)
    └── tables/                    # Tüm sayısal veri (CSV) — otomasyon burayı günceller
        ├── 3m.csv 6m.csv 1y.csv 3y.csv 5y.csv all.csv   # portföy + BTC birikimli getiri
        ├── daily.csv monthly.csv yearly.csv             # gün / ay / yıl serileri
        ├── trades.csv                                    # tüm işlem geçmişi
        └── performance.csv                               # rolling-window analiz tablosu
```

`google-apps-script.js` siteye dahil değildir — `data/config.json`'daki `referral.formEndpoint`'in işaret ettiği, ayrı olarak Google Apps Script'e deploy edilmiş referral-form backend'inin kaynak kodudur.

> **Uyarı:** Bu site finansal tavsiye değildir. Geçmiş performans gelecekteki sonuçları garanti etmez.
> İletişim: sitedeki iletişim bağlantısı (`PUBLIC_CONTACT_URL`, varsayılan `mailto:hello@executor-bot.com`).
