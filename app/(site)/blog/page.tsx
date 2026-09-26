import type { Metadata } from "next";
import { BlogExplorer } from "@/components/pages/blog-explorer";
import { PageHeader } from "@/components/ui/primitives";
import { getCms } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getCms();
  return pageMetadata(pages.blog, "/blog");
}

export default async function BlogPage() {
  const cms = await getCms();
  const copy = cms.pages.blog;
  const posts = cms.blog.filter((p) => p.visible).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <BlogExplorer posts={posts} />
    </>
  );
}
