import { isSafeSitePath, isSafeUrl } from "@/lib/sanitize";
import type { GeneralSettings } from "@/types/cms";

/**
 * Tarayıcı sekmesi kimliği (başlık + ikon) yardımcıları.
 * Hem sunucuda (generateMetadata) hem istemcide (yönetim paneli önizlemesi) kullanılır.
 */

export const DEFAULT_FAVICON = "/favicon.svg";

const ICON_EXT = /\.(ico|png|svg)$/i;

/** Sekme ikonu: .ico/.png/.svg ile biten site içi güvenli yol veya https adresi. */
export function isSafeIconUrl(value: string): boolean {
  if (typeof value !== "string" || value.length === 0 || value.length > 300) return false;
  if (isSafeSitePath(value)) return ICON_EXT.test(value.split(/[?#]/)[0]);
  if (!/^https:\/\//i.test(value) || !isSafeUrl(value)) return false;
  try {
    return ICON_EXT.test(new URL(value).pathname);
  } catch {
    return false;
  }
}

export function iconMimeType(url: string): string {
  const path = url.split(/[?#]/)[0].toLowerCase();
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  return "image/x-icon";
}

/** Depodaki değer (elle düzenlenmiş olsa bile) güvenli değilse varsayılan ikona düşer. */
export function resolveFavicon(general: Pick<GeneralSettings, "faviconUrl">): string {
  return isSafeIconUrl(general.faviconUrl ?? "") ? general.faviconUrl : DEFAULT_FAVICON;
}

/** Geçerli bir "%s" şablonu döndürür; boş veya hatalı şablonlarda marka adını kullanır. */
export function resolveTitleTemplate(general: Pick<GeneralSettings, "titleTemplate" | "brandName">): string {
  const template = general.titleTemplate ?? "";
  return template.split("%s").length === 2 ? template : `%s | ${general.brandName}`;
}

/** Bir alt sayfanın sekmede nasıl görüneceğini hesaplar. */
export function formatTabTitle(general: Pick<GeneralSettings, "titleTemplate" | "brandName">, pageTitle: string): string {
  return resolveTitleTemplate(general).replace("%s", pageTitle);
}
