import { isAuthenticated } from "@/lib/auth";
import { createBackup } from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tüm site verisini .lrwebs dosyası olarak indirir (yalnızca yönetici). */
export async function GET() {
  if (!(await isAuthenticated())) {
    return new Response("Yetkisiz işlem. Lütfen yeniden giriş yapın.", { status: 401 });
  }
  const { filename, data } = await createBackup();
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(data.length),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
