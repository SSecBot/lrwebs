import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Üretim sunucusu açıldığında çalışır (instrumentation.ts → register).
 * Statik sayfalar derleme anındaki içerikle üretildiğinden, kalıcı diskteki
 * data/cms-store.json farklıysa (ör. yeni sürüm yayınlandıktan sonra) eski içerik
 * sunulurdu. Sunucu dinlemeye başlayınca sitenin tamamı yeniden doğrulanır ve
 * başlıca sayfalar bir kez ziyaret edilerek güncel içerikle yeniden üretilir.
 */
export function scheduleStartupRevalidation() {
  const token = randomBytes(32).toString("hex");
  process.env.LRWEBS_STARTUP_TOKEN = token;

  const base = process.env.INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
  const deadline = Date.now() + 120_000;

  const attempt = async (): Promise<void> => {
    try {
      const res = await fetch(`${base}/api/internal/revalidate`, {
        method: "POST",
        headers: { "x-startup-token": token },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await warmPages(base);
      console.log("[lrwebs] Açılış doğrulaması tamamlandı: sayfalar güncel içerikle yeniden üretildi.");
    } catch (error) {
      if (Date.now() > deadline) {
        console.warn("[lrwebs] Açılış doğrulaması yapılamadı:", error instanceof Error ? error.message : error);
        delete process.env.LRWEBS_STARTUP_TOKEN;
        return;
      }
      setTimeout(() => void attempt(), 750);
    }
  };

  setTimeout(() => void attempt(), 500);
}

async function warmPages(base: string) {
  const paths = ["/", "/services", "/portfolio", "/pricing", "/blog", "/about", "/contact", "/sitemap.xml", "/robots.txt"];
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "cms-store.json"), "utf8");
    const store = JSON.parse(raw) as { blog?: { slug: string; visible: boolean }[] };
    for (const post of store.blog ?? []) if (post.visible && /^[a-z0-9-]+$/.test(post.slug)) paths.push(`/blog/${post.slug}`);
  } catch {
    /* içerik okunamazsa yalnızca sabit sayfalar ısıtılır */
  }
  // Geçersiz kılınan sayfanın ilk ziyareti yeniden üretimi tetikler; ikinci tur güncel sürümü önbelleğe alır.
  for (let round = 0; round < 2; round++) {
    await Promise.all(paths.map((p) => fetch(`${base}${p}`, { cache: "no-store" }).catch(() => undefined)));
    await new Promise((r) => setTimeout(r, 400));
  }
  delete process.env.LRWEBS_STARTUP_TOKEN;
}
