import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { BusinessHours, ContactChannels } from "@/components/contact/contact-info";
import { PageHeader } from "@/components/ui/primitives";
import { getCms } from "@/lib/cms";
import { CmsIcon, SocialIcon } from "@/lib/icons";
import { pageMetadata } from "@/lib/seo";
import { safeHref } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getCms();
  return pageMetadata(pages.contact, "/contact");
}

export default async function ContactPage() {
  const cms = await getCms();
  const { contact } = cms;
  const copy = cms.pages.contact;

  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      <section className="container-wide grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:gap-8">
        <div className="card p-5 sm:p-8 lg:p-10">
          <h2 className="font-mono text-xl font-bold text-fg">Proje talebi</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Tüm alanlar zorunludur. Alanlar siz yazarken doğrulanır; göndermeden önce hataları düzeltebilirsiniz.
          </p>
          <ContactForm form={contact.form} className="mt-8" />
        </div>

        <aside className="space-y-4">
          <ContactChannels contact={contact} />
          <BusinessHours contact={contact} />
          {contact.responseNote ? (
            <p className="rounded-xl border border-warm/30 bg-warm/5 p-4 text-xs leading-5 text-fg/90">{contact.responseNote}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {contact.socials
              .filter((s) => s.visible)
              .map((s) => (
                <a
                  key={s.id}
                  href={safeHref(s.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-muted transition hover:border-primary/60 hover:text-fg"
                >
                  <SocialIcon platform={s.platform} className="h-3.5 w-3.5" />
                  {s.label}
                </a>
              ))}
          </div>
        </aside>
      </section>

      {contact.details.length ? (
        <section className="container-wide pt-16" aria-labelledby="ops-title">
          <h2 id="ops-title" className="font-mono text-xl font-bold text-fg sm:text-2xl">
            Operasyonel detaylar
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {contact.details.map((d) => (
              <article key={d.id} className="card p-6">
                <span className="inline-flex rounded-xl border border-line bg-deep p-2.5">
                  <CmsIcon name={d.icon} className="h-5 w-5 text-primary" />
                </span>
                <h3 className="mt-4 font-mono text-base font-bold text-fg">{d.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{d.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
