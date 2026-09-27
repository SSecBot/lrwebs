import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateSite } from "@/lib/cms";

export const runtime = "nodejs";

/**
 * Sunucu açılışında (instrumentation.ts) bir kez çağrılan dahili uç nokta.
 * Derleme anında üretilmiş statik sayfaları geçersiz kılar; böylece kalıcı diskteki
 * güncel içerik (ör. yeni sürüm yayınlandıktan sonra) hemen sunulur.
 * Token her açılışta rastgele üretilir ve yalnızca sunucu sürecinin belleğinde bulunur.
 */
export async function POST(request: Request) {
  const expected = process.env.LRWEBS_STARTUP_TOKEN;
  const given = request.headers.get("x-startup-token") ?? "";
  const hash = (v: string) => createHash("sha256").update(v).digest();
  if (!expected || !timingSafeEqual(hash(given), hash(expected))) {
    return new Response("Bulunamadı", { status: 404 });
  }
  revalidateSite();
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
