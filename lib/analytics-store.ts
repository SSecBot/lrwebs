import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { EVENT_LABELS } from "@/lib/analytics";

/**
 * Dahili analitik deposu
 * ----------------------
 * - Kayıtlar data/analytics/YYYY-MM-DD.ndjson dosyalarına (günde bir dosya) satır satır eklenir.
 * - IP adresi ve tarayıcı kimliği SAKLANMAZ. Ziyaretçi, "günlük gizli tuz + IP + tarayıcı" üzerinden
 *   üretilen tek yönlü bir özetle sayılır; tuz her gün yenilenir ve eskisi silinir. Böylece bir
 *   ziyaretçi günler arasında izlenemez ve özetten IP'ye geri dönülemez.
 * - Saklama süresi dolan günlük dosyalar otomatik silinir.
 */

// Çalışma zamanı verisi: derleme izlemesine (standalone çıktısı) dahil edilmez.
const ANALYTICS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "analytics");
const SALT_FILE = path.join(/*turbopackIgnore: true*/ ANALYTICS_DIR, ".salt.json");
const FILE_NAME = /^(\d{4}-\d{2}-\d{2})\.ndjson$/;

export const ANALYTICS_TZ = process.env.ANALYTICS_TZ || "Europe/Istanbul";
const SESSION_GAP_MS = 30 * 60 * 1000;
const REALTIME_MS = 5 * 60 * 1000;

/* ---------- Kayıt biçimi ---------- */

export type RecordKind = "pv" | "ev" | "en";

/** Diskteki tek satır. Kısa alan adları dosya boyutunu küçük tutar. */
export interface AnalyticsRecord {
  /** zaman (ms) */
  t: number;
  k: RecordKind;
  /** yol */
  p: string;
  /** günlük ziyaretçi özeti */
  v: string;
  /** trafik kaynağı (yalnızca sayfa görüntülemelerinde, boşsa doğrudan) */
  r?: string;
  /** cihaz / tarayıcı / işletim sistemi / dil */
  d?: string;
  b?: string;
  o?: string;
  l?: string;
  /** olay adı ve özellikleri */
  n?: string;
  x?: Record<string, string | number | boolean>;
  /** sayfada geçirilen görünür süre (ms) */
  ms?: number;
}

/* ---------- Tarih yardımcıları (site saat dilimi) ---------- */

const DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: ANALYTICS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const HOUR_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: ANALYTICS_TZ, hour: "2-digit", hourCycle: "h23" });

export const dayKey = (t: number) => DAY_FMT.format(t);
const hourOf = (t: number) => Number(HOUR_FMT.format(t)) % 24;

/** "YYYY-MM-DD" gününden n gün önceki gün. */
function shiftDay(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/* ---------- Ziyaretçi özeti ---------- */

let saltCache: { day: string; salt: string } | null = null;

async function dailySalt(day: string): Promise<string> {
  if (saltCache?.day === day) return saltCache.salt;
  try {
    const stored = JSON.parse(await fs.readFile(SALT_FILE, "utf8")) as { day?: string; salt?: string };
    if (stored.day === day && typeof stored.salt === "string" && stored.salt.length >= 32) {
      saltCache = { day, salt: stored.salt };
      return stored.salt;
    }
  } catch {
    /* ilk kullanım veya bozuk dosya: yeni tuz üretilir */
  }
  // Önceki günün tuzu burada kalıcı olarak silinir (üzerine yazılır).
  const salt = randomBytes(32).toString("hex");
  await fs.mkdir(ANALYTICS_DIR, { recursive: true });
  await fs.writeFile(SALT_FILE, JSON.stringify({ day, salt }), { mode: 0o600 });
  saltCache = { day, salt };
  return salt;
}

export async function visitorId(ip: string, userAgent: string, host: string, now = Date.now()): Promise<string> {
  const day = dayKey(now);
  const salt = await dailySalt(day);
  return createHash("sha256").update(`${salt}|${day}|${host}|${ip}|${userAgent}`).digest("hex").slice(0, 16);
}

/* ---------- Tarayıcı bilgisi ---------- */

const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|embedly|quora link|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|undici|go-http|java\/|okhttp|httpclient|phantomjs|selenium|puppeteer|playwright/i;

export const isBot = (ua: string) => ua.length < 20 || BOT_UA.test(ua);

export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const device = /iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua)
    ? "Tablet"
    : /Mobi|iPhone|iPod|Android|IEMobile|Opera Mini/i.test(ua)
      ? "Mobil"
      : "Masaüstü";
  const browser = /Edg(e|A|iOS)?\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /YaBrowser/.test(ua)
          ? "Yandex"
          : /Firefox|FxiOS/.test(ua)
            ? "Firefox"
            : /Chrome|CriOS|Chromium/.test(ua)
              ? "Chrome"
              : /Safari/.test(ua)
                ? "Safari"
                : "Diğer";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /CrOS/.test(ua)
          ? "ChromeOS"
          : /Mac OS X|Macintosh/.test(ua)
            ? "macOS"
            : /Linux/.test(ua)
              ? "Linux"
              : "Diğer";
  return { device, browser, os };
}

const LANGUAGES: Record<string, string> = {
  tr: "Türkçe",
  en: "İngilizce",
  de: "Almanca",
  fr: "Fransızca",
  ru: "Rusça",
  ar: "Arapça",
  es: "İspanyolca",
  it: "İtalyanca",
  nl: "Felemenkçe",
  az: "Azerbaycan Türkçesi",
};

export function languageOf(acceptLanguage: string | null): string {
  const code = (acceptLanguage ?? "").split(",")[0]?.trim().slice(0, 2).toLowerCase() ?? "";
  if (!/^[a-z]{2}$/.test(code)) return "Bilinmiyor";
  return LANGUAGES[code] ?? code.toUpperCase();
}

/* ---------- Trafik kaynağı ---------- */

const KNOWN_SOURCES: [RegExp, string][] = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)yandex\./, "Yandex"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)yahoo\./, "Yahoo"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "Facebook"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "X (Twitter)"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "LinkedIn"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)github\.com$/, "GitHub"],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, "ChatGPT"],
  [/(^|\.)claude\.ai$/, "Claude"],
  [/(^|\.)perplexity\.ai$/, "Perplexity"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "WhatsApp"],
];

/** utm_source öncelikli; yoksa yönlendiren sitenin adı. Kendi sitemizden gelenler "doğrudan" sayılır. */
export function trafficSource(referrer: string, utmSource: string, ownHost: string): string {
  const utm = utmSource.trim().toLowerCase();
  if (/^[a-z0-9._-]{1,40}$/.test(utm)) return utm;
  if (!referrer) return "";
  try {
    const url = new URL(referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (
      !host ||
      host ===
        ownHost
          .toLowerCase()
          .replace(/^www\./, "")
          .split(":")[0]
    )
      return "";
    for (const [pattern, name] of KNOWN_SOURCES) if (pattern.test(host)) return name;
    return host.slice(0, 80);
  } catch {
    return "";
  }
}

/* ---------- Yazma ---------- */

let lastCleanup = 0;

/** Günlük dosya üst sınırı: kötü niyetli yoğun istekler diski dolduramaz (~250 bin kayıt). */
const MAX_DAY_BYTES = 50 * 1024 * 1024;
const fullDays = new Set<string>();

export async function appendRecord(record: AnalyticsRecord): Promise<void> {
  const day = dayKey(record.t);
  if (fullDays.has(day)) return;
  await fs.mkdir(ANALYTICS_DIR, { recursive: true });
  const file = path.join(/*turbopackIgnore: true*/ ANALYTICS_DIR, `${day}.ndjson`);
  const size = (await fs.stat(file).catch(() => null))?.size ?? 0;
  if (size >= MAX_DAY_BYTES) {
    fullDays.add(day);
    console.warn(`[analytics] ${day} günlük kayıt sınırına ulaştı; bu gün için yeni kayıt alınmıyor.`);
    return;
  }
  // Tek satırlık O_APPEND yazmaları eşzamanlı isteklerde birbirine karışmaz.
  await fs.appendFile(file, `${JSON.stringify(record)}\n`, { mode: 0o600 });
}

/** Saklama süresi dolan günlük dosyaları siler (saatte en fazla bir kez). */
export async function cleanupOld(retentionDays: number, force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastCleanup < 60 * 60 * 1000) return;
  lastCleanup = now;
  const oldest = shiftDay(dayKey(now), retentionDays - 1);
  for (const name of await listDayFiles()) {
    const day = FILE_NAME.exec(name)![1];
    if (day < oldest) await fs.rm(path.join(/*turbopackIgnore: true*/ ANALYTICS_DIR, name), { force: true });
  }
}

async function listDayFiles(): Promise<string[]> {
  try {
    return (await fs.readdir(ANALYTICS_DIR)).filter((n) => FILE_NAME.test(n));
  } catch {
    return [];
  }
}

/** Tüm analitik kayıtlarını siler. */
export async function clearAnalytics(): Promise<number> {
  const files = await listDayFiles();
  await Promise.all(files.map((n) => fs.rm(path.join(/*turbopackIgnore: true*/ ANALYTICS_DIR, n), { force: true })));
  parsedCache.clear();
  fullDays.clear();
  return files.length;
}

export async function storageInfo(): Promise<{ days: number; bytes: number; oldest: string | null }> {
  const files = (await listDayFiles()).sort();
  let bytes = 0;
  for (const name of files) {
    bytes += (await fs.stat(path.join(/*turbopackIgnore: true*/ ANALYTICS_DIR, name)).catch(() => ({ size: 0 }))).size;
  }
  return { days: files.length, bytes, oldest: files[0] ? FILE_NAME.exec(files[0])![1] : null };
}

/* ---------- Okuma ---------- */

const parsedCache = new Map<string, { mtimeMs: number; size: number; records: AnalyticsRecord[] }>();

async function readDay(day: string): Promise<AnalyticsRecord[]> {
  const file = path.join(/*turbopackIgnore: true*/ ANALYTICS_DIR, `${day}.ndjson`);
  let stat;
  try {
    stat = await fs.stat(file);
  } catch {
    return [];
  }
  const cached = parsedCache.get(day);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.records;

  const records: AnalyticsRecord[] = [];
  for (const line of (await fs.readFile(file, "utf8")).split("\n")) {
    if (!line) continue;
    try {
      const r = JSON.parse(line) as AnalyticsRecord;
      if (typeof r.t === "number" && typeof r.p === "string" && typeof r.v === "string") records.push(r);
    } catch {
      /* yarım yazılmış satır: atlanır */
    }
  }
  parsedCache.set(day, { mtimeMs: stat.mtimeMs, size: stat.size, records });
  if (parsedCache.size > 400) parsedCache.delete(parsedCache.keys().next().value!);
  return records;
}

/* ---------- Rapor ---------- */

export type AnalyticsRange = "today" | "7d" | "30d" | "90d";
export const RANGE_DAYS: Record<AnalyticsRange, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };

export interface Totals {
  visitors: number;
  visits: number;
  pageviews: number;
  /** yüzde (0–100) */
  bounceRate: number;
  /** saniye */
  avgVisitSeconds: number;
  viewsPerVisit: number;
  events: number;
}

export interface Row {
  name: string;
  value: number;
}

export interface AnalyticsReport {
  range: AnalyticsRange;
  from: string;
  to: string;
  granularity: "hour" | "day";
  totals: Totals;
  previous: Totals;
  series: { key: string; pageviews: number; visitors: number }[];
  pages: { path: string; views: number; visitors: number; avgSeconds: number }[];
  entryPages: Row[];
  sources: Row[];
  devices: Row[];
  browsers: Row[];
  os: Row[];
  languages: Row[];
  events: { name: string; label: string; count: number; details: Row[] }[];
  realtime: { visitors: number; pages: Row[] };
  generatedAt: string;
}

interface Visit {
  pageviews: number;
  engagedMs: number;
  entry: AnalyticsRecord | null;
}

const sortRows = (map: Map<string, number>, limit = 10): Row[] =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"))
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }));

const inc = (map: Map<string, number>, key: string, by = 1) => map.set(key, (map.get(key) ?? 0) + by);

/** Kayıtları ziyaretlere (aynı gün, aynı ziyaretçi, 30 dk'dan kısa aralıklar) böler. */
function buildVisits(records: AnalyticsRecord[]): Visit[] {
  const byVisitor = new Map<string, AnalyticsRecord[]>();
  for (const r of records) {
    const key = `${dayKey(r.t)}|${r.v}`;
    const list = byVisitor.get(key);
    if (list) list.push(r);
    else byVisitor.set(key, [r]);
  }
  const visits: Visit[] = [];
  for (const list of byVisitor.values()) {
    list.sort((a, b) => a.t - b.t);
    let current: Visit | null = null;
    let last = 0;
    for (const r of list) {
      if (!current || r.t - last > SESSION_GAP_MS) {
        current = { pageviews: 0, engagedMs: 0, entry: null };
        visits.push(current);
      }
      last = r.t;
      if (r.k === "pv") {
        current.pageviews++;
        current.entry ??= r;
      } else if (r.k === "en") {
        current.engagedMs += r.ms ?? 0;
      }
    }
  }
  // Yalnızca olay/süre kaydı olan (sayfa görüntülemesi dışarıda kalmış) parçalar ziyaret sayılmaz.
  return visits.filter((v) => v.pageviews > 0);
}

function computeTotals(records: AnalyticsRecord[]): Totals {
  const visits = buildVisits(records);
  const pageviews = records.filter((r) => r.k === "pv").length;
  const visitors = new Set(records.filter((r) => r.k === "pv").map((r) => `${dayKey(r.t)}|${r.v}`)).size;
  const bounces = visits.filter((v) => v.pageviews === 1).length;
  const engaged = visits.reduce((sum, v) => sum + v.engagedMs, 0);
  return {
    visitors,
    visits: visits.length,
    pageviews,
    bounceRate: visits.length ? Math.round((bounces / visits.length) * 1000) / 10 : 0,
    avgVisitSeconds: visits.length ? Math.round(engaged / visits.length / 1000) : 0,
    viewsPerVisit: visits.length ? Math.round((pageviews / visits.length) * 10) / 10 : 0,
    events: records.filter((r) => r.k === "ev").length,
  };
}

async function readRange(days: string[]): Promise<AnalyticsRecord[]> {
  const chunks = await Promise.all(days.map(readDay));
  return chunks.flat();
}

export async function buildReport(range: AnalyticsRange, now = Date.now()): Promise<AnalyticsReport> {
  const n = RANGE_DAYS[range];
  const today = dayKey(now);
  const days = Array.from({ length: n }, (_, i) => shiftDay(today, n - 1 - i));
  const previousDays = Array.from({ length: n }, (_, i) => shiftDay(today, 2 * n - 1 - i));

  const [records, previousRecords] = await Promise.all([readRange(days), readRange(previousDays)]);
  const pv = records.filter((r) => r.k === "pv");

  // Zaman serisi
  const granularity = range === "today" ? "hour" : "day";
  // Bugün: yalnızca şu ana kadarki saatler (gelecek saatler sıfır gibi çizilmez).
  const keys = granularity === "hour" ? Array.from({ length: hourOf(now) + 1 }, (_, h) => String(h).padStart(2, "0")) : days;
  const bucketOf = (t: number) => (granularity === "hour" ? String(hourOf(t)).padStart(2, "0") : dayKey(t));
  const seriesViews = new Map<string, number>();
  const seriesVisitors = new Map<string, Set<string>>();
  for (const r of pv) {
    const key = bucketOf(r.t);
    inc(seriesViews, key);
    const set = seriesVisitors.get(key) ?? new Set<string>();
    set.add(`${dayKey(r.t)}|${r.v}`);
    seriesVisitors.set(key, set);
  }
  const series = keys.map((key) => ({
    key,
    pageviews: seriesViews.get(key) ?? 0,
    visitors: seriesVisitors.get(key)?.size ?? 0,
  }));

  // Sayfalar
  const pageViews = new Map<string, number>();
  const pageVisitors = new Map<string, Set<string>>();
  const pageTime = new Map<string, { ms: number; count: number }>();
  for (const r of records) {
    if (r.k === "pv") {
      inc(pageViews, r.p);
      const set = pageVisitors.get(r.p) ?? new Set<string>();
      set.add(`${dayKey(r.t)}|${r.v}`);
      pageVisitors.set(r.p, set);
    } else if (r.k === "en" && r.ms) {
      const agg = pageTime.get(r.p) ?? { ms: 0, count: 0 };
      agg.ms += r.ms;
      agg.count++;
      pageTime.set(r.p, agg);
    }
  }
  const pages = sortRows(pageViews, 20).map(({ name, value }) => {
    const time = pageTime.get(name);
    return {
      path: name,
      views: value,
      visitors: pageVisitors.get(name)?.size ?? 0,
      avgSeconds: time && time.count ? Math.round(time.ms / time.count / 1000) : 0,
    };
  });

  // Ziyaret bazlı kırılımlar (giriş sayfasının özellikleri)
  const entryPages = new Map<string, number>();
  const sources = new Map<string, number>();
  const devices = new Map<string, number>();
  const browsers = new Map<string, number>();
  const oses = new Map<string, number>();
  const languages = new Map<string, number>();
  for (const visit of buildVisits(records)) {
    const e = visit.entry!;
    inc(entryPages, e.p);
    inc(sources, e.r || "Doğrudan / bilinmiyor");
    inc(devices, e.d || "Bilinmiyor");
    inc(browsers, e.b || "Diğer");
    inc(oses, e.o || "Diğer");
    inc(languages, e.l || "Bilinmiyor");
  }

  // Olaylar
  const eventCounts = new Map<string, number>();
  const eventDetails = new Map<string, Map<string, number>>();
  for (const r of records) {
    if (r.k !== "ev" || !r.n) continue;
    inc(eventCounts, r.n);
    const details = eventDetails.get(r.n) ?? new Map<string, number>();
    for (const [key, value] of Object.entries(r.x ?? {})) {
      if (key === "value" || key === "currency") continue;
      inc(details, `${key}: ${value}`);
    }
    eventDetails.set(r.n, details);
  }
  const events = sortRows(eventCounts, 30).map(({ name, value }) => ({
    name,
    label: EVENT_LABELS[name] ?? name,
    count: value,
    details: sortRows(eventDetails.get(name) ?? new Map(), 5),
  }));

  // Canlı: son 5 dakika
  const since = now - REALTIME_MS;
  const recent = (days.at(-1) === today ? records : await readDay(today)).filter((r) => r.t >= since);
  const livePages = new Map<string, Set<string>>();
  for (const r of recent) {
    const set = livePages.get(r.p) ?? new Set<string>();
    set.add(r.v);
    livePages.set(r.p, set);
  }
  const realtime = {
    visitors: new Set(recent.map((r) => r.v)).size,
    pages: sortRows(new Map([...livePages].map(([p, set]) => [p, set.size])), 5),
  };

  return {
    range,
    from: days[0],
    to: today,
    granularity,
    totals: computeTotals(records),
    previous: computeTotals(previousRecords),
    series,
    pages,
    entryPages: sortRows(entryPages),
    sources: sortRows(sources),
    devices: sortRows(devices),
    browsers: sortRows(browsers),
    os: sortRows(oses),
    languages: sortRows(languages),
    events,
    realtime,
    generatedAt: new Date(now).toISOString(),
  };
}
