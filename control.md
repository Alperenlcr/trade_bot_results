# Yayın öncesi / sonrası kontrol listesi

Astro + bot-ui geçişinden kalan, kod dışında yapılması gereken işler.

## Yayından önce

- [ ] **İletişim adresi** — varsayılan `mailto:hello@executor-bot.com`. Bu adres gerçekten
      mail alıyor mu kontrol et; farklı bir adres/form kullanılacaksa Vercel › Project ›
      Settings › Environment Variables'a `PUBLIC_CONTACT_URL` olarak ekle (Production + Preview).
- [ ] **Arapça ve Çince metinler** — `data/i18n.json` (dashboard) içindeki ar/zh çevirileri
      makine/yapay zekâ çevirisi; anadili olan birine okut.
- [ ] **Microsoft Clarity** (ısı haritası) — clarity.microsoft.com'da proje aç, proje ID'sini
      Vercel › Environment Variables'a `PUBLIC_CLARITY_ID` adıyla ekle, sonra yeniden deploy et
      (`PUBLIC_` değişkenleri build anında gömülür).

## Barındırma kararı: GitHub Pages mi, Vercel mi?

| | GitHub Pages | Vercel |
|---|---|---|
| **Maliyet** | Ücretsiz | Ticari kullanım için Pro gerekiyor: kişi başı ~20 $/ay (Hobby ticari kullanıma izin vermiyor) |
| **Ticari kullanım** | GitHub, Pages'in "online iş/e-ticaret için ücretsiz hosting" olmadığını söylüyor; gri alan | Pro ile net izinli |
| **Yönlendirme ve başlıklar** | Yok. `/en/` için sayfa içi yönlendirme gerekiyordu, önbellek ayarı yapılamıyor | Gerçek 301 yönlendirme, `/_astro/` için uzun süreli önbellek (`vercel.json`) |
| **Önizleme** | Yok, her push doğrudan canlıya çıkar | Her branch/PR için ayrı önizleme adresi, tek tıkla geri alma |
| **Sunucu tarafı kod** | Yok, sadece statik dosya | Var. Örneğin Binance çağrısı Frankfurt'ta (`fra1`) çalışan bir fonksiyona alınabilir, bu da ABD IP engeli riskini tamamen çözer |
| **Deploy akışı** | Bizim yazdığımız `deploy.yml` | Repo bağlanınca otomatik; ortam değişkenleri panelden |
| **Otomasyon riski** | Yok; x push'u sorunsuz yayına çıkıyor | Özel repoda takım dışı commit engellenebilir (Deploy Hook ile çözülür) |
| **Karmaşıklık** | Her şey tek yerde | İkinci bir hesap ve platform; Actions yine GitHub'da kalıyor |
| **Performans** | İyi (Fastly CDN) | Biraz daha iyi, ama statik bir sitede fark küçük |

**Öneri:**
- Site tamamen statik olduğu için GitHub Pages teknik olarak yeterli.
- Pages'te kaybedilenler yalnızca 301 yönlendirmesi, önbellek ayarı ve önizleme; bunların SEO etkisi küçük.
- Vercel şu durumlarda parasını hak eder:
  - sitenin ticari olduğu kesinse ve lisans açısından içiniz rahat olsun istiyorsanız,
  - önizleme ve geri alma istiyorsanız,
  - Binance ABD IP'lerini engellerse ve çekme işini Frankfurt'taki bir fonksiyona almak gerekirse.
- Kod şu an Vercel'e göre ayarlı.
- **Pages'te kalınırsa:** `deploy.yml`, `CNAME` ve `src/pages/en/index.astro` (meta refresh) git
  geçmişinden geri getirilir, `copy-static.mjs`'e `CNAME` kopyası geri eklenir, gizlilik/çerez
  metinlerinde (4 dil) "Vercel" → "GitHub (GitHub Pages)" yapılır, `vercel.json` silinir ve
  aşağıdaki "Vercel'e taşıma" bölümü atlanır.

## Vercel'e taşıma

- [ ] **Vercel projesi** — vercel.com › Add New › Project › GitHub reposunu (`trade_bot_results`)
      içe aktar. Framework: Astro, Build: `npm run build`, Output: `dist` (otomatik algılanır).
      Node sürümü `package.json` › `engines` ile 24.x (Vercel'de Node 20 1 Ekim 2026'da kalkıyor).
- [ ] **Plan** — Hobby planı ticari kullanıma izin vermiyor (affiliate linkler + kâr payı ticari
      sayılır) → **Pro** plan gerekli.
- [ ] **x otomasyonu** — Vercel yalnızca repoya erişimi olan GitHub hesabının push'larında
      build alır; x günlük push'u ve `indices.yml` bot commit'leri de build tetiklemeli (aşağıdaki maddeye bak).
      İlk sabah (~06:05) Vercel › Deployments'ta yeni build çıktığını kontrol et.
- [ ] **Domain** — Vercel › Settings › Domains'e `www.executor-bot.com` ve `executor-bot.com` ekle
      (kök → www yönlendirmesi). DNS sağlayıcısında Vercel'in gösterdiği kayıtları gir
      (`www` CNAME → `cname.vercel-dns.com`, kök A → Vercel IP'si). Eski GitHub Pages kayıtlarını
      (185.199.108-111.153, `*.github.io` CNAME) sil.
- [ ] **GitHub Pages'i kapat** — repo › Settings › Pages › Source: None. (`deploy.yml` ve `CNAME`
      repodan silindi.) Bunu DNS Vercel'e geçip site açıldıktan **sonra** yap.
- [ ] **GitHub Actions açık kalmalı** — Site Vercel'e geçse de veri güncelleme GitHub'da çalışır:
      `.github/workflows/indices.yml` ("Update data") her gün 01:30 UTC'de `fetch-indices.mjs` (S&P /
      Nasdaq → `data/indices/daily.csv`), `fetch-binance-stats.mjs` ve `fetch-bybit-stats.mjs`
      (AUM + takipçi → `data/binance.json`, `data/bybit.json`) çalıştırıp commit'ler. Pages'i kapatırken **Actions'ı kapatma**;
      Settings › Actions › General › "Allow all actions" + Workflow permissions "Read and write".
- [ ] **Bot/x commit'leri Vercel'de build alıyor mu** — Vercel Pro'da özel (private) repolarda
      commit yazarı Vercel takımında değilse deploy "blocked" olabilir (x push'u ve
      `github-actions[bot]` commit'leri). Geçişten sonraki ilk sabah Deployments'ta ikisini de kontrol et.
      Engelleniyorsa: Vercel › Settings › Git › **Deploy Hooks**'tan bir URL oluştur, GitHub'a
      `VERCEL_DEPLOY_HOOK` secret'ı olarak ekle ve workflow'un sonuna
      `curl -fsS -X POST "$VERCEL_DEPLOY_HOOK"` adımı ekle (x push'undan sonrası için
      workflow'a ~06:30 UTC'lik ikinci bir cron da eklenebilir).
- [ ] **Yönlendirmeleri doğrula** — `curl -I https://www.executor-bot.com/en/` → `308/301` ve
      `location: /`; `curl -I https://www.executor-bot.com/tr` → `/tr/`'ye yönlenmeli.
- [ ] **Dil yönlendirmesini doğrula** — `curl -I -H 'Accept-Language: tr-TR,tr;q=0.9' https://www.executor-bot.com/`
      → `307` ve `location: /tr/` (aynısı `ar-SA` → `/ar/`, `zh-CN` → `/zh/`). `en-US` ile, başlıksız ya da
      `-H 'Cookie: lang=en'` eklenince → `200` (yönlendirme yok).

## Takipçi kartı (Binance + Bybit)

- [ ] **İlk çalışma** — Actions › "Update data" › Run workflow; `fetch-binance-stats` adımı yeşil olmalı.
      Değerler `data/binance.json`'a yazılır (AUM → toplam takipçi sermayesi, `currentCopyCount` →
      takip eden yatırımcı). Kaynak: Binance'in lead trader sayfasının kullandığı halka açık
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
      `xlcr.github.io/trade_bot_results/` geçiyor; `www.executor-bot.com` ile güncelle.
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

- [ ] **Search Console'a yeni sitemap'i gönder:** `https://www.executor-bot.com/sitemap.xml`
      (24 adres, 4 dil × 6 sayfa).
- [ ] **`/tr/` için dizine ekleme iste** — Search Console › URL denetimi › `/tr/` ›
      "Dizine eklenmesini iste". Kök adres (`/`) önceden Türkçeydi, artık İngilizce; Google'ın
      Türkçe aramalarda `/tr/`'yi göstermeye geçmesi birkaç hafta sürebilir.
- [ ] **Eski `/en/` adresi** ana sayfaya kalıcı yönlendirme veriyor (`vercel.json`). Search
      Console'da birkaç hafta sonra `/en/`'nin "yönlendirmeli sayfa" olarak düştüğünü kontrol et.
- [ ] **Paylaşım önizlemesi** — ana sayfa ve `/tr/` linkini bir mesajlaşma uygulamasında ya da
      https://www.opengraph.xyz ile test et (`/og/{dil}.png` görünmeli).

## Bilgi (aksiyon gerekmez, beklenti)

- **GA4 artık çerez onayından sonra yükleniyor.** Onay vermeyen ziyaretçiler sayılmadığı için
  GA'daki ziyaret sayıları geçiş tarihinden itibaren düşük görünecek; bu gerçek bir trafik
  düşüşü değil. Aynısı Clarity ısı haritaları için de geçerli.
- **SSS artık bot-ui'deki 12 soru.** Eski Türkçe sitedeki Türkiye'ye özel soru kaldırıldı;
  gerekiyorsa `src/i18n/tr.json` › `faq.items`'a geri eklenebilir.
- **Arapça/Çince rehber ekran görüntüleri** İngilizce görselleri kullanıyor (yalnızca tr/en var).
- **Gizlilik/çerez metinleri** barındırma sağlayıcısı olarak artık Vercel'i yazıyor (4 dil).
- **Endeks çizgileri** varsayılan açık (düğmelerle kapatılabilir); görünen aralığın başına göre yeniden bazlanır
  (fiyat endeksi, temettü hariç). Son 2 yıl saatlik, öncesi günlük; borsa kapalıyken (gece, hafta sonu, tatil) son fiyat düz devam eder.
- **`google-apps-script.js`** referral formunun ayrı backend'i; içindeki e-posta siteye çıkmıyor,
  dokunulmadı.
- **Ana sayfa sırası:** karşılama → performans → hesaplayıcı → 3 adımda başla → fonların kontrolü → strateji →
  işlemler → analiz → SSS → rehber → CTA. "Neden Executor Trade?" bölümü (Features) kaldırıldı; HowItWorks ve Trust
  `HomePage.astro`'da isimli slot (`slot="how"` / `slot="trust"`) olarak React adasına geçiyor.
- **Sosyal medya (X, TikTok, Threads, YouTube):** hesaplar açılınca adresleri `data/config.json` › `social`'a yaz.
  Footer'da ikon olarak çıkar (boş olanlar gizli) ve Organization şemasındaki `sameAs`'e otomatik girer.
- **Analiz tablosundaki "en kötü" / "en iyi" tarih aralıkları** `performance.csv`'de yok; tarayıcı aynı getiriyi veren
  pencereyi bulup gösteriyor (mevcut verinin tamamında birebir eşleşiyor). İki değer farklı kaynaktan hesaplanıyor:
  en kötü `trades.csv`'deki işlem sınırlarından, en iyi `tables/daily.csv`'den (bu yüzden daily.csv artık siteye
  kopyalanıyor). Alperen'in hesaplama yöntemi değişirse ve eşleşme bulunamazsa tarih boş kalır, değer yine görünür.
  Kalıcı çözüm: otomasyona `MIN_ROLLING_{1M..2Y}_RANGE` / `MAX_ROLLING_…_RANGE` sütunlarının (`MAX_DRAWDOWN_RANGE`
  formatında) eklenmesi. Ayrıca MIN ile MAX'in farklı veriden hesaplanmasının bilerek yapılıp yapılmadığını ona sor.
- **Otomatik dil:** yalnızca kök adres (`/`) tarayıcı diline (`Accept-Language`'ın ilk dili) göre `/tr/`, `/ar/` ya da `/zh/`'ye
  geçici (307) yönlenir; diğerleri İngilizce kalır. Alt sayfalar ve paylaşılan linkler yönlenmez. Dil menüsünden seçim
  yapılınca `lang` çerezi (1 yıl) yazılır ve yönlendirme bir daha çalışmaz. Kurallar `vercel.json`'da (Vercel sunucusu);
  GitHub Pages ve yerel önizleme için aynı mantık İngilizce ana sayfanın `<head>`'inde tarayıcı betiği olarak da var
  (`src/layouts/BaseLayout.astro`, `navigator.language`'a bakar). Vercel'de sunucu kuralı önce çalışır, betik yedek kalır. IP'deki ülkeye göre yapılmak istenirse kuraldaki
  `accept-language` yerine `x-vercel-ip-country` başlığı (ör. `"value": "TR"`) kullanılır.



