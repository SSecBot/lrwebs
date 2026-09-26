import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { LegalLinks } from "@/components/layout/legal-modal";
import { SocialIcon } from "@/lib/icons";
import { safeHref } from "@/lib/utils";
import type { CmsStore } from "@/types/cms";

export function SiteFooter({ cms }: { cms: CmsStore }) {
  const { general, contact, legal } = cms;
  const year = new Date().getFullYear();
  const nav = general.navigation.filter((n) => n.visible);

  return (
    <footer className="relative mt-24 border-t border-line bg-deep/80 backdrop-blur">
      <div className="container-wide grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-md space-y-4">
          <Link href="/" className="font-mono text-xl font-bold">
            {general.brandName.slice(0, 2)}
            <span className="text-primary">{general.brandName.slice(2)}</span>
          </Link>
          <p className="text-sm leading-6 text-muted">{general.footer.description}</p>
          <div className="flex gap-2">
            {contact.socials
              .filter((s) => s.visible)
              .map((s) => (
                <a
                  key={s.id}
                  href={safeHref(s.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="rounded-lg border border-line p-2 text-muted transition hover:border-primary/60 hover:text-fg"
                >
                  <SocialIcon platform={s.platform} className="h-4 w-4" />
                </a>
              ))}
          </div>
        </div>

        <nav aria-label="Alt menü">
          <p className="eyebrow mb-4">Sayfalar</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            {nav.map((item) => (
              <li key={item.id}>
                <Link href={safeHref(item.href)} className="text-muted transition hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="eyebrow mb-4">İletişim</p>
          <ul className="space-y-3 text-sm text-muted">
            {contact.email ? (
              <li>
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 transition hover:text-fg">
                  <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {contact.email}
                </a>
              </li>
            ) : null}
            {contact.phone ? (
              <li>
                <a
                  href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}
                  className="flex items-center gap-2.5 transition hover:text-fg"
                >
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {contact.phone}
                </a>
              </li>
            ) : null}
            {contact.address ? (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{contact.address}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-wide flex flex-col gap-3 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{general.footer.copyright.replace("{year}", String(year))}</p>
          <LegalLinks
            className="flex flex-wrap gap-x-6 gap-y-2"
            documents={legal}
            labels={{ privacy: general.footer.privacyLabel, kvkk: general.footer.kvkkLabel }}
          />
        </div>
      </div>
    </footer>
  );
}
