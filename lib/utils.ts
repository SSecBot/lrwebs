import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { isSafeUrl } from "@/lib/sanitize";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TR_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  Ç: "c",
  Ğ: "g",
  Ö: "o",
  Ş: "s",
  Ü: "u",
};

/** Türkçe karakterleri dönüştürerek URL dostu bir kısa ad üretir. */
export function slugify(input: string): string {
  return input
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Dakika cinsinden tahmini okuma süresi (dakikada ~200 kelime). */
export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function formatPrice(value: number, currency = "₺"): string {
  return `${currency}${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value)}`;
}

export function uid(prefix = "id"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

/** Yalnızca güvenli protokollere izin verir; aksi halde "#" döner. */
export function safeHref(href: string | undefined | null): string {
  if (!href) return "#";
  const value = href.trim();
  return value && isSafeUrl(value) ? value : "#";
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** Markdown benzeri içerikten düz metin çıkarır. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/[ \t]+/g, " ")
    .trim();
}
