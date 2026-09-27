# LrWebs

Modern web geliştirme ve dijital ajans platformu. Next.js 16 (App Router), TypeScript (strict), Tailwind CSS v4 ve dosya tabanlı bir CMS ile geliştirilmiştir.

## Başlangıç

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # üretim derlemesi
npm run start      # üretim sunucusu
```

**Yayınlamak için:** [DEPLOY.md](DEPLOY.md) — Docker + otomatik HTTPS ile adım adım yayın rehberi.

Yönetim paneli: `/admin` — varsayılan parola `admin123`. Üretimde `.env.example` dosyasını `.env.local` olarak kopyalayıp `ADMIN_PASSCODE` ve `ADMIN_SESSION_SECRET` değerlerini değiştirin.

## Mimari

| Katman | Konum |
| --- | --- |
| Veri modeli | `types/cms.ts` |
| İçerik deposu | `data/cms-store.json` (tüm site metinleri, bağlantılar, sıralamalar) |
| Veri erişim katmanı | `lib/cms.ts` — atomik yazma, yazma kuyruğu, `revalidatePath` |
| Doğrulama & temizleme | `lib/validation.ts` (zod), `lib/sanitize.ts` |
| Özetleyici | `lib/summarizer.ts` — bağımlılıksız TF tabanlı çıkarımsal özet |
| Güvenli Markdown | `lib/markdown.ts` + `components/rich-text.tsx` (HTML enjekte etmez) |
| Oturum | `lib/auth.ts` — HMAC imzalı, httpOnly, SameSite=Strict çerez |
| Sunucu eylemleri | `app/actions/admin.ts`, `app/actions/contact.ts` |
| PDF yükleme | `app/api/admin/upload` → `public/uploads/`, sunum `app/api/uploads/[file]` |

Yönetim panelinden yapılan her kayıt `data/cms-store.json` dosyasına yazılır ve tüm site anında yeniden doğrulanır. İletişim formu mesajları `data/messages.json` dosyasında tutulur ve panelde "Gelen Mesajlar" sekmesinden yönetilir.

## Güvenlik

- Tüm veri değiştiren sunucu eylemleri ve `/api/admin/upload` oturumu sunucu tarafında doğrular; yükleme ucu ayrıca aynı kökeni (Origin) zorunlu tutar.
- Oturum çerezi HMAC imzalıdır, parolaya bağlıdır (parola değişince oturumlar düşer) ve çıkışta sunucuda iptal edilir.
- Yüklemeler: yalnızca `.pdf` (yasal metinler) ve `.ico/.png/.svg` (sekme ikonu); uzantı + MIME + dosya imzası doğrulanır, dosya adı sunucuda üretilir, SVG'lerde betik/olay/harici referans reddedilir ve SVG'ler `sandbox` CSP ile sunulur.
- `next.config.ts` CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy ve (üretimde) HSTS başlıklarını ekler.
- `data/cms-store.json` yazımları kilit dosyası + fsync + atomik rename ile yapılır; önceki sürüm `.bak` olarak saklanır. Eşzamanlı düzenlemeler bölüm bazında tespit edilir ve sessizce üzerine yazılmaz.

## Notlar

- İçerik alanları sade bir Markdown alt kümesini destekler: `## başlık`, `- liste`, `1. liste`, `> alıntı`, `**kalın**`, `` `kod` ``, `[bağlantı](https://…)`.
- PDF yüklemeleri MIME türü, uzantı, boyut (10 MB) ve `%PDF-` imzası ile doğrulanır.
- Veriler yerel dosya sisteminde saklandığından uygulama kalıcı diske sahip bir Node.js sunucusunda çalıştırılmalıdır (salt okunur sunucusuz ortamlar desteklenmez).
