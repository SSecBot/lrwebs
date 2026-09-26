import type { MetadataRoute } from "next";
import { getCms } from "@/lib/cms";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cms = await getCms();
  const base = cms.general.siteUrl.replace(/\/$/, "");
  const updated = new Date(cms.updatedAt);

  const staticRoutes: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/services", priority: 0.9, changeFrequency: "monthly" },
    { path: "/portfolio", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
  ];

  return [
    ...staticRoutes.map((r) => ({
      url: `${base}${r.path}`,
      lastModified: updated,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...cms.blog
      .filter((p) => p.visible)
      .map((p) => ({
        url: `${base}/blog/${p.slug}`,
        lastModified: new Date(p.publishedAt),
        changeFrequency: "yearly" as const,
        priority: 0.6,
      })),
  ];
}
