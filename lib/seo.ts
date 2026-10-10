import type { Metadata } from "next";
import type { PageCopy } from "@/types/cms";

/** Sayfa kopyasından standart meta verisi üretir. */
export function pageMetadata(copy: PageCopy, path: string): Metadata {
  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical: path },
    openGraph: { title: copy.metaTitle, description: copy.metaDescription, url: path, type: "website", locale: "tr_TR" },
    twitter: { card: "summary_large_image", title: copy.metaTitle, description: copy.metaDescription },
  };
}

/**
 * <script type="application/ld+json"> içeriği için güvenli JSON.
 * "<" kaçışlanmazsa CMS metnindeki "</script>" etiketi betik bloğunu kapatıp HTML enjekte edebilir;
 * ">", "&" ve satır ayırıcıları da (U+2028/2029) aynı nedenle kaçışlanır.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
