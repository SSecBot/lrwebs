import type { Metadata } from "next";
import { PricingBuilder } from "@/components/pages/pricing-builder";
import { PageHeader } from "@/components/ui/primitives";
import { getCms } from "@/lib/cms";
import { publicPricing, todayKey } from "@/lib/pricing";

// Tarihli kampanyaların zamanında görünmesi/kalkması için saatte bir yeniden üretilir.
export const revalidate = 3600;
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getCms();
  return pageMetadata(pages.pricing, "/pricing");
}

export default async function PricingPage() {
  const cms = await getCms();
  const copy = cms.pages.pricing;
  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <PricingBuilder pricing={publicPricing(cms.pricing)} today={todayKey()} />
    </>
  );
}
