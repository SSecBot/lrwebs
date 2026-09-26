"use client";

import { ArrowRight, Clock, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RichText } from "@/components/rich-text";
import { Modal } from "@/components/ui/modal";
import { ButtonLink, Tag } from "@/components/ui/primitives";
import { CmsIcon } from "@/lib/icons";
import { extractHeadings } from "@/lib/markdown";
import { readingTime } from "@/lib/utils";
import type { Service } from "@/types/cms";

export function ServicesExplorer({ services }: { services: Service[] }) {
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Ana sayfadaki /services#slug bağlantıları ilgili hizmetin detayını açar.
  useEffect(() => {
    const sync = () => {
      const slug = decodeURIComponent(window.location.hash.slice(1));
      setActiveSlug(services.some((s) => s.slug === slug) ? slug : null);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [services]);

  const open = (slug: string) => {
    history.replaceState(null, "", `#${slug}`);
    setActiveSlug(slug);
  };
  const close = () => {
    history.replaceState(null, "", window.location.pathname);
    setActiveSlug(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return services;
    return services.filter((s) =>
      [s.title, s.summary, s.content, ...s.features].some((f) => f.toLocaleLowerCase("tr-TR").includes(q)),
    );
  }, [services, query]);

  const active = services.find((s) => s.slug === activeSlug) ?? null;
  const headings = active ? extractHeadings(active.content) : [];

  return (
    <section className="container-wide pb-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-sm">
          <span className="sr-only">Hizmetlerde ara</span>
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            className="input pl-10"
            placeholder="Hizmetlerde ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <p className="font-mono text-xs text-muted">{filtered.length} hizmet listeleniyor</p>
      </div>

      {filtered.length === 0 ? (
        <p className="card p-10 text-center text-sm text-muted">Aramanızla eşleşen bir hizmet bulunamadı.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((service, i) => (
            <article key={service.id} id={service.slug} className="card card-hover flex scroll-mt-28 flex-col p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-xl border border-line bg-deep p-3">
                  <CmsIcon name={service.icon} className="h-6 w-6 text-primary" />
                </span>
                <span className="font-mono text-xs text-muted/70">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h2 className="mt-6 font-mono text-xl font-bold text-fg">{service.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-7 text-muted">{service.summary}</p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {service.features.map((f) => (
                  <Tag key={f}>{f}</Tag>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <Clock className="h-3.5 w-3.5 text-warm" aria-hidden="true" />
                  Tahmini süre: {service.duration}
                </span>
                <button
                  type="button"
                  onClick={() => open(service.slug)}
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:text-fg"
                >
                  Detaylar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(active)}
        onClose={close}
        title={active?.title ?? ""}
        subtitle={active ? `Tahmini süre: ${active.duration} · ${readingTime(active.content)} dk okuma` : undefined}
        size="xl"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted">Bu hizmetle ilgili kapsamı birlikte netleştirelim.</p>
            <ButtonLink href="/contact" arrow>
              Teklif isteyin
            </ButtonLink>
          </div>
        }
      >
        {active ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
            <RichText content={active.content} />
            <aside className="order-first space-y-6 lg:order-last">
              {headings.length ? (
                <nav aria-label="Bölümler">
                  <p className="eyebrow mb-3">Bölümler</p>
                  <ul className="space-y-2 text-sm">
                    {headings.map((h) => (
                      <li key={h.id}>
                        <a
                          href={`#${h.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="text-muted transition hover:text-fg"
                        >
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}
              <div>
                <p className="eyebrow mb-3">Kapsam</p>
                <div className="flex flex-wrap gap-1.5">
                  {active.features.map((f) => (
                    <Tag key={f}>{f}</Tag>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
