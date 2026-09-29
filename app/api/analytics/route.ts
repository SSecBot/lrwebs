import { createHash } from "node:crypto";
import { z } from "zod";
import { clientIp, isAuthenticated, rateLimit } from "@/lib/auth";
import {
  appendRecord,
  cleanupOld,
  isBot,
  languageOf,
  parseUserAgent,
  trafficSource,
  visitorId,
  type AnalyticsRecord,
} from "@/lib/analytics-store";
import { getCms } from "@/lib/cms";
import { isSameOrigin, requestHost } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 4096;

// Kontrol karakteri içermeyen, sorgu/parça kısmı olmayan site içi yol.
const sitePath = z
  .string()
  .max(200)
  .regex(/^\/[^\s?#\u0000-\u001f\u007f]*$/);

const propValue = z.union([z.string().max(80), z.number().finite(), z.boolean()]);

const payloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("pageview"),
    path: sitePath,
    referrer: z.string().max(500).optional().default(""),
    utm: z.string().max(60).optional().default(""),
  }),
  z.object({
    type: z.literal("event"),
    path: sitePath,
    name: z.string().regex(/^[a-z0-9_]{1,40}$/),
    props: z
      .record(z.string().regex(/^[a-z0-9_]{1,30}$/), propValue.optional())
      .optional()
      .default({})
      .refine((p) => Object.keys(p).length <= 8),
  }),
  z.object({
    type: z.literal("engagement"),
    path: sitePath,
    ms: z
      .number()
      .int()
      .min(1000)
      .max(30 * 60 * 1000),
  }),
]);

/** Ölçülmeyen istekler de aynı yanıtı alır; ziyaretçi neden sayılmadığını öğrenemez. */
const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

function normalizePath(p: string): string {
  const trimmed = p.length > 1 ? p.replace(/\/+$/, "") : p;
  return trimmed || "/";
}

/**
 * Dahili analitik toplama uç noktası (çerezsiz).
 * Yalnızca aynı kökenden, bot olmayan, izlemeyi reddetmemiş ziyaretçilerden gelen kayıtlar yazılır.
 */
export async function POST(request: Request) {
  const { analytics } = await getCms();
  if (!analytics.enabled) return done();
  if (!isSameOrigin(request)) return done();

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return new Response(null, { status: 413 });

  const ua = request.headers.get("user-agent") ?? "";
  if (isBot(ua)) return done();
  if (analytics.respectDoNotTrack && (request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1")) {
    return done();
  }
  if (analytics.excludeAdmins && (await isAuthenticated())) return done();

  const ip = await clientIp();
  const limiterKey = createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 24);
  if (!rateLimit(`analytics:${limiterKey}`, 120, 60_000)) return new Response(null, { status: 429 });

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return done();
  }
  if (raw.length > MAX_BODY) return new Response(null, { status: 413 });

  let parsed;
  try {
    parsed = payloadSchema.safeParse(JSON.parse(raw));
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!parsed.success) return new Response(null, { status: 400 });
  const data = parsed.data;

  const path = normalizePath(data.path);
  if (/^\/(admin|api)(\/|$)/.test(path)) return done();
  if (analytics.excludedPaths.some((prefix) => path === prefix || path.startsWith(`${prefix.replace(/\/$/, "")}/`))) {
    return done();
  }

  const host = requestHost(request) ?? "";
  const now = Date.now();
  const record: AnalyticsRecord = { t: now, k: "pv", p: path, v: await visitorId(ip, ua, host, now) };

  if (data.type === "pageview") {
    const { device, browser, os } = parseUserAgent(ua);
    const source = trafficSource(data.referrer, data.utm, host);
    Object.assign(record, { d: device, b: browser, o: os, l: languageOf(request.headers.get("accept-language")) });
    if (source) record.r = source;
  } else if (data.type === "event") {
    record.k = "ev";
    record.n = data.name;
    const props: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(data.props)) {
      if (value === undefined) continue;
      props[key] = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f<>]/g, "").trim() : value;
    }
    if (Object.keys(props).length) record.x = props;
  } else {
    record.k = "en";
    record.ms = data.ms;
  }

  await appendRecord(record);
  void cleanupOld(analytics.retentionDays).catch(() => undefined);
  return done();
}
