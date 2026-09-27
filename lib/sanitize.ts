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

/*
 * Site içi yol: "/" ile başlar, ikinci karakter "/" veya "\" olamaz; boşluk, sekme,
 * ters eğik çizgi ve tırnak içeremez. Tarayıcılar sekme/satır sonlarını silip "\"
 * karakterini "/" gibi yorumladığından "/\t/evil.com" gibi değerler aksi halde
 * harici bir adrese (//evil.com) dönüşebilir.
 */
const SITE_PATH = /^\/(?![/\\])[A-Za-z0-9\-._~!$&()*+,;=:@%/?#]*$/;
const HASH_LINK = /^#[A-Za-z0-9\-._:%]*$/;
const HTTP_URL = /^https?:\/\/[^\s<>"'`\\]+$/i;

/** Aynı site içindeki güvenli bir yol mu? (açık yönlendirme / protokol kaçırma engellenir) */
export function isSafeSitePath(value: string): boolean {
  return SITE_PATH.test(value);
}

/** Bağlantılar için güvenli protokol kontrolü. Boş değerlere izin verilir. */
export function isSafeUrl(value: string): boolean {
  if (value === "") return true;
  if (HASH_LINK.test(value) || isSafeSitePath(value)) return true;
  if (HTTP_URL.test(value)) {
    try {
      const url = new URL(value);
      return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
    } catch {
      return false;
    }
  }
  return /^mailto:[^\s<>"'\\]+$/i.test(value) || /^tel:[+\d ()-]+$/i.test(value);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i.test(value);
}
