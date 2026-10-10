# LrWebs — Yayın Rehberi

LrWebs, içeriğini `data/` klasöründeki JSON dosyalarında tutar. Bu nedenle **kalıcı diski olan bir Node.js sunucusunda** çalışmalıdır.

| Platform | Uygun mu? | Not |
| --- | --- | --- |
| VPS + Docker (Hetzner, DigitalOcean, Turhost, AWS Lightsail…) | ✅ Önerilen | Bu rehberin ana yolu; HTTPS otomatik |
| Railway / Render / Fly.io | ✅ | Dockerfile + `/app/data` kalıcı diski ile |
| Vercel / Netlify / Cloudflare Pages | ❌ | Dosya sistemi kalıcı değil; admin kayıtları kaybolur |

---

## Yol A — VPS + Docker Compose (önerilen)

**Gerekenler:** Ubuntu 22.04/24.04 sunucu (en az 1 GB RAM), bir alan adı, 80 ve 443 portları açık.

### 1. Alan adını sunucuya yönlendirin

DNS panelinizde bir **A kaydı** oluşturun: `lrwebs.com → SUNUCU_IP` (isterseniz `www` için de).

### 2. Sunucuya Docker kurun

```bash
curl -fsSL https://get.docker.com | sh
```

### 3. Projeyi sunucuya aktarın

Git deposu kullanıyorsanız:

```bash
git clone <depo-adresiniz> lrwebs && cd lrwebs
```

Ya da kendi bilgisayarınızdan kopyalayın (node_modules ve .next olmadan):

```bash
scp -r Dockerfile docker-compose.yml docker-entrypoint.mjs .dockerignore .env.example package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs eslint.config.mjs instrumentation.ts app components lib types public deploy kullanici@SUNUCU_IP:~/lrwebs/
```

```bash
ssh kullanici@SUNUCU_IP "mkdir -p ~/lrwebs/data" && scp data/cms-store.json kullanici@SUNUCU_IP:~/lrwebs/data/
```

> Yerel `data/` klasörünün tamamını kopyalamayın: içinde yerel form mesajları ve oturum anahtarı bulunur.

> `data/cms-store.json` imaja **başlangıç içeriği** olarak girer. Şu anki içerik (sizin düzenlemeleriniz dahil) ilk açılışta sitede görünür.

### 4. Ortam değişkenlerini ayarlayın

```bash
cp .env.example .env
nano .env
```

- `DOMAIN` — alan adınız (ör. `lrwebs.com`)
- `SITE_URL` — `https://lrwebs.com` (tanımlıysa paneldeki "Site adresi"nin yerine her zaman bu kullanılır; sitemap, canonical ve paylaşım önizlemeleri bu adresle üretilir)
- `ADMIN_PASSCODE` — **en az 12 karakter**; zayıf parolayla konteyner başlamaz
- `ADMIN_SESSION_SECRET` — şu komutun çıktısı:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

(Sunucuda Node yoksa: `openssl rand -hex 32`)

### 5. Başlatın

```bash
docker compose up -d --build
```

Birkaç dakika sonra `https://lrwebs.com` açılır. Caddy, Let's Encrypt sertifikasını otomatik alır ve yeniler.

Durumu ve günlükleri izlemek için:

```bash
docker compose ps
```

```bash
docker compose logs -f lrwebs
```

Günlükte `Açılış doğrulaması tamamlandı` satırını görmelisiniz.

### 6. İlk kurulum (tarayıcıda)

1. `https://lrwebs.com/admin` adresinden `ADMIN_PASSCODE` ile giriş yapın.
2. **Genel Ayarlar › Site Kimliği ve Sekme Ayarları:** sekme başlığı ve ikonu.
3. **Genel Ayarlar › Marka ve SEO:** site adresinin `https://` alan adınız olduğunu kontrol edin.
4. İletişim bilgileri, sosyal bağlantılar, KVKK ve Gizlilik metinlerini gerçek bilgilerle güncelleyin.
5. Örnek içerikleri (projeler, blog yazıları, istatistikler) kendi içeriğinizle değiştirin.

---

## Güncelleme (yeni sürüm yayınlama)

```bash
git pull
```

```bash
docker compose up -d --build
```

İçerik, mesajlar ve yüklenen dosyalar `lrwebs-data` volume'unda kalır. Yeni sürüm açılırken diskteki güncel içerikle sayfaları kendiliğinden yeniden üretir.

## Yedekleme

Tüm site verisi tek bir volume'dadır. Yedek almak için:

```bash
docker run --rm -v lrwebs_lrwebs-data:/data -v "$(pwd)":/backup alpine tar czf /backup/lrwebs-yedek-$(date +%F).tgz -C /data .
```

Geri yüklemek için:

```bash
docker compose down
```

```bash
docker run --rm -v lrwebs_lrwebs-data:/data -v "$(pwd)":/backup alpine sh -c "rm -rf /data/* /data/.[!.]* ; tar xzf /backup/lrwebs-yedek-TARIH.tgz -C /data"
```

```bash
docker compose up -d
```

> Volume adı proje klasörünün adına göre `<klasör>_lrwebs-data` olur. Doğru adı `docker volume ls` ile görebilirsiniz.

---

## Yol B — Railway / Render / Fly.io

1. Projeyi bir Git deposuna gönderin; platformda "Dockerfile ile dağıt" seçeneğini kullanın.
2. **Kalıcı disk (Volume)** ekleyin ve bağlama yolunu **`/app/data`** yapın. Bu adım zorunludur.
3. Ortam değişkenleri: `ADMIN_PASSCODE`, `ADMIN_SESSION_SECRET`, `SITE_URL` ve `TRUST_PROXY=1`. `DOMAIN` gerekmez; HTTPS'i platform sağlar.
4. Port: `3000`. Sağlık kontrolü yolu: `/api/health`.
5. Özel alan adınızı platformun panelinden bağlayın.

---

## Yayın öncesi kontrol listesi

- [ ] `ADMIN_PASSCODE` güçlü ve yalnızca sizde
- [ ] `ADMIN_SESSION_SECRET` rastgele üretildi
- [ ] `.env` dosyası Git'e eklenmedi (`.gitignore` bunu engeller)
- [ ] Admin › Genel Ayarlar'da site adresi `https://…` alan adınız
- [ ] KVKK ve Gizlilik metinleri gerçek şirket bilgilerinizle güncellendi
- [ ] İletişim e-postası, telefon ve adres doğru
- [ ] Örnek projeler/blog yazıları/istatistikler kendi içeriğinizle değiştirildi
- [ ] Sekme ikonu ve başlığı ayarlandı
- [ ] İlk yedek alındı

## Sorun giderme

| Belirti | Çözüm |
| --- | --- |
| Konteyner hemen kapanıyor, günlükte "ADMIN_PASSCODE" uyarısı | `.env` içinde en az 12 karakterlik parola tanımlayın |
| Sertifika alınamıyor | DNS A kaydının sunucu IP'sini gösterdiğini ve 80/443 portlarının açık olduğunu kontrol edin |
| Admin'de "Oturum süresi doldu" | Site HTTPS üzerinden açılmalı; güvenli çerez HTTP'de gönderilmez |
| Yükleme "boyut sınırı" hatası | PDF en fazla 10 MB, ikon en fazla 512 KB |
