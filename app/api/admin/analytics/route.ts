import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { buildReport, cleanupOld, clearAnalytics, RANGE_DAYS, storageInfo, type AnalyticsRange } from "@/lib/analytics-store";
import { getCms } from "@/lib/cms";
import { isSameOrigin } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const isRange = (value: string | null): value is AnalyticsRange => value !== null && Object.hasOwn(RANGE_DAYS, value);

/** Yönetim paneli için analitik raporu. ?range=today|7d|30d|90d */
export async function GET(request: Request) {
  if (!(await isAuthenticated())) return json({ ok: false, message: "Yetkisiz işlem. Lütfen yeniden giriş yapın." }, 401);
  const param = new URL(request.url).searchParams.get("range");
  const range = isRange(param) ? param : "7d";
  const { analytics } = await getCms();
  await cleanupOld(analytics.retentionDays).catch(() => undefined);
  const [report, storage] = await Promise.all([buildReport(range), storageInfo()]);
  return json({ ok: true, report, storage, trustProxy: process.env.TRUST_PROXY === "1" });
}

/** Tüm analitik kayıtlarını kalıcı olarak siler. */
export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) return json({ ok: false, message: "Yetkisiz işlem. Lütfen yeniden giriş yapın." }, 401);
  if (!isSameOrigin(request)) return json({ ok: false, message: "Geçersiz istek kaynağı." }, 403);
  const removed = await clearAnalytics();
  return json({ ok: true, message: removed ? "Tüm analitik verileri silindi." : "Silinecek veri yoktu." });
}
