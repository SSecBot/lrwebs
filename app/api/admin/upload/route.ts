import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { UPLOAD_DIR, deleteUpload, getCms, updateCms } from "@/lib/cms";
import type { LegalKind } from "@/types/cms";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const KINDS: LegalKind[] = ["privacy", "kvkk"];

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

/**
 * Yasal metinler için PDF yükleme.
 * Doğrulamalar: oturum, aynı köken, dosya boyutu, MIME türü, uzantı ve "%PDF-" imzası.
 */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) return fail("Yetkisiz işlem. Lütfen yeniden giriş yapın.", 401);

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return fail("Geçersiz istek kaynağı.", 403);

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES + 64 * 1024) return fail("Dosya boyutu en fazla 10 MB olabilir.", 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Form verisi okunamadı.");
  }

  const kind = form.get("kind");
  const file = form.get("file");
  if (typeof kind !== "string" || !KINDS.includes(kind as LegalKind)) return fail("Geçersiz belge türü.");
  if (!(file instanceof File)) return fail("Lütfen bir PDF dosyası seçin.");
  if (file.size === 0) return fail("Dosya boş görünüyor.");
  if (file.size > MAX_BYTES) return fail("Dosya boyutu en fazla 10 MB olabilir.", 413);
  if (file.type !== "application/pdf") return fail("Yalnızca PDF dosyaları yüklenebilir.");
  if (!/\.pdf$/i.test(file.name)) return fail("Dosya uzantısı .pdf olmalıdır.");

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") return fail("Dosya içeriği geçerli bir PDF değil.");

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${kind}-${Date.now()}-${randomBytes(4).toString("hex")}.pdf`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), buffer);

  const cms = await getCms();
  const previous = cms.legal[kind as LegalKind].pdfUrl;
  const pdfUrl = `/api/uploads/${name}`;
  await updateCms({
    legal: {
      ...cms.legal,
      [kind]: { ...cms.legal[kind as LegalKind], pdfUrl, updatedAt: new Date().toISOString().slice(0, 10) },
    },
  });
  if (previous && previous !== pdfUrl) await deleteUpload(previous);

  return NextResponse.json({ ok: true, message: "PDF yüklendi ve yayına alındı.", pdfUrl });
}
