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
