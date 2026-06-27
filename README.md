A single-page dashboard that visualizes the backtest and live-style performance of the Executor BTC Trend-Following Bot (v5), a professional cryptocurrency algorithmic trading system. View the [dashboard](https://alperenlcr.github.io/trade_bot_results/) in your browser.
# Executor Trading Bot — Website

Bitcoin (BTC) üzerinde çalışan, trend-takip esaslı algoritmik trading botu **Executor**'ün tanıtım ve performans sitesi.

Türkçe / İngilizce dil ve açık / koyu tema desteği vardır. Tüm grafik, tablo ve analizler `data/` klasöründeki gerçek CSV verisinden çalışma anında üretilir; veriler güncellenince site otomatik güncellenir.

## Klasör yapısı

```
.
├── index.html              # Site (tek dosya, çalışma anında veriyi çeker)
├── support.js              # Çalışma zamanı (gereklidir, beraber yayınlanmalı)
├── README.md
├── assets/
│   ├── logos/              # binance.png, bybit.png, logo.png
│   └── guide/              # step-1.jpeg … step-6.jpeg (Binance kurulum adımları)
└── data/
    ├── i18n.json           # Tüm arayüz metinleri (tr / en)
    ├── config.json         # Platform linkleri, referans linki, videolar
    └── tables/             # Tüm sayısal veri (CSV)
        ├── 3m.csv 6m.csv 1y.csv 3y.csv 5y.csv all.csv   # portföy + BTC birikimli getiri
        ├── daily.csv monthly.csv yearly.csv             # gün / ay / yıl serileri
        ├── trades.csv                                    # tüm işlem geçmişi
        └── performance.csv                               # rolling-window analiz tablosu
```


> **Uyarı:** Bu site finansal tavsiye değildir. Geçmiş performans gelecekteki sonuçları garanti etmez.
> İletişim: alperenlcr@gmail.com
