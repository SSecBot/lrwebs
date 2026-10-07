import { isSafeSitePath } from "@/lib/sanitize";
import { formatPrice } from "@/lib/utils";
import type { PricingDiscount, PricingSettings, PublicDiscount, QuoteSnapshot } from "@/types/cms";

/**
 * Fiyat oluşturucu hesaplamaları — istemci (paket oluşturucu, iletişim formu) ve sunucu
 * (iletişim eylemi) aynı fonksiyonu kullanır. Sunucu, istemcinin gönderdiği fiyatlara
 * güvenmez; yalnızca seçimleri (ve varsa kupon kodunu) alır ve tutarı güncel CMS verisinden
 * yeniden hesaplar.
 */

export interface QuoteSelection {
  packageId: string;
  addonIds: string[];
  extraPages: number;
  rush: boolean;
  /** Ziyaretçinin girdiği kupon kodu (doğrulaması ayrıca yapılır). */
  coupon?: string;
}

export interface QuoteLine {
  label: string;
  min: number;
  max: number;
}

export interface AppliedDiscount {
  id: string;
  name: string;
  /** "%20" veya "₺5.000" */
  label: string;
  /** Kuponla geldiyse kod */
  code?: string;
  /** İndirim tutarı (pozitif) */
  min: number;
  max: number;
  endsAt: string;
}

export interface QuoteEstimate {
  packageName: string;
  timeline: string;
  addons: string[];
  extraPages: number;
  rush: boolean;
  lines: QuoteLine[];
  min: number;
  max: number;
  discount: AppliedDiscount | null;
  /** İndirim uygulanmasaydı tutar (indirim yoksa min/max ile aynı). */
  originalMin: number;
  originalMax: number;
}

/** Doğrulanmış kupon: kodun kendisi ve istemciye gösterilebilir indirim bilgisi. */
export interface CouponInfo {
  code: string;
  discount: PublicDiscount;
}

const ID = /^[a-zA-Z0-9_-]{1,64}$/;
export const COUPON_PATTERN = /^[A-Z0-9_-]{3,30}$/;

/* ---------- Tarih (site saat dilimi) ---------- */

export const SITE_TIME_ZONE = "Europe/Istanbul";
const DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: SITE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Site saat diliminde bugünün tarihi (YYYY-MM-DD). */
export const todayKey = (now: number = Date.now()) => DAY_FMT.format(now);

/** "31 Ekim" biçiminde kısa tarih. */
export function formatDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });
}

/* ---------- İndirim kuralları ---------- */

type DiscountRule = Pick<
  PricingDiscount,
  "id" | "name" | "enabled" | "type" | "value" | "appliesTo" | "packageIds" | "startsAt" | "endsAt"
>;

export type DiscountStatus = "active" | "scheduled" | "expired" | "disabled";

export function discountStatus(d: DiscountRule, today: string): DiscountStatus {
  if (!d.enabled) return "disabled";
  if (d.startsAt && today < d.startsAt) return "scheduled";
  if (d.endsAt && today > d.endsAt) return "expired";
  return "active";
}

const appliesToPackage = (d: DiscountRule, packageId: string) => d.packageIds.length === 0 || d.packageIds.includes(packageId);

export function discountLabel(d: Pick<DiscountRule, "type" | "value">, currency: string): string {
  return d.type === "percent" ? `%${d.value.toLocaleString("tr-TR")}` : formatPrice(d.value, currency);
}

/** İndirim tutarı gösterimi: "−₺50.000" veya "−(₺19.000 – ₺30.000)". */
export function formatDiscountAmount(min: number, max: number, currency: string): string {
  return min === max ? `−${formatPrice(min, currency)}` : `−(${formatPrice(min, currency)} – ${formatPrice(max, currency)})`;
}

function amountOff(d: DiscountRule, base: number): number {
  if (base <= 0) return 0;
  return d.type === "percent" ? Math.round((base * d.value) / 100) : Math.min(d.value, base);
}

export function toPublicDiscount(d: PricingDiscount): PublicDiscount {
  const { code, ...rest } = d;
  return { ...rest, coupon: code !== "" };
}

/**
 * Ziyaretçiye gönderilecek fiyat ayarları: kupon kodlu indirimler (ve kodları) tamamen çıkarılır;
 * kapalı, süresi dolmuş veya yarından sonra başlayacak kampanyalar gönderilmez (önceden duyulmasın).
 * Yarın başlayanlar dahildir: sayfa gece yarısı yeniden üretilmemiş olsa da tarayıcı kampanyayı
 * zamanında gösterir. Bu yüzden fiyat içeren sayfalar saatte bir yeniden üretilir (revalidate).
 */
export function publicPricing(pricing: PricingSettings, today = todayKey()): PricingSettings {
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const horizon = tomorrow.toISOString().slice(0, 10);
  return {
    ...pricing,
    discounts: (pricing.discounts ?? []).filter(
      (d) => !d.code && d.enabled && !(d.endsAt && today > d.endsAt) && !(d.startsAt && d.startsAt > horizon),
    ),
  };
}

/** Koda karşılık gelen, bugün geçerli kuponu bulur (yalnızca sunucuda; kodlar istemciye gitmez). */
export function findCoupon(pricing: PricingSettings, rawCode: string, today = todayKey()): CouponInfo | null {
  const code = String(rawCode ?? "")
    .trim()
    .toUpperCase();
  if (!COUPON_PATTERN.test(code)) return null;
  const match = (pricing.discounts ?? []).find((d) => d.code === code);
  if (!match || discountStatus(match, today) !== "active") return null;
  return { code, discount: toPublicDiscount(match) };
}

/** Bir paketin kartında gösterilecek kampanya fiyatı (yalnızca otomatik kampanyalar). */
export function packageOffer(
  pricing: PricingSettings,
  pkg: { id: string; priceMin: number; priceMax: number },
  today: string,
): { min: number; max: number; discount: AppliedDiscount } | null {
  let best: { min: number; max: number; discount: AppliedDiscount } | null = null;
  for (const d of pricing.discounts ?? []) {
    if (d.code || discountStatus(d, today) !== "active" || !appliesToPackage(d, pkg.id)) continue;
    const offMin = amountOff(d, pkg.priceMin);
    const offMax = amountOff(d, pkg.priceMax);
    if (offMin <= 0 && offMax <= 0) continue;
    if (!best || offMin > best.discount.min) {
      best = {
        min: pkg.priceMin - offMin,
        max: pkg.priceMax - offMax,
        discount: {
          id: d.id,
          name: d.name,
          label: discountLabel(d, pricing.currency),
          min: offMin,
          max: offMax,
          endsAt: d.endsAt,
        },
      };
    }
  }
  return best;
}

/* ---------- Seçim ve hesaplama ---------- */

/** Seçimi fiyat ayarlarına göre doğrular; geçersiz/gizli öğeler atılır. Paket yoksa null. */
export function normalizeSelection(pricing: PricingSettings, input: unknown): QuoteSelection | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;
  const pkg = pricing.packages.find((p) => p.visible && p.id === raw.packageId);
  if (!pkg) return null;
  const wanted = Array.isArray(raw.addonIds) ? raw.addonIds.filter((a): a is string => typeof a === "string" && ID.test(a)) : [];
  const addonIds = pricing.addons.filter((a) => a.visible && wanted.includes(a.id)).map((a) => a.id);
  const pages = Number(raw.extraPages);
  const extraPages = Number.isFinite(pages) ? Math.min(pricing.maxExtraPages, Math.max(0, Math.floor(pages))) : 0;
  const coupon = typeof raw.coupon === "string" ? raw.coupon.trim().toUpperCase() : "";
  return {
    packageId: pkg.id,
    addonIds,
    extraPages,
    rush: raw.rush === true,
    ...(COUPON_PATTERN.test(coupon) ? { coupon } : {}),
  };
}

const round500 = (n: number) => Math.round(n / 500) * 500;

export function computeEstimate(
  pricing: PricingSettings,
  selection: QuoteSelection,
  options: { today: string; coupon?: CouponInfo | null },
): QuoteEstimate | null {
  const pkg = pricing.packages.find((p) => p.visible && p.id === selection.packageId);
  if (!pkg) return null;
  const addons = pricing.addons.filter((a) => a.visible && selection.addonIds.includes(a.id));

  const lines: QuoteLine[] = [{ label: `${pkg.name} paketi`, min: pkg.priceMin, max: pkg.priceMax }];
  for (const addon of addons) lines.push({ label: addon.label, min: addon.priceMin, max: addon.priceMax });
  if (selection.extraPages > 0) {
    const cost = selection.extraPages * pricing.extraPagePrice;
    lines.push({ label: `${selection.extraPages} ek sayfa`, min: cost, max: Math.round(cost * 1.2) });
  }
  const subMin = lines.reduce((sum, l) => sum + l.min, 0);
  const subMax = lines.reduce((sum, l) => sum + l.max, 0);

  // Uygun indirimler: otomatik kampanyalar + (geçerliyse) kupon. Yalnızca en avantajlısı uygulanır.
  const candidates: { rule: DiscountRule; code?: string }[] = (pricing.discounts ?? [])
    .filter((d) => !d.code)
    .map((rule) => ({ rule }));
  if (options.coupon && options.coupon.code === selection.coupon) {
    candidates.push({ rule: options.coupon.discount, code: options.coupon.code });
  }
  let discount: AppliedDiscount | null = null;
  for (const { rule, code } of candidates) {
    if (discountStatus(rule, options.today) !== "active" || !appliesToPackage(rule, pkg.id)) continue;
    const baseMin = rule.appliesTo === "package" ? pkg.priceMin : subMin;
    const baseMax = rule.appliesTo === "package" ? pkg.priceMax : subMax;
    const offMin = amountOff(rule, baseMin);
    const offMax = amountOff(rule, baseMax);
    if (offMin <= 0 && offMax <= 0) continue;
    if (!discount || offMin > discount.min || (offMin === discount.min && offMax > discount.max)) {
      discount = {
        id: rule.id,
        name: rule.name,
        label: discountLabel(rule, pricing.currency),
        ...(code ? { code } : {}),
        min: offMin,
        max: offMax,
        endsAt: rule.endsAt,
      };
    }
  }

  // Öncelik çarpanı indirimli tutara uygulanır.
  let min = subMin - (discount?.min ?? 0);
  let max = subMax - (discount?.max ?? 0);
  const multiplier = selection.rush ? pricing.rushMultiplier : 1;
  if (selection.rush) {
    lines.push({
      label: `${pricing.rushLabel} (×${pricing.rushMultiplier.toLocaleString("tr-TR")})`,
      min: Math.round(min * (multiplier - 1)),
      max: Math.round(max * (multiplier - 1)),
    });
    min = Math.round(min * multiplier);
    max = Math.round(max * multiplier);
  }
  return {
    packageName: pkg.name,
    timeline: pkg.timeline,
    addons: addons.map((a) => a.label),
    extraPages: selection.extraPages,
    rush: selection.rush,
    lines,
    discount,
    // Sonuçları okunabilirlik için 500'lük dilimlere yuvarla.
    min: round500(min),
    max: round500(max),
    originalMin: round500(subMin * multiplier),
    originalMax: round500(subMax * multiplier),
  };
}

/** Mesaj kutusunda saklanan, o anki fiyatlarla dondurulmuş özet. */
export function buildQuoteSnapshot(
  pricing: PricingSettings,
  selection: QuoteSelection,
  options: { today: string; coupon?: CouponInfo | null },
): QuoteSnapshot | null {
  const estimate = computeEstimate(pricing, selection, options);
  if (!estimate) return null;
  const d = estimate.discount;
  return {
    packageId: selection.packageId,
    packageName: estimate.packageName,
    timeline: estimate.timeline,
    addons: estimate.addons,
    extraPages: estimate.extraPages,
    rush: estimate.rush,
    rushLabel: pricing.rushLabel,
    lines: estimate.lines,
    min: estimate.min,
    max: estimate.max,
    currency: pricing.currency,
    ...(d
      ? {
          discount: { name: d.name, label: d.label, ...(d.code ? { code: d.code } : {}), min: d.min, max: d.max },
          originalMin: estimate.originalMin,
          originalMax: estimate.originalMax,
        }
      : {}),
  };
}

/* ---------- URL taşıma (fiyatlandırma → iletişim) ---------- */

export const QUOTE_KEYS = { package: "paket", addons: "modul", pages: "sayfa", rush: "oncelik", coupon: "kupon" } as const;

export function selectionToSearch(selection: Pick<QuoteSelection, "packageId"> & Partial<QuoteSelection>): string {
  const params = new URLSearchParams();
  params.set(QUOTE_KEYS.package, selection.packageId);
  if (selection.addonIds?.length) params.set(QUOTE_KEYS.addons, selection.addonIds.join(","));
  if (selection.extraPages) params.set(QUOTE_KEYS.pages, String(selection.extraPages));
  if (selection.rush) params.set(QUOTE_KEYS.rush, "1");
  if (selection.coupon) params.set(QUOTE_KEYS.coupon, selection.coupon);
  return params.toString();
}

/** Ham URL sorgusundan seçim okur (doğrulama normalizeSelection ile yapılır). */
export function selectionFromSearch(search: string): Record<string, unknown> | null {
  const params = new URLSearchParams(search);
  const packageId = params.get(QUOTE_KEYS.package);
  if (!packageId) return null;
  return {
    packageId,
    addonIds: (params.get(QUOTE_KEYS.addons) ?? "").split(",").filter(Boolean).slice(0, 30),
    extraPages: Number(params.get(QUOTE_KEYS.pages) ?? 0),
    rush: params.get(QUOTE_KEYS.rush) === "1",
    coupon: params.get(QUOTE_KEYS.coupon) ?? "",
  };
}

/** Site içi bir bağlantıya seçimleri ekler; harici bağlantılar olduğu gibi döner. */
export function withQuote(href: string, selection: Pick<QuoteSelection, "packageId"> & Partial<QuoteSelection>): string {
  if (!isSafeSitePath(href)) return href;
  const [pathAndQuery, hash = ""] = href.split("#");
  const [pathname, query = ""] = pathAndQuery.split("?");
  const params = new URLSearchParams(query);
  for (const [k, v] of new URLSearchParams(selectionToSearch(selection))) params.set(k, v);
  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ""}`;
}
