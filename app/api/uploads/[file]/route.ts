import { promises as fs } from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/cms";

export const runtime = "nodejs";

/**
 * public/uploads altındaki PDF dosyalarını sunar.
 * Derleme sonrasında yüklenen dosyaların üretim ortamında da erişilebilir olması için
 * statik public sunumu yerine bu uç nokta kullanılır.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/uploads/[file]">) {
  const { file } = await params;
  if (!/^[a-z0-9-]+\.pdf$/.test(file)) return new Response("Bulunamadı", { status: 404 });

  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, file));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${file}"`,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Bulunamadı", { status: 404 });
  }
}
