/**
 * Hem istemcide hem sunucuda çalışan hızlı, kriptografik olmayan özet (FNV-1a, 32 bit).
 * Yalnızca eşzamanlı düzenleme çakışmalarını tespit etmek için bölüm sürümü olarak kullanılır.
 */
export function contentHash(value: unknown): string {
  const text = JSON.stringify(value) ?? "";
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(16).padStart(8, "0")}:${text.length}`;
}
