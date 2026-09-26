import type { Metadata } from "next";
import { ServicesExplorer } from "@/components/pages/services-explorer";
import { PageHeader } from "@/components/ui/primitives";
import { getCms } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getCms();
  return pageMetadata(pages.services, "/services");
}

export default async function ServicesPage() {
  const cms = await getCms();
  const copy = cms.pages.services;
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <ServicesExplorer services={cms.services.filter((s) => s.visible)} />
    </>
  );
}
