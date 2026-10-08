# Blog yazısı kuralları

Yazılar `src/content/blog/{dil}/{adres}.md` dosyalarıdır; `main`'e push edilince `deploy.yml` yayınlar.
Amaç iki: okuru bilgilendirmek ve arama motorlarında / yapay zekâ asistanlarında bulunmak.
Aşağıdaki kurallar bu ikisine hizmet eder.

## 1. Dosya ve frontmatter

```md
---
title: Copy trading nedir? ExecutorBTC'yi Binance ve Bybit'te takip etmek
description: Copy trading'in nasıl çalıştığı, paranızın neden kendi hesabınızda kaldığı ve takip etmeden önce bilinmesi gereken riskler.
pubDate: 2026-10-08
# updatedDate: 2026-11-02
key: copy-trading
# image: /images/blog/copy-trading.webp
---
```

| Alan | Kural |
|---|---|
| `title` | Ana anahtar kelime başta. ~60 karakteri geçmesin (Çince ~30 karakter). Sayfa başlığına otomatik ` — Executor Trading` eklenir; aramada kesilmesi sorun değil. |
| `description` | Arama sonucunda görünen özet: 120–155 karakter (Çince 60–80). Yazının ne cevapladığını tek cümlede söylesin, başlığı tekrar etmesin. |
| `pubDate` | `YYYY-AA-GG`. İleri tarih vermek yazıyı bekletmez, hemen yayınlanır. Taslaklar ayrı branch'te tutulur. |
| `updatedDate` | Yalnızca içerik anlamlı değiştiğinde (yeni bölüm, düzeltilen bilgi). Yazım hatası için değil. |
| `key` | Aynı yazının tüm çevirilerinde aynı. Dil menüsü ve hreflang bununla eşleşir. Yayından sonra değiştirmeyin. |
| `image` | İsteğe bağlı paylaşım görseli: `public/images/blog/` altına, 1200×630, `.webp`/`.png`. Yoksa dilin varsayılan görseli kullanılır. |

Frontmatter alanı eksik ya da tarih hatalıysa `npm run check` / `npm run build` hata verir; bilinmeyen dil klasörü de build'i durdurur.

## 2. Adres (dosya adı)

- Dosya adı = URL: `tr/copy-trading-nedir.md` → `/tr/blog/copy-trading-nedir/`.
- Küçük harf, tire ile ayrılmış, 3–5 kelime, Türkçe karakter yok (`ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c`).
- **tr** ve **en**: o dilin anahtar kelimeleriyle. **ar** ve **zh**: İngilizce adresle aynı (Arapça/Çince karakterli adresler paylaşılınca okunaksız kodlara dönüşür).
- **Yayından sonra adres değiştirilmez.** GitHub Pages sunucu yönlendirmesi yapamaz; eski link kırılır ve kazanılan sıralama kaybolur. Zorunluysa `astro.config.mjs` › `redirects`'e eski → yeni satırı eklenir.

## 3. Gövde yapısı

- Başlık (`h1`) `title`'dan otomatik gelir; gövdede `#` kullanmayın. Bölümler `##`, alt bölümler `###`; seviye atlamayın.
- **İlk paragraf sorunun cevabıdır.** 1–2 cümlede net tanım/cevap, ardından ayrıntı. Google'ın öne çıkan sonuçları ve yapay zekâ asistanları en çok bu cümleyi alıntılar.
- `##` başlıkları, okurun aramaya yazacağı sorular gibi olsun: "Paranız kimde duruyor?", "Nasıl başlanır?".
- Kısa paragraflar (2–4 cümle). Adımlar ve özellikler için liste, karşılaştırma için tablo.
- Bir yazı = bir konu. İki ayrı soruyu iki ayrı yazıda cevaplayın; birbirine link verin.
- Uzunluk sınırı yok; soruyu eksiksiz cevaplayacak kadar (genellikle 600–1500 kelime). Doldurma cümle ve anahtar kelime tekrarı yazmayın.
- Adlar her yerde aynı: **ExecutorBTC** (strateji/bot), **Executor Trading** (marka), **copy trading** (tr/en), **نسخ التداول** (ar), **跟单** (zh).
- Yazı sonuna "Canlı performansı gör" düğmesi ve risk uyarısı otomatik eklenir; gövdede tekrar etmeyin.

## 4. Linkler

- Site içi linkler dil önekli ve sondaki `/` ile: `/tr/yasal/risk/`, `/legal/risk/`, `/ar/legal/risk/`.
  Türkçe adresler çevrilmiştir (`/tr/hakkimizda/`, `/tr/yasal/gizlilik/` …), tam liste `src/i18n/utils.ts` › `slugOverrides`.
- Ana sayfa bölümleri: `/tr/#performance`, `#strategy`, `#trades`, `#analysis`, `#faq`, `#guide`, `#contact`.
- Her yazı en az bir ilgili yazıya ve ilgili ana sayfa bölümüne link versin. Link metni açıklayıcı olsun ("buraya tıklayın" değil).
- Dış linkler yalnızca güvenilir kaynaklara (borsaların resmî sayfaları vb.).

## 5. İçerik doğruluğu ve uyum

- **Finansal tavsiye değildir.** "Kazandırır", "garanti", "risksiz" gibi ifadeler yok. Getiri vaadi yok.
- Kaldıraç, risk veya getiri geçen her yazıda kısa bir **Riskler** bölümü olsun ve [risk bildirimine](/tr/yasal/risk/) link versin.
- **Değişen rakamları yazıya yazmayın.** Getiri, AUM, takipçi sayısı her gün değişir; yazı eskir ve sitedeki panelle çelişir. Bunun yerine performans paneline link verin.
- Ticari şartları (kâr payı oranı, referans koşulları vb.) yazıya yazmayın; değişebilirler, ilgili sayfaya/bölüme link verin.
- Strateji hakkındaki her bilgi sitedeki metinle tutarlı olsun (`data/i18n.json` › `strategy`). Sitede olmayan bir iddia eklemeden önce doğrulayın.

## 6. Görseller

- `public/images/blog/` altına `.webp`, genişlik ~1200 px, ~200 KB altı. Gövdede: `![Ne gösterdiğini anlatan metin](/images/blog/dosya.webp)`.
- Alt metin zorunlu ve görselin içeriğini anlatsın (erişilebilirlik + görsel arama).
- Görselde metin varsa her dil için ayrı görsel (`…-tr.webp`, `…-en.webp`).

## 7. Çeviriler

- Her dil ayrı dosya, aynı `key`. Bir dilde çeviri yoksa sorun değil: dil menüsü o dilin blog listesine gider.
- Çeviri birebir değil yerelleştirilmiş olsun: başlık ve açıklama o dilde aranan ifadelerle.
- Arapça ve Çince metinleri yayından önce anadili olan birine okutun.

## 8. Yayın öncesi kontrol listesi

- [ ] `npm run check` hatasız
- [ ] `npm run build` hatasız; yazı `dist/{dil}/blog/{adres}/index.html` olarak üretildi
- [ ] `npm run preview` ile: yazı ve blog listesi görünüyor, dil menüsü çevirilere gidiyor, linkler çalışıyor, `/ar/` sağdan sola düzgün
- [ ] Başlık ve açıklama uzunlukları uygun, ilk paragraf soruyu cevaplıyor
- [ ] Değişen rakam, ticari şart veya getiri vaadi yok; riskler bölümü ve risk bildirimi linki var
- [ ] Yayından sonra (varsa) Google Search Console › URL denetimi ile dizine eklemeyi isteyin; sitemap otomatik güncellenir
