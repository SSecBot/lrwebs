import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Konteyner/yük dengeleyici sağlık kontrolü: sunucu ayakta ve içerik deposu okunabilir mi? */
export async function GET() {
  try {
    JSON.parse(await fs.readFile(path.join(process.cwd(), "data", "cms-store.json"), "utf8"));
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
