import { GoogleAnalytics } from "@/components/layout/google-analytics";
import { InteractiveBackground } from "@/components/layout/interactive-background";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getCms } from "@/lib/cms";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const cms = await getCms();
  return (
    <>
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-deep"
      >
        İçeriğe geç
      </a>
      <InteractiveBackground />
      <SiteHeader
        brandName={cms.general.brandName}
        navigation={cms.general.navigation}
        drawerNote={cms.general.drawerNote}
        email={cms.contact.email}
        phone={cms.contact.phone}
        socials={cms.contact.socials}
      />
      <main id="icerik" className="relative">
        {children}
      </main>
      <SiteFooter cms={cms} />
      {/* Yalnızca herkese açık site sayfalarında; yönetim paneli ölçülmez. */}
      <GoogleAnalytics settings={cms.analytics} />
    </>
  );
}
