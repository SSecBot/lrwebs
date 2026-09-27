import { NextResponse } from "next/server";
import type { CmsStore } from "@/types/cms";
import { isAuthenticated } from "@/lib/auth";
import { mutateCms } from "@/lib/cms";
import { deleteUpload, isUploadKind, maxBytesFor, storeUpload, UPLOAD_URL, validateUpload } from "@/lib/uploads";

export const runtime = "nodejs";

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Aynı kökenden gelmeyen (CSRF) istekleri reddeder. Origin başlığı zorunludur. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Yönetim paneli dosya yükleme uç noktası.
 * - kind=privacy|kvkk → PDF (≤10 MB), yasal metin modalında gösterilir.
 * - kind=favicon → .ico / .png / .svg (≤512 KB), tarayıcı sekmesi ikonu olur.
 * Kimlik doğrulama, köken, boyut, uzantı, MIME ve dosya imzası sunucuda doğrulanır;
 * dosya adı sunucu tarafından üretilir.
 */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) return fail("Yetkisiz işlem. Lütfen yeniden giriş yapın.", 401);
  if (!isSameOrigin(request)) return fail("Geçersiz istek kaynağı.", 403);

  const kindParam = new URL(request.url).searchParams.get("kind");
  if (!isUploadKind(kindParam)) return fail("Geçersiz yükleme türü.");
  const kind = kindParam;

  // Gövde okunmadan önce boyut sınırı uygulanır (çok parçalı form ek yükü için pay bırakılır).
  const length = Number(request.headers.get("content-length") ?? NaN);
  if (!Number.isFinite(length)) return fail("İstek boyutu belirtilmemiş.", 411);
  if (length > maxBytesFor(kind) + 64 * 1024) return fail("Dosya boyutu sınırı aşıldı.", 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Form verisi okunamadı.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Lütfen bir dosya seçin.");

  const checked = await validateUpload(kind, file);
  if (!checked.ok) return fail(checked.message, checked.status);

  const url = await storeUpload(kind, checked.ext, checked.buffer);

  let previous = "";
  let store: CmsStore;
  try {
    store = await mutateCms((current) => {
      if (kind === "favicon") {
        previous = current.general.faviconUrl;
        return { general: { ...current.general, faviconUrl: url } };
      }
      previous = current.legal[kind].pdfUrl;
      return {
        legal: {
          ...current.legal,
          [kind]: { ...current.legal[kind], pdfUrl: url, updatedAt: new Date().toISOString().slice(0, 10) },
        },
      };
    });
  } catch (error) {
    await deleteUpload(url);
    throw error;
  }

  // Yalnızca yükleme ile oluşturulmuş eski dosyalar silinir.
  if (previous && previous !== url && UPLOAD_URL.test(previous)) await deleteUpload(previous);

  const message = kind === "favicon" ? "Sekme ikonu yüklendi ve yayına alındı." : "PDF yüklendi ve yayına alındı.";
  // İstemci, kaydedilmiş sürümünü sunucudakiyle birebir eşitleyebilsin diye etkilenen bölüm döndürülür.
  const section = kind === "favicon" ? { general: store.general } : { legal: store.legal };
  return NextResponse.json({ ok: true, message, url, ...section }, { headers: { "Cache-Control": "no-store" } });
}
