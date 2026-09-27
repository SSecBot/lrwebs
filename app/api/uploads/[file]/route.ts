import { CONTENT_TYPES, readUpload } from "@/lib/uploads";

export const runtime = "nodejs";

/**
 * public/uploads altındaki dosyaları güvenli başlıklarla sunar.
 * - Dosya adı sunucunun ürettiği biçimle birebir eşleşmelidir (yol geçişi mümkün değildir).
 * - İçerik türü dosya uzantısından sunucu tarafından belirlenir; tarayıcı tahmini kapatılır.
 * - SVG dosyaları betik çalıştıramayan, izole (sandbox) bir CSP ile sunulur.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/uploads/[file]">) {
  const { file } = await params;
  const upload = await readUpload(file);
  if (!upload) return new Response("Bulunamadı", { status: 404, headers: { "X-Content-Type-Options": "nosniff" } });

  const headers: Record<string, string> = {
    "Content-Type": CONTENT_TYPES[upload.ext],
    "Content-Disposition": `inline; filename="${file}"`,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  if (upload.ext === "svg") {
    headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox";
  }
  return new Response(new Uint8Array(upload.data), { headers });
}
