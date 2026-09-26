import { ContactForm } from "@/components/contact/contact-form";
import { BusinessHours, ContactChannels } from "@/components/contact/contact-info";
import { SectionHeading } from "@/components/ui/primitives";
import type { ContactSettings, SectionCopy } from "@/types/cms";

export function ContactSection({ copy, contact }: { copy: SectionCopy; contact: ContactSettings }) {
  return (
    <section id="iletisim" className="container-wide py-16 sm:py-24" aria-labelledby="contact-title">
      <div className="card grid gap-10 p-5 sm:p-8 lg:grid-cols-[1.5fr_1fr] lg:gap-14 lg:p-12">
        <div>
          <SectionHeading id="contact-title" eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
          <ContactForm form={contact.form} className="mt-8" />
        </div>
        <aside className="space-y-4 lg:border-l lg:border-line lg:pl-10">
          <ContactChannels contact={contact} />
          <BusinessHours contact={contact} />
          {contact.responseNote ? <p className="text-xs leading-5 text-muted">{contact.responseNote}</p> : null}
        </aside>
      </div>
    </section>
  );
}
