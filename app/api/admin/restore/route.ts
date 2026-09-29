import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { BackupError, MAX_BACKUP_BYTES, parseBackup, restoreBackup } from "@/lib/backup";

export const runtime = "nodejs";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

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
 * .lrwebs yedeğini geri yükler (yalnızca yönetici, aynı köken).
 * ?dryRun=1 ile yalnızca doğrular ve içeriğin özetini döndürür; hiçbir şey yazmaz.
 */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) return json({ ok: false, message: "Yetkisiz işlem. Lütfen yeniden giriş yapın." }, 401);
  if (!isSameOrigin(request)) return json({ ok: false, message: "Geçersiz istek kaynağı." }, 403);

  const length = Number(request.headers.get("content-length") ?? NaN);
  if (!Number.isFinite(length)) return json({ ok: false, message: "İstek boyutu belirtilmemiş." }, 411);
  if (length > MAX_BACKUP_BYTES + 64 * 1024) return json({ ok: false, message: "Yedek dosyası en fazla 60 MB olabilir." }, 413);

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return json({ ok: false, message: "Form verisi okunamadı." }, 400);
  }
  if (!(file instanceof File)) return json({ ok: false, message: "Lütfen bir .lrwebs dosyası seçin." }, 400);
  if (!/\.lrwebs$/i.test(file.name))
    return json({ ok: false, message: "Yalnızca .lrwebs uzantılı yedek dosyaları yüklenebilir." }, 415);
  if (file.size > MAX_BACKUP_BYTES) return json({ ok: false, message: "Yedek dosyası en fazla 60 MB olabilir." }, 413);

  const raw = Buffer.from(await file.arrayBuffer());
  try {
    if (new URL(request.url).searchParams.get("dryRun") === "1") {
      const parsed = parseBackup(raw);
      return json({
        ok: true,
        preview: {
          createdAt: parsed.createdAt,
          brandName: parsed.store.general.brandName,
          services: parsed.store.services.length,
          projects: parsed.store.projects.length,
          blog: parsed.store.blog.length,
          messages: parsed.messages.length,
          uploads: parsed.uploads.length,
          skippedUploads: parsed.skippedUploads,
        },
      });
    }
    const summary = await restoreBackup(raw);
    return json({ ok: true, message: "Yedek geri yüklendi. Site anında güncellendi.", summary });
  } catch (error) {
    if (error instanceof BackupError) return json({ ok: false, message: error.message, details: error.details }, 422);
    throw error;
  }
}
