# Yayın öncesi / sonrası kontrol listesi

Astro + bot-ui geçişinden kalan, kod dışında yapılması gereken işler.

## Yayından önce

- [ ] **İletişim adresi** — `info@executortrading.com` (`src/data/contact.ts`). CTA'da açık yazılı + "Kopyala"
      düğmesi (mailto işleyicisi olmayan tarayıcılar boş sekme açıyor); header'daki "Contact Us" iletişim formunu açar (`#contact`).
- [ ] **İletişim formu (Apps Script güncellemesi — Alperen)** — CTA'daki "Mesaj gönder" formu referans formuyla aynı
      uç noktaya (`data/config.json` › `referral.formEndpoint`) `type: 'contact'` ile gidiyor. Script güncellenmeden
      canlıya çıkarsa mesajlar referans tablosuna yanlış satır olarak düşer, bu yüzden **önce**: Sheet › Extensions ›
      Apps Script › kodu `google-apps-script.js` ile değiştir → Deploy › Manage deployments › mevcut dağıtım › Edit ›
      Version: **New version** (URL aynı kalır) → Gmail ile gönderme iznini onayla. Test: formdan mesaj gönder →
      `info@executortrading.com`'a mail gelmeli (Yanıtla ziyaretçiye gider), tabloda "İletişim" sayfasında satır olmalı.
      Mail, script'in sahibi olan Google hesabından gönderilir; günlük sınır ~100.
- [ ] **Arapça ve Çince metinler** — `data/i18n.json` (dashboard) içindeki ar/zh çevirileri
      makine/yapay zekâ çevirisi; anadili olan birine okut.
- [ ] **Microsoft Clarity** (ısı haritası) — clarity.microsoft.com'da proje aç, proje ID'sini
      repo › Settings › Secrets and variables › Actions › **Variables**'a `PUBLIC_CLARITY_ID` adıyla ekle,
      sonra Actions › "Deploy to GitHub Pages" › Run workflow (`PUBLIC_` değişkenleri build anında gömülür).
      AEA/UK/CH ziyaretçileri için Clarity'nin onay API'si gerekebilir; ID eklenirken belgelerine bak.

## GitHub Pages yayını

Site GitHub Pages'te barınır. `.github/workflows/deploy.yml` `main`'e her push'ta (x'in günlük CSV push'u dahil)
ve "Update data" bittikten sonra (`workflow_run`; bot commit'leri push tetiklemediği için) build alıp yayınlar.

- [ ] **Pages kaynağı** — repo › Settings › Pages › Source: **GitHub Actions**.
- [ ] **Domain** — aynı sayfada Custom domain: `executortrading.com`, DNS doğrulanınca **Enforce HTTPS**.
      (Actions ile yayında `CNAME` dosyası kullanılmaz; alan adı buradan verilir.)
- [ ] **DNS** — kök (`executortrading.com`) A kayıtları: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
      `185.199.111.153`; `www` CNAME → `alperenlcr.github.io`. Eski Vercel kayıtları varsa (`cname.vercel-dns.com`,
      Vercel A kaydı) sil. Alan adı GitHub › Settings (hesap) › Pages › Verified domains'ten doğrulanabilir.
- [ ] **Repo görünürlüğü** — özel (private) repoda Pages ücretli GitHub planı ister.
- [ ] **Vercel projesi** — daha önce açıldıysa kapat/sil ki çift yayın ve alan adı çakışması olmasın.
- [ ] **Actions izinleri** — Settings › Actions › General › "Allow all actions" + Workflow permissions
      "Read and write" (`indices.yml` commit atıyor). Settings › Environments › `github-pages` ortamının
      deployment branch kuralı `main`'e izin vermeli (varsayılan).
- [ ] **İlk yayın** — Actions › "Deploy to GitHub Pages" › Run workflow; yeşil bitmeli, site açılmalı.
- [ ] **Günlük akış** — ertesi sabah Actions'ta "Update data" (~01:30 UTC) ve x push'undan sonra
      "Deploy to GitHub Pages" çalıştığını kontrol et.
- [ ] **Yönlendirmeleri doğrula** — `https://executortrading.com/en/` ana sayfaya geçmeli (meta refresh);
      `https://executortrading.com/tr` → `/tr/`'ye (Pages'in klasör yönlendirmesi); `www.executortrading.com` → kök adres.
- **Sınırlar:** sunucu yönlendirmesi yok (`/en/` 301 değil, meta refresh + canonical; dil yönlendirmesi yalnızca
  tarayıcı betiğiyle, Türkçe tarayıcıda İngilizce sayfa bir an görünür), önbellek başlığı ayarlanamaz
  (`/_astro/` dosyaları 10 dk önbellekte), önizleme ortamı yok (her `main` push'u doğrudan canlı).
  GitHub, Pages'in ticari/online iş sitesi için ücretsiz hosting olmadığını söylüyor; gri alan.

## Domain ve e-posta (`executortrading.com`, `info@executortrading.com`)

Kodda site adresi (`astro.config.mjs` › `site`, `sitemap.xml.ts`, `robots.txt`, `llms.txt`) ve varsayılan iletişim
adresi (`src/data/contact.ts`) güncellendi. Canonical, hreflang, OG ve sitemap adresleri build'de buradan üretilir.

- [ ] **E-posta** — `info@executortrading.com`'a dışarıdan test maili at, geldiğini gör. DNS'e Pages kayıtları
      girilirken MX, SPF (`TXT v=spf1 …`) ve DKIM kayıtlarına dokunulmamalı; kök A kayıtları MX'i etkilemez.
- [ ] **Search Console** — `executortrading.com` için yeni mülk aç (Alan adı mülkü, DNS TXT ile doğrulanır)
      ve sitemap'i buradan gönder (aşağıdaki SEO bölümü). Eski adres (`executor-bot.com`) hiç yayına
      çıkmadıysa başka işlem gerekmez; çıktıysa oradan yeni adrese yönlendirme kur.
- [ ] **GA4** — Yönetici › Veri akışları › web akışının adresini `https://executortrading.com` yap
      (ölçüm kimliği `G-FFNNFDNLZQ` aynı kalır, kod değişmez).
- [ ] **Clarity** — proje açılırken site adresi olarak `https://executortrading.com` gir.
- [ ] **Borsa profilleri ve sosyal hesaplar** — Binance/Bybit lider profilleri ve açılacak sosyal hesaplardaki
      site linki `https://executortrading.com` olmalı.

## Takipçi kartı (Binance + Bybit)

- [ ] **İlk çalışma** — Actions › "Update data" › Run workflow; `fetch-binance-stats` adımı yeşil olmalı.
      Değerler `data/binance.json`'a yazılır (AUM → "Assets under management", `currentCopyCount` →
      "Current copy traders"). Kaynak: Binance'in lead trader sayfasının kullandığı halka açık
      `bapi/.../lead-portfolio/detail` uç noktası (resmi API değil, habersiz değişebilir).
- [ ] **ABD IP engeli riski** — Binance ABD'den gelen istekleri engelleyebilir (HTTP 451/403) ve GitHub
      Actions sunucuları ABD'de. Adım kırmızı olursa: `node scripts/fetch-binance-stats.mjs` komutunu
      x günlük otomasyonuna ekletin (Türkiye'den çalışıyorsa sorun olmaz). Son başarılı değer
      sitede kalır; `data/binance.json` silinirse kart gizlenir.
- [ ] **Bybit ilk çalışma** — aynı workflow'da `fetch-bybit-stats` adımı yeşil olmalı. Değerler
      `data/bybit.json`'a yazılır (`aumE8 / 1e8` → sermaye, `currentFollowerCount` → takipçi); sitede
      Binance ile **toplamı** gösterilir. Şu an Bybit'te ikisi de 0.
- [ ] **Bybit bot koruması riski** — Bybit'in API'si Akamai arkasında; düz HTTP isteğini 403 ile
      reddediyor, bu yüzden script headless Chrome'da önce lider sayfasını açıp isteği sayfanın içinden
      atıyor. Yerelde (TR IP) çalışıyor; GitHub Actions'ın veri merkezi IP'lerinden Akamai yine
      engelleyebilir. Kırmızı olursa Binance'teki gibi x günlük otomasyonuna ekletin
      (makinede Chrome kurulu olmalı; farklı adla kuruluysa `CHROME=/yol/chrome` ile verilir).
- [ ] **Bybit aumE8 alanı** — Bybit'te AUM şu an 0 olduğu için `aumE8`'in gerçekten takipçi
      sermayesini gösterdiği doğrulanamadı. İlk takipçi geldiğinde sitedeki toplamı Bybit sayfasındaki
      değerle karşılaştır; yanlışsa script'te alan adını değiştir.
- [ ] **Bybit profil açıklaması** — Bybit lider profilindeki tanıtım yazısında hâlâ eski adres
      `xlcr.github.io/trade_bot_results/` geçiyor; `executortrading.com` ile güncelle.
      Profilde "Inactive" etiketi de görünüyor.
- **Not:** AUM USDT cinsinden, sitede `$` olarak gösteriliyor (USDT ≈ USD).

## Endeks verisi (S&P 500 / Nasdaq-100)

- [ ] **Action'ın ilk çalışması** — push sonrası GitHub › Actions › "Update data" › Run workflow.
      Yeşil bitmeli; FRED'de yeni kapanış varsa `data/indices/daily.csv` commit'i atılır.
      Repo › Settings › Actions › General › Workflow permissions "Read and write" olmalı.
- [ ] **Kullanım koşulları** — veri FRED'den çekiliyor ama S&P 500 (S&P Dow Jones Indices) ve
      Nasdaq-100 (Nasdaq) serileri kendi sahiplerinin telif koşullarına tabi. Ticari bir sitede
      grafik olarak göstermek için koşulları oku; gerekirse lisanslı bir kaynağa geç (yalnızca
      `scripts/fetch-indices.mjs` değişir).
- [ ] **FRED erişimi** — FRED kaynağı kısıtlarsa action kırmızı olur; mevcut CSV korunur, grafikte
      çizgiler son başarılı güne kadar gider. Birkaç gün üst üste kırmızıysa bak.
- [ ] **Yahoo saatlik veri** — son 2 yılın saatlik kapanışları (`data/indices/hourly.csv`) Yahoo Finance'in
      resmi olmayan API'sinden geliyor. Yahoo bulut IP'lerini zaman zaman engeller; ilk action loglarında
      `hourly.csv: N rows` satırını gör. Gelmezse dosya eski haliyle kalır ve grafik sonraki günleri
      günlük kapanışla tamamlar (kısa aralıklarda basamaklı görünüm geri gelir) — birkaç gün kırmızıysa bak.
      Kullanım koşulları FRED'dekiyle aynı soru: ticari kullanım için lisans gerekebilir. Grafikteki kaynak notu
      ("Endeks verisi: Yahoo Finance / FRED…") kaldırıldı; koşullar kaynak belirtmeyi şart koşuyorsa geri ekle.

## Geçmiş performans hesaplayıcı

- [ ] **Veri tutarsızlığı: `daily.csv` ↔ `all.csv`** — İki dosya aynı günler için farklı birikimli getiri
      veriyor. Örnek 2026-09-27: `daily.csv` %1.227.484, `all.csv` %1.098.716 (≈ %12 fark); 2026-09-16'da
      da `daily.csv` 1.026.573, `all.csv` (08:00) 918.119. Kısa dönemlerde sonuç neredeyse aynı (500 $,
      16.09.2026 → 597,9 $ / 598,3 $) ama 2018'den başlatınca fark büyüyor. x'e sor: hangisi doğru,
      fark nereden geliyor (mum başlangıcı/kapanışı, fonlama ücreti, farklı backtest sürümü?).
      Site şu an grafik, hero istatistikleri ve hesaplayıcı için **`all.csv`** kullanıyor.
- [ ] **Kâr payı oranı** — `data/config.json` › `calculator`: `deductProfitShare` (true/false) kâr payının
      düşülüp düşülmeyeceğini, `profitSharePct` oranı belirler (şu an 10; Bybit profilinde %10
      görünüyor). Binance'teki oranı kontrol et; farklıysa ortak bir oran seç ya da metni güncelle.
      Kâr payı high-water mark ile her veri noktasında (8 saatte bir) kesiliyor; borsaların günlük
      kesintisine yakın bir yaklaşım.
- [ ] **Hukuki metin** — kartın altında "simülasyondur, komisyon ve kayma dahil değil, geçmiş performans
      garanti etmez" notu var (4 dil). Gerekirse hukukçuya okut.
- **Not:** Hesaplayıcı `all.csv`'yi (~130 KB) ilk grafik çizildikten sonra arka planda çekiyor; sayfa
  açılış hızını etkilemiyor. Menüde "Performans"ın yanında `#calculator` bağlantısı var.

## Yayından sonra (SEO)

- [ ] **Search Console'a yeni sitemap'i gönder:** `https://executortrading.com/sitemap.xml`
      (24 adres, 4 dil × 6 sayfa).
- [ ] **`/tr/` için dizine ekleme iste** — Search Console › URL denetimi › `/tr/` ›
      "Dizine eklenmesini iste". Kök adres (`/`) önceden Türkçeydi, artık İngilizce; Google'ın
      Türkçe aramalarda `/tr/`'yi göstermeye geçmesi birkaç hafta sürebilir.
- [ ] **Eski `/en/` adresi** ana sayfaya yönlendiriyor (`astro.config.mjs` › `redirects`; meta refresh + canonical). Search
      Console'da birkaç hafta sonra `/en/`'nin "yönlendirmeli sayfa" olarak düştüğünü kontrol et.
- [ ] **Paylaşım önizlemesi** — ana sayfa ve `/tr/` linkini bir mesajlaşma uygulamasında ya da
      https://www.opengraph.xyz ile test et (`/og/{dil}.png` görünmeli).

## Bilgi (aksiyon gerekmez, beklenti)

- **GA4 artık çerez onayından sonra yükleniyor.** Onay vermeyen ziyaretçiler sayılmadığı için
  GA'daki ziyaret sayıları geçiş tarihinden itibaren düşük görünecek; bu gerçek bir trafik
  düşüşü değil. Aynısı Clarity ısı haritaları için de geçerli.
- **SSS 8 soru** (tekrar eden sorular birleştirildi/kaldırıldı). Eski Türkçe sitedeki Türkiye'ye özel soru kaldırıldı;
  gerekiyorsa `src/i18n/tr.json` › `faq.items`'a geri eklenebilir.
- **Arapça/Çince rehber ekran görüntüleri** İngilizce görselleri kullanıyor (yalnızca tr/en var).
- **Gizlilik metni** barındırma sağlayıcısı olarak GitHub (GitHub Pages)'i yazıyor (4 dil).
- **Endeks çizgileri** varsayılan açık (düğmelerle kapatılabilir); görünen aralığın başına göre yeniden bazlanır
  (fiyat endeksi, temettü hariç). Son 2 yıl saatlik, öncesi günlük; borsa kapalıyken (gece, hafta sonu, tatil) son fiyat düz devam eder.
- **`google-apps-script.js`** referral formunun ayrı backend'i; içinde site adresi ya da e-posta yok,
  domain değişikliğinden etkilenmez.
- **Ana sayfa sırası:** karşılama → performans → hesaplayıcı → strateji → işlemler → analiz → SSS →
  rehber (3 adımda başla → Binance ekran görüntüleri → videolar → referans) → CTA. "Neden Executor Trade?" bölümü (Features) ve "fonların kontrolü" (Trust) kaldırıldı;
  HowItWorks `HomePage.astro`'da isimli slot (`slot="how"`) olarak React adasına geçiyor, `renderGuide` başlığın altına koyuyor.
- **Sosyal medya (X, TikTok, Threads, YouTube):** hesaplar açılınca adresleri `data/config.json` › `social`'a yaz.
  Footer'da ikon olarak çıkar (boş olanlar gizli) ve Organization şemasındaki `sameAs`'e otomatik girer.
- **Analiz tablosundaki "en kötü" / "en iyi" tarih aralıkları** `performance.csv`'de yok; tarayıcı aynı getiriyi veren
  pencereyi bulup gösteriyor (mevcut verinin tamamında birebir eşleşiyor). İki değer farklı kaynaktan hesaplanıyor:
  en kötü `trades.csv`'deki işlem sınırlarından, en iyi `tables/daily.csv`'den (bu yüzden daily.csv artık siteye
  kopyalanıyor). Alperen'in hesaplama yöntemi değişirse ve eşleşme bulunamazsa tarih boş kalır, değer yine görünür.
  Kalıcı çözüm: otomasyona `MIN_ROLLING_{1M..2Y}_RANGE` / `MAX_ROLLING_…_RANGE` sütunlarının (`MAX_DRAWDOWN_RANGE`
  formatında) eklenmesi. Ayrıca MIN ile MAX'in farklı veriden hesaplanmasının bilerek yapılıp yapılmadığını ona sor.
- **Otomatik dil:** yalnızca kök adres (`/`) tarayıcı diline (`navigator.language`) göre `/tr/`, `/ar/` ya da `/zh/`'ye
  geçer; diğerleri İngilizce kalır. Alt sayfalar ve paylaşılan linkler yönlenmez. Dil menüsünden seçim yapılınca
  `lang` çerezi (1 yıl) yazılır ve yönlendirme bir daha çalışmaz. GitHub Pages'te sunucu kuralı olmadığı için
  İngilizce ana sayfanın `<head>`'indeki betik yapar (`src/layouts/BaseLayout.astro`).
