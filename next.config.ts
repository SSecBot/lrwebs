import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * İçerik Güvenlik Politikası.
 * - Sayfalar statik üretildiği için nonce yerine 'unsafe-inline' betiklere izin verilir
 *   (Next.js'in satır içi önyükleme betikleri). Tüm kullanıcı içeriği React ile metin olarak
 *   render edildiğinden ve HTML enjekte edilmediğinden bu, XSS yüzeyi oluşturmaz.
 * - frame-src/frame-ancestors 'self': cihaz vitrini ve PDF görüntüleyici yalnızca aynı kökeni gömer;
 *   site başka alan adlarında çerçevelenemez (clickjacking koruması).
 */
// Google Analytics 4 (gtag.js) için gereken kaynaklar. Betik yalnızca yönetim panelinde bir
// Ölçüm Kimliği girildiğinde ve (açıksa) ziyaretçi onay verdiğinde yüklenir.
const GA_SCRIPT = "https://www.googletagmanager.com";
const GA_CONNECT = "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${GA_SCRIPT}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${GA_CONNECT}${isDev ? " ws: wss:" : ""}`,
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  // Docker/VPS yayını için node_modules gerektirmeyen bağımsız sunucu çıktısı (.next/standalone).
  output: "standalone",
  // Çalışma zamanı verileri (içerik, mesajlar, oturum anahtarı) derleme çıktısına kopyalanmaz;
  // yayında kalıcı diskten okunur (bkz. docker-entrypoint.mjs).
  outputFileTracingExcludes: { "*": ["data/**", "public/uploads/**", ".env*"] },
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: baseHeaders },
      // Yüklenen dosyalar kendi başlıklarıyla sunulur (PDF görüntüleyici sayfa CSP'sinden etkilenmemeli).
      { source: "/((?!api/uploads/).*)", headers: [{ key: "Content-Security-Policy", value: csp }] },
      // public/uploads içindeki dosyalar asla betik çalıştıramaz ve tarayıcıda tür tahmini yapılamaz.
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'; sandbox" },
          { key: "Content-Disposition", value: "attachment" },
        ],
      },
      {
        source: "/admin",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
