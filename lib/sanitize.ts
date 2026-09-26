/**
 * Girdi temizleme yardımcıları.
 * Tüm içerik React tarafından metin olarak (escape edilerek) render edilir;
 * bu fonksiyonlar kaydedilen veriyi ek bir savunma katmanı olarak temizler.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const DANGEROUS_BLOCKS =
  /<\s*(script|style|iframe|object|embed|svg|math|template|link|meta|base|form)\b[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi;
const HTML_TAG = /<\/?[a-z][a-z0-9-]*(\s[^<>]*)?\/?>/gi;
const EVENT_HANDLER_ATTR = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_PROTOCOL = /(java|vb)script\s*:/gi;

/** Tek satırlık / kısa metinler: tüm HTML etiketleri ve kontrol karakterleri kaldırılır. */
export function sanitizeText(value: string): string {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(DANGEROUS_BLOCKS, "")
    .replace(HTML_TAG, "")
    .replace(JS_PROTOCOL, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

/**
 * Uzun, Markdown benzeri içerikler: tehlikeli bloklar ve olay öznitelikleri kaldırılır,
 * satır sonları korunur. Kod örneklerindeki zararsız "<" karakterleri korunur çünkü
 * render sırasında yalnızca metin olarak gösterilir.
 */
export function sanitizeRichText(value: string): string {
  return value
    .replace(CONTROL_CHARS, "")
    .replace(DANGEROUS_BLOCKS, "")
    .replace(EVENT_HANDLER_ATTR, "")
    .replace(JS_PROTOCOL, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

/** Bağlantılar için güvenli protokol kontrolü. Boş değerlere izin verilir. */
export function isSafeUrl(value: string): boolean {
  if (value === "" || value === "#") return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (value.startsWith("#")) return true;
  return /^(https?:\/\/[^\s<>"']+|mailto:[^\s<>"']+|tel:[+\d\s()-]+)$/i.test(value);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(value);
}
