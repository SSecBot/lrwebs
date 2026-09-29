import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { ContactSettings } from "@/types/cms";

export function ContactChannels({ contact }: { contact: ContactSettings }) {
  const items = [
    contact.email && { icon: Mail, label: "E-posta", value: contact.email, href: `mailto:${contact.email}` },
    contact.phone && { icon: Phone, label: "Telefon", value: contact.phone, href: `tel:${contact.phone.replace(/[^\d+]/g, "")}` },
    contact.address && { icon: MapPin, label: "Adres", value: contact.address, href: "" },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href: string }[];

  return (
    <ul className="space-y-3">
      {items.map(({ icon: Icon, label, value, href }) => (
        <li key={label} className="flex items-start gap-4 rounded-xl border border-line bg-deep/50 p-4">
          <span className="rounded-lg border border-line bg-surface p-2">
            <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] tracking-wider text-muted uppercase">{label}</p>
            {href ? (
              <a href={href} className="mt-0.5 block break-words text-sm text-fg transition hover:text-primary">
                {value}
              </a>
            ) : (
              <p className="mt-0.5 text-sm text-fg">{value}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BusinessHours({ contact }: { contact: ContactSettings }) {
  if (contact.businessHours.length === 0) return null;
  return (
    <div className="rounded-xl border border-line bg-deep/50 p-4">
      <p className="mb-3 flex items-center gap-2 text-[11px] tracking-wider text-muted uppercase">
        <Clock className="h-3.5 w-3.5 text-warm" aria-hidden="true" />
        Çalışma Saatleri
      </p>
      <dl className="space-y-2 text-sm">
        {contact.businessHours.map((h) => (
          <div
            key={h.id}
            className="flex items-center justify-between gap-4 border-b border-line/60 pb-2 last:border-0 last:pb-0"
          >
            <dt className="text-muted">{h.day}</dt>
            <dd className="text-right text-xs text-fg">{h.hours}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
