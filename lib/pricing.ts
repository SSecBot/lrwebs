import { isSafeSitePath } from "@/lib/sanitize";
import type { PricingSettings, QuoteSnapshot } from "@/types/cms";

/**
 * Fiyat oluşturucu hesaplamaları — istemci (paket oluşturucu, iletişim formu) ve sunucu
 * (iletişim eylemi) aynı fonksiyonu kullanır. Sunucu, istemcinin gönderdiği fiyatlara
 * güvenmez; yalnızca seçimleri alır ve tutarı güncel CMS verisinden yeniden hesaplar.
 */

export interface QuoteSelection {
  packageId: string;
  addonIds: string[];
  extraPages: number;
  rush: boolean;
}

export interface QuoteLine {
  label: string;
  min: number;
  max: number;
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
}

const ID = /^[a-zA-Z0-9_-]{1,64}$/;

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
  return { packageId: pkg.id, addonIds, extraPages, rush: raw.rush === true };
}

export function computeEstimate(pricing: PricingSettings, selection: QuoteSelection): QuoteEstimate | null {
  const pkg = pricing.packages.find((p) => p.visible && p.id === selection.packageId);
  if (!pkg) return null;
  const addons = pricing.addons.filter((a) => a.visible && selection.addonIds.includes(a.id));

  const lines: QuoteLine[] = [{ label: `${pkg.name} paketi`, min: pkg.priceMin, max: pkg.priceMax }];
  for (const addon of addons) lines.push({ label: addon.label, min: addon.priceMin, max: addon.priceMax });
  if (selection.extraPages > 0) {
    const cost = selection.extraPages * pricing.extraPagePrice;
    lines.push({ label: `${selection.extraPages} ek sayfa`, min: cost, max: Math.round(cost * 1.2) });
  }
  let min = lines.reduce((sum, l) => sum + l.min, 0);
  let max = lines.reduce((sum, l) => sum + l.max, 0);
  if (selection.rush) {
    lines.push({
      label: `${pricing.rushLabel} (×${pricing.rushMultiplier.toLocaleString("tr-TR")})`,
      min: Math.round(min * (pricing.rushMultiplier - 1)),
      max: Math.round(max * (pricing.rushMultiplier - 1)),
    });
    min = Math.round(min * pricing.rushMultiplier);
    max = Math.round(max * pricing.rushMultiplier);
  }
  return {
    packageName: pkg.name,
    timeline: pkg.timeline,
    addons: addons.map((a) => a.label),
    extraPages: selection.extraPages,
    rush: selection.rush,
    lines,
    // Sonuçları okunabilirlik için 500'lük dilimlere yuvarla.
    min: Math.round(min / 500) * 500,
    max: Math.round(max / 500) * 500,
  };
}

/** Mesaj kutusunda saklanan, o anki fiyatlarla dondurulmuş özet. */
export function buildQuoteSnapshot(pricing: PricingSettings, selection: QuoteSelection): QuoteSnapshot | null {
  const estimate = computeEstimate(pricing, selection);
  if (!estimate) return null;
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
  };
}

/* ---------- URL taşıma (fiyatlandırma → iletişim) ---------- */

const KEYS = { package: "paket", addons: "modul", pages: "sayfa", rush: "oncelik" } as const;

export function selectionToSearch(selection: Pick<QuoteSelection, "packageId"> & Partial<QuoteSelection>): string {
  const params = new URLSearchParams();
  params.set(KEYS.package, selection.packageId);
  if (selection.addonIds?.length) params.set(KEYS.addons, selection.addonIds.join(","));
  if (selection.extraPages) params.set(KEYS.pages, String(selection.extraPages));
  if (selection.rush) params.set(KEYS.rush, "1");
  return params.toString();
}

/** Ham URL sorgusundan seçim okur (doğrulama normalizeSelection ile yapılır). */
export function selectionFromSearch(search: string): Record<string, unknown> | null {
  const params = new URLSearchParams(search);
  const packageId = params.get(KEYS.package);
  if (!packageId) return null;
  return {
    packageId,
    addonIds: (params.get(KEYS.addons) ?? "").split(",").filter(Boolean).slice(0, 30),
    extraPages: Number(params.get(KEYS.pages) ?? 0),
    rush: params.get(KEYS.rush) === "1",
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
