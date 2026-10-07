/**
 * Dahili analitik: istemci + sunucu ortak yardımcılar.
 *
 * Ziyaretçi tarayıcısında hiçbir şey saklanmaz (çerez, localStorage vb. yok); ziyaretçiler
 * sunucuda, her gün değişen gizli bir tuzla üretilen tek yönlü bir özetle sayılır. Bu yüzden
 * çerez onayı banner'ı gerekmez ve veriler üçüncü taraflara gönderilmez.
 */

export const COLLECT_ENDPOINT = "/api/analytics";

/** Özel olaylar için okunabilir adlar (yönetim paneli). Listede olmayan adlar olduğu gibi gösterilir. */
export const EVENT_LABELS: Record<string, string> = {
  generate_lead: "İletişim formu gönderildi",
  pricing_quote_request: "Fiyat teklifi istendi",
  pricing_package_select: "Fiyat paketi seçildi",
  pricing_coupon_apply: "İndirim kodu uygulandı",
};

export type EventProps = Record<string, string | number | boolean | undefined>;

/** Para birimi simgesini ISO 4217 koduna çevirir (olay özelliklerinde tutarlı görünüm için). */
export function currencyCode(symbol: string): string | undefined {
  const s = symbol.trim().toUpperCase();
  if (s === "₺" || s === "TL" || s === "TRY") return "TRY";
  if (s === "$" || s === "USD") return "USD";
  if (s === "€" || s === "EUR") return "EUR";
  if (s === "£" || s === "GBP") return "GBP";
  return undefined;
}

type AnalyticsWindow = Window & { __lrwebsAnalytics?: boolean };

/** Ham veri gönderimi: sayfa kapanırken de ulaşması için sendBeacon, yoksa keepalive fetch. */
export function sendAnalytics(payload: Record<string, unknown>) {
  if (typeof window === "undefined" || !(window as AnalyticsWindow).__lrwebsAnalytics) return;
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.(COLLECT_ENDPOINT, new Blob([body], { type: "text/plain" }))) return;
  } catch {
    /* sendBeacon kullanılamıyorsa fetch ile dene */
  }
  void fetch(COLLECT_ENDPOINT, {
    method: "POST",
    body,
    keepalive: true,
    credentials: "same-origin",
    headers: { "Content-Type": "text/plain" },
  }).catch(() => undefined);
}

/** Özel olay kaydeder; analitik kapalıysa veya ziyaretçi ölçülmüyorsa sessizce yok sayılır. */
export function trackEvent(name: string, props: EventProps = {}) {
  if (typeof window === "undefined") return;
  sendAnalytics({ type: "event", name, path: window.location.pathname, props });
}
