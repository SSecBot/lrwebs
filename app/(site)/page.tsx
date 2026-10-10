import { ContactSection } from "@/components/home/contact-section";
import { HeroSection } from "@/components/home/hero-section";
import { AboutSummary, BlogGrid, ProjectsCarousel, ServicesPreview, StatsSection } from "@/components/home/sections";
import { getCms } from "@/lib/cms";
import { publicPricing, todayKey } from "@/lib/pricing";
import { serializeJsonLd } from "@/lib/seo";

// Tarihli kampanyaların zamanında görünmesi/kalkması için saatte bir yeniden üretilir.
export const revalidate = 3600;

export default async function HomePage() {
  const cms = await getCms();
  const services = cms.services.filter((s) => s.visible);
  const projects = cms.projects.filter((p) => p.visible);
  const posts = cms.blog
    .filter((p) => p.visible)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: cms.general.brandName,
    url: cms.general.siteUrl,
    description: cms.general.siteDescription,
    email: cms.contact.email || undefined,
    telephone: cms.contact.phone || undefined,
    address: cms.contact.address || undefined,
    sameAs: cms.contact.socials.filter((s) => s.visible).map((s) => s.url),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <HeroSection hero={cms.hero} />
      <StatsSection stats={cms.stats} />
      <ServicesPreview copy={cms.sections.services} services={services} />
      <AboutSummary copy={cms.sections.about} about={cms.about} />
      <ProjectsCarousel copy={cms.sections.projects} projects={projects} />
      <BlogGrid copy={cms.sections.blog} posts={posts} />
      <ContactSection copy={cms.sections.contact} contact={cms.contact} pricing={publicPricing(cms.pricing)} today={todayKey()} />
    </>
  );
}
