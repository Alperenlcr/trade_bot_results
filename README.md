A single-page dashboard that visualizes the backtest and live-style performance of the Executor BTC Trend-Following Bot (v5), a professional cryptocurrency algorithmic trading system. View the dashboard at [https://www.executor-bot.com](https://www.executor-bot.com) (Turkish) or [https://www.executor-bot.com/en/](https://www.executor-bot.com/en/) (English).

# Executor Trading Bot — Website

Bitcoin (BTC) üzerinde çalışan, trend-takip esaslı algoritmik trading botu **Executor**'ün tanıtım ve performans sitesi. [Astro](https://astro.build) ile derlenir; `/` Türkçe, `/en/` İngilizce sürümdür. Açık / koyu tema desteği vardır.

Küçük özet veriler (`i18n.json`, `config.json`, `monthly.csv`, `yearly.csv`, `trades.csv`, varsayılan 1 yıllık seri) build zamanında sayfaya gömülür; büyük/nadiren kullanılan veriler (`performance.csv` ve diğer zaman aralığı CSV'leri) tarayıcıda çalışma anında `fetch` edilir — bu kısımlar `data/` güncellenince, rebuild olmadan bile anında günceldir.

**Önemli:** `assets/` ve `data/` klasörleri repo kökünde durur ve değiştirilmemelidir — günlük otomasyon `data/tables/*.csv` dosyalarını tam olarak bu yoldan güncelleyip push ediyor. Her push, GitHub Actions'ı tetikleyip siteyi otomatik yeniden derler ve yayınlar.

## Geliştirme

```
npm install
npm run dev       # http://localhost:4321
npm run build     # dist/ üretir (astro build + statik dosya kopyalama)
npm run preview   # üretilen dist/'i yerel olarak sun
```

## Klasör yapısı

```
.
├── src/
│   ├── layouts/BaseLayout.astro   # <head>, SEO/JSON-LD, tema CSS'i, locale'a göre
│   ├── pages/
│   │   ├── index.astro            # / (Türkçe, varsayılan)
│   │   └── en/index.astro         # /en/ (İngilizce)
│   ├── lib/loadSiteData.ts        # build-time veri okuma (data/i18n.json, config.json, küçük CSV'ler)
│   └── components/
│       ├── App.tsx                # tüm etkileşimli site (tema, grafik, tablolar, formlar)
│       └── styleUtil.ts           # inline CSS string → React style objesi yardımcı fonksiyonu
├── scripts/copy-static.mjs        # build sonrası assets/, CNAME, robots.txt, sitemap.xml, llms.txt
│                                   #   ve lazy-fetch edilen büyük CSV'leri dist/'e kopyalar
├── assets/
│   ├── logos/                     # binance.png, bybit.png, logo.png, favicon.ico
│   └── guide/                     # step-1..6-tr/en.jpeg (Binance/Bybit kurulum adımları)
└── data/
    ├── i18n.json                  # Tüm arayüz metinleri (tr / en)
    ├── config.json                # Platform linkleri, referans linki, videolar
    └── tables/                    # Tüm sayısal veri (CSV) — otomasyon burayı günceller
        ├── 3m.csv 6m.csv 1y.csv 3y.csv 5y.csv all.csv   # portföy + BTC birikimli getiri
        ├── daily.csv monthly.csv yearly.csv             # gün / ay / yıl serileri
        ├── trades.csv                                    # tüm işlem geçmişi
        └── performance.csv                               # rolling-window analiz tablosu
```

`google-apps-script.js` siteye dahil değildir — `data/config.json`'daki `referral.formEndpoint`'in işaret ettiği, ayrı olarak Google Apps Script'e deploy edilmiş referral-form backend'inin kaynak kodudur.

> **Uyarı:** Bu site finansal tavsiye değildir. Geçmiş performans gelecekteki sonuçları garanti etmez.
> İletişim: alperenlcr@gmail.com
