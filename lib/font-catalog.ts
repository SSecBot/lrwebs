/**
 * Yönetim panelinden seçilebilen yazı tipleri.
 * Tümü Türkçe karakterleri (latin-ext: ç ğ ı İ ö ş ü) destekler ve next/font ile kendi
 * sunucumuzdan servis edilir: ziyaretçinin IP adresi Google'a gitmez (KVKK), CSP gevşetilmez.
 * Tarayıcı yalnızca sayfada gerçekten kullanılan fontların dosyalarını indirir.
 *
 * Yeni bir font eklemek için: buraya bir kayıt + lib/fonts.ts içinde aynı anahtarla bir tanım.
 */

export type FontCategory = "sans" | "serif" | "display" | "script" | "mono";

export interface FontOption {
  key: string;
  label: string;
  category: FontCategory;
  /** Kullanılabilir ağırlıklar (400 her zaman vardır). */
  weights: number[];
  /** CSS yedek (fallback) aile listesi. */
  fallback: string;
}

const SANS = "ui-sans-serif, system-ui, sans-serif";
const SERIF = "ui-serif, Georgia, serif";
const SCRIPT = '"Brush Script MT", cursive';
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const ALL = [400, 500, 600, 700];

export const FONT_CATALOG: FontOption[] = [
  { key: "poppins", label: "Poppins", category: "sans", weights: ALL, fallback: SANS },
  { key: "inter", label: "Inter", category: "sans", weights: ALL, fallback: SANS },
  { key: "roboto", label: "Roboto", category: "sans", weights: ALL, fallback: SANS },
  { key: "open-sans", label: "Open Sans", category: "sans", weights: ALL, fallback: SANS },
  { key: "montserrat", label: "Montserrat", category: "sans", weights: ALL, fallback: SANS },
  { key: "nunito", label: "Nunito", category: "sans", weights: ALL, fallback: SANS },
  { key: "raleway", label: "Raleway", category: "sans", weights: ALL, fallback: SANS },
  { key: "lato", label: "Lato", category: "sans", weights: [400, 700], fallback: SANS },
  { key: "work-sans", label: "Work Sans", category: "sans", weights: ALL, fallback: SANS },
  { key: "dm-sans", label: "DM Sans", category: "sans", weights: ALL, fallback: SANS },
  { key: "manrope", label: "Manrope", category: "sans", weights: ALL, fallback: SANS },
  { key: "plus-jakarta-sans", label: "Plus Jakarta Sans", category: "sans", weights: ALL, fallback: SANS },
  { key: "rubik", label: "Rubik", category: "sans", weights: ALL, fallback: SANS },
  { key: "outfit", label: "Outfit", category: "sans", weights: ALL, fallback: SANS },
  { key: "space-grotesk", label: "Space Grotesk", category: "sans", weights: ALL, fallback: SANS },
  { key: "playfair-display", label: "Playfair Display", category: "serif", weights: ALL, fallback: SERIF },
  { key: "merriweather", label: "Merriweather", category: "serif", weights: ALL, fallback: SERIF },
  { key: "lora", label: "Lora", category: "serif", weights: ALL, fallback: SERIF },
  { key: "libre-baskerville", label: "Libre Baskerville", category: "serif", weights: ALL, fallback: SERIF },
  { key: "oswald", label: "Oswald", category: "display", weights: ALL, fallback: SANS },
  { key: "bebas-neue", label: "Bebas Neue", category: "display", weights: [400], fallback: SANS },
  { key: "archivo-black", label: "Archivo Black", category: "display", weights: [400], fallback: SANS },
  { key: "pacifico", label: "Pacifico", category: "script", weights: [400], fallback: SCRIPT },
  { key: "dancing-script", label: "Dancing Script", category: "script", weights: ALL, fallback: SCRIPT },
  { key: "caveat", label: "Caveat", category: "script", weights: ALL, fallback: SCRIPT },
  { key: "lobster", label: "Lobster", category: "script", weights: [400], fallback: SCRIPT },
  { key: "great-vibes", label: "Great Vibes", category: "script", weights: [400], fallback: SCRIPT },
  { key: "jetbrains-mono", label: "JetBrains Mono", category: "mono", weights: ALL, fallback: MONO },
  { key: "fira-code", label: "Fira Code", category: "mono", weights: ALL, fallback: MONO },
];

export const FONT_KEYS = FONT_CATALOG.map((f) => f.key);

export const CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: "Sans-serif (modern)",
  serif: "Serif (klasik)",
  display: "Gösterişli / dar",
  script: "El yazısı",
  mono: "Eş aralıklı (kod)",
};

export function findFont(key: string): FontOption {
  return FONT_CATALOG.find((f) => f.key === key) ?? FONT_CATALOG[0];
}

/** next/font'un oluşturduğu CSS değişkeni. */
export const fontVar = (key: string) => `var(--font-f-${findFont(key).key})`;

/** Font yığını: seçilen font + kategoriye uygun yedekler. */
export const fontStack = (key: string) => `${fontVar(key)}, ${findFont(key).fallback}`;

/** İstenen ağırlığı fontun desteklediği en yakın ağırlığa indirger (sahte kalınlaştırmayı önler). */
export function effectiveWeight(key: string, wanted: number): number {
  const weights = findFont(key).weights;
  return weights.reduce((best, w) => (Math.abs(w - wanted) < Math.abs(best - wanted) ? w : best), weights[0]);
}

export const BASE_SIZES = { sm: 15, md: 16, lg: 17 } as const;
