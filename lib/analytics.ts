/**
 * Google Analytics 4 yardımcıları (istemci + sunucu ortak).
 */

const MEASUREMENT_ID = /\bG-[A-Z0-9]{4,15}\b/i;

/**
 * Yönetim panelinde girilen değerden GA4 Ölçüm Kimliğini ayıklar.
 * Doğrudan "G-XXXXXXX" ya da Google'ın verdiği <script> parçacığının tamamı yapıştırılabilir;
 * her iki durumda da yalnızca kimlik saklanır, betik kodu asla sayfaya gömülmez.
 */
export function extractMeasurementId(input: string): string | null {
  const match = MEASUREMENT_ID.exec(input ?? "");
  return match ? match[0].toUpperCase() : null;
}

export function isValidMeasurementId(id: string): boolean {
  return /^G-[A-Z0-9]{4,15}$/.test(id);
}

export const CONSENT_STORAGE_KEY = "lrwebs-analytics-consent";
export const OPEN_CONSENT_EVENT = "lrwebs:open-consent";

/** Para birimi simgesini GA4'ün beklediği ISO 4217 koduna çevirir. */
export function currencyCode(symbol: string): string | undefined {
  const s = symbol.trim().toUpperCase();
  if (s === "₺" || s === "TL" || s === "TRY") return "TRY";
  if (s === "$" || s === "USD") return "USD";
  if (s === "€" || s === "EUR") return "EUR";
  if (s === "£" || s === "GBP") return "GBP";
  return undefined;
}

type Gtag = (...args: unknown[]) => void;

/** GA4 olayı gönderir; analitik yüklü değilse (onay yok, kapalı vb.) sessizce yok sayılır. */
export function trackEvent(name: string, params: Record<string, string | number | boolean | undefined> = {}) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag === "function") gtag("event", name, params);
}
