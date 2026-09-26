import type { Metadata } from "next";
import { Suspense } from "react";
import { PortfolioExplorer } from "@/components/pages/portfolio-explorer";
import { PageHeader } from "@/components/ui/primitives";
import { getCms } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getCms();
  return pageMetadata(pages.portfolio, "/portfolio");
}

export default async function PortfolioPage() {
  const cms = await getCms();
  const copy = cms.pages.portfolio;
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <Suspense fallback={<div className="container-wide h-96" aria-busy="true" />}>
        <PortfolioExplorer projects={cms.projects.filter((p) => p.visible)} />
      </Suspense>
    </>
  );
}
