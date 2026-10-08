---
title: Rolling-window analizi nedir? En kötü dönem nasıl okunur
description: Bir stratejiyi tek başlangıç tarihiyle değil, her olası giriş anıyla değerlendirmek; en kötü, ortalama ve en iyi getiri ile maksimum düşüş nasıl okunur.
pubDate: 2026-10-08
key: rolling-window
---

**Rolling-window (hareketli aralık) analizi**, sabit uzunlukta bir dönemin (örneğin 1 yıl) tüm geçmiş boyunca gün gün kaydırılıp her başlangıç noktası için o dönemin getirisinin hesaplanmasıdır. Sonra bu getirilerin en kötüsü, ortalaması ve en iyisi raporlanır. Böylece tek bir şanslı zamanlamayı değil, hangi an başlarsanız başlayın karşılaşabileceğiniz sonuç aralığını görürsünüz.

Bu yazıda yöntemin neden önemli olduğunu, [ana sayfadaki analiz panelinin](/tr/#analysis) her sütununun ne anlama geldiğini ve sonuçları okurken nelere dikkat etmeniz gerektiğini anlatıyoruz.

## Tek bir tarih aralığına bakmak neden yanıltır?

Bir stratejinin "şu tarihten bu yana yüzde şu kadar getiri" şeklinde sunulan sonucu, büyük ölçüde seçilen başlangıç tarihine bağlıdır. Bir düşüşün dibinden başlatılan bir grafik olduğundan iyi, bir zirveden başlatılan grafik olduğundan kötü görünür. Buna **başlangıç tarihi yanlılığı** denir.

Trend-takip stratejilerinde bu etki daha da belirgindir. [ExecutorBTC](/tr/#strategy) gibi trend-takip sistemleri getirinin büyük kısmını az sayıdaki büyük piyasa hareketinden elde eder; aradaki yatay dönemlerde küçük kayıplar yaşanabilir. Bu yüzden büyük bir trendin hemen öncesinde ya da hemen sonrasında başlamak, kısa vadede çok farklı sonuçlar doğurur.

Okurun asıl sorusu genellikle şudur: "Ben bugün başlasam ne olur?" Bugünün nasıl bir an olduğunu bilemeyiz. Rolling-window analizi bu soruyu, geçmişteki **her** olası başlangıç anını deneyerek cevaplamaya çalışır.

## Hareketli pencere nasıl hesaplanır?

Yöntem dört adımdan oluşur:

1. **Pencere uzunluğu seçilir:** 1 ay, 3 ay, 6 ay, 1 yıl veya 2 yıl.
2. **Pencere kaydırılır:** Pencere geçmişin en başına yerleştirilir, sonra gün gün ileri kaydırılır.
3. **Her konum için getiri hesaplanır:** Pencerenin başındaki ve sonundaki portföy değeri karşılaştırılır.
4. **Sonuçlar özetlenir:** Tüm bu getirilerin en kötüsü, ortalaması ve en iyisi raporlanır.

![Bir sermaye eğrisinin altında, aynı uzunluktaki dört pencerenin birbiriyle örtüşerek sağa kaydırıldığını gösteren şematik çizim](/images/blog/rolling-window-kayan-pencere-tr.webp)

Pencereler birbiriyle örtüşür: 1 yıllık pencere bugünden başlıyorsa, yarından başlayan pencere de neredeyse aynı günleri içerir. Yöntem geçmişi parçalara bölmez; olası tüm "bu tarihte başlasaydım" senaryolarını tek tek dener.

### Basit bir örnek

Aşağıdaki rakamlar **tamamen varsayımsaldır**, yalnızca hesabın mantığını göstermek içindir. Diyelim ki 3 aylık pencereyi beş farklı başlangıç noktasına yerleştirdik:

| Başlangıç noktası | 3 aylık getiri |
|---|---|
| A | +12% |
| B | +4% |
| C | −3% |
| D | +9% |
| E | +18% |

Bu durumda panel **en kötü** için −3%, **ortalama** için +8%, **en iyi** için +18% gösterir. Gerçek hesapta beş değil, geçmişteki her gün için bir değer vardır.

## Paneldeki sütunlar ne anlama geliyor?

[Analiz panelinde](/tr/#analysis) önce **Başlangıç işlemi** ve **Bitiş işlemi** seçilir; tüm hesaplar bu aralık içinde yapılır. Ardından şu değerler görünür:

| Sütun | Ne gösterir? |
|---|---|
| **Pencere** | Hesaplanan dönem uzunluğu: 1 ay, 3 ay, 6 ay, 1 yıl, 2 yıl. |
| **Ortalama** | O uzunluktaki tüm pencerelerin ortalama getirisi. |
| **En kötü** | En kötü zamanlamayla başlasaydınız elde edeceğiniz getiri. Altındaki tarih aralığı o pencerenin kendisidir. |
| **En iyi** | En iyi zamanlamayla elde edilecek getiri ve tarih aralığı. |
| **Dönem getirisi** | Seçilen aralığın başından sonuna toplam getiri. |
| **Aynı dönemde BTC** | Aynı aralıkta BTC'yi alıp tutmanın getirisi; karşılaştırma için. |
| **Maks. düşüş** | Aralık içinde portföyün bir tepeden sonraki dibe kadar yaşadığı en büyük kayıp ve tarihleri. |
| **Kazanan işlem** | Kârla kapanan işlemlerin oranı ve kazanan/kaybeden işlem sayısı. |

Seçilen aralık bir pencere uzunluğundan kısaysa o satır soluk görünür; o uzunlukta hesaplanacak pencere yoktur.

## "En kötü" sütunu neden en önemli?

Ortalama, size "genellikle" ne olduğunu söyler. **En kötü** ise "en şanssız anda girseydim ne olurdu?" sorusunu cevaplar. Bir stratejiye başlamadan önce sorulması gereken soru da genellikle budur: Beklentiniz değil, katlanabileceğiniz sınır.

![Her başlangıç noktası için pencere getirisini gösteren şematik çubuk grafik; en kötü çubuk kırmızı, en iyi çubuk yeşil, ortalama kesikli çizgiyle işaretli](/images/blog/rolling-window-dagilim-tr.webp)

Yukarıdaki şematik grafikte her çubuk bir başlangıç noktasıdır. Panel bu dağılımın tamamını değil, iki ucunu ve ortalamasını gösterir. En kötü değer pozitifse, o pencere uzunluğunda geçmişte hangi gün başlanırsa başlansın dönem kârla bitmiş demektir.

ExecutorBTC için panelde, 1 yıl ve üzeri pencerelerde en kötü değer tarihsel olarak hep pozitif olmuştur. Bu, geçmiş veriye dair bir gözlemdir; gelecekte de böyle olacağı anlamına gelmez. Güncel değerleri her zaman [panelden](/tr/#analysis) kontrol edin.

## Pencere uzunluğu sonucu nasıl değiştirir?

Kısa pencerelerde (1 ay, 3 ay) sonuçların dağılımı geniştir: en kötü ile en iyi arasındaki fark büyüktür, çünkü birkaç haftalık dönem tek bir trendin varlığına ya da yokluğuna bağlıdır. Pencere uzadıkça iyi ve kötü dönemler aynı pencereye girer ve birbirini dengeler; zamanlamanın etkisi azalır.

Bunun pratik anlamı şudur: Trend-takip stratejisini kısa süre deneyip bırakmak, sonucu büyük ölçüde şansa bırakmak demektir. Uzun pencerelerdeki sonuçlar, stratejinin genel karakterini daha iyi yansıtır.

Bir uyarı: Pencereler örtüştüğü için uzun pencerelerde birbirinden **bağımsız** gözlem sayısı azdır. Birkaç yıllık geçmişte 2 yıllık pencereden yüzlerce değer hesaplanır, ama bunların çoğu aynı günleri paylaşır. Bu yüzden uzun pencere sonuçlarını kesin bir kural gibi değil, güçlü bir gösterge gibi okuyun.

## Maksimum düşüş ile en kötü pencere aynı şey mi?

Hayır. İkisi farklı soruları cevaplar:

- **En kötü pencere**, sabit bir sürenin **sonundaki** getiriye bakar: "1 yıl sonra nerede olurdum?"
- **Maksimum düşüş**, yolda yaşanan en büyük kaybı ölçer: "Bir tepeden sonra hesabım en fazla ne kadar eridi?"

![Bir pencere içinde sermaye eğrisinin tepeden dibe sert düştüğünü ama pencerenin başlangıç seviyesinin üzerinde, pozitif bittiğini gösteren şematik çizim](/images/blog/rolling-window-dusus-tr.webp)

Bir pencere, içinde derin bir düşüş barındırıp yine de pozitif bitebilir. Bu yüzden iki değere birlikte bakın: En kötü pencere uzun vadeli sonucu, maksimum düşüş ise o sonuca ulaşırken katlanmanız gereken iniş-çıkışları gösterir. Düşüşe dayanamayıp yolun ortasında çıkan biri, pencere sonundaki getiriyi hiç göremez.

## Panelde kendiniz nasıl denersiniz?

1. Ana sayfada [Derinlemesine analiz](/tr/#analysis) bölümüne gidin.
2. **Başlangıç işlemi** ve **Bitiş işlemi** menülerinden incelemek istediğiniz aralığı seçin.
3. Tablodaki **En kötü** sütununu ve altındaki tarihleri okuyun; o dönemde neler olduğunu [işlem geçmişinden](/tr/#trades) kontrol edin.
4. **Dönem getirisi** ile **Aynı dönemde BTC**'yi karşılaştırın.
5. Farklı piyasa dönemlerini ayrı ayrı seçin: sert düşüş yaşanan yıllar, yatay geçen dönemler ve güçlü yükseliş dönemleri. Stratejinin her ortamda nasıl davrandığını görmek, tek bir toplam rakamdan daha çok şey anlatır.

Uzun vadeli genel tabloyu [performans grafiğinde](/tr/#performance) de inceleyebilirsiniz.

## Analizin sınırları nelerdir?

- **Geçmiş, geleceği garanti etmez.** Analiz yalnızca yaşanmış piyasa koşullarını kapsar; daha önce görülmemiş bir ortam farklı sonuç verebilir.
- **Veri canlı ve backtest sonuçlarını birlikte içerir.** ExecutorBTC 2025'ten beri canlı kullanımdadır; daha önceki dönem backtest'tir. Backtest'ler %100 sermaye kullanımını varsayar, canlıda ise ek güvenlik payı için genellikle ~%85 sermaye kullanılır.
- **Gerçek maliyetler farklı olabilir.** Komisyon, funding ücreti ve emirlerin gerçekleşme fiyatı hesaptan sapabilir.
- **Pencereler örtüşür.** Yüzlerce pencere değeri, yüzlerce bağımsız deneme anlamına gelmez.

Copy trading'in nasıl çalıştığını ve paranızın nerede durduğunu merak ediyorsanız [copy trading nedir](/tr/blog/copy-trading-nedir/) yazımıza göz atın.

## Riskler

Hiçbir strateji risksiz değildir. ExecutorBTC genellikle 2x kaldıraçla BTC vadeli işlem yapar; kaldıraç kayıpları büyütebilir ve kısa vadede düşüşler olabilir. Rolling-window analizindeki olumlu tarihsel sonuçlar gelecekteki getirinin garantisi değildir. Yalnızca kaybetmeyi göze alabileceğiniz sermaye ile işlem yapın. Ayrıntılar için [risk bildirimini](/tr/yasal/risk/) okuyun.
