import type { MetadataRoute } from "next";
import { getCms } from "@/lib/cms";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { general } = await getCms();
  const base = general.siteUrl.replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
