"use client";

import { ArrowUpRight, Calendar, Building2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { RichText } from "@/components/rich-text";
import { Modal } from "@/components/ui/modal";
import { CoverImage, SmartLink, Tag } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/cms";

const ALL = "Tümü";

export function PortfolioExplorer({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(ALL);
  const [tag, setTag] = useState<string | null>(null);

  const activeSlug = searchParams.get("proje");
  const active = projects.find((p) => p.slug === activeSlug) ?? null;

  const categories = useMemo(() => [ALL, ...Array.from(new Set(projects.map((p) => p.category)))], [projects]);
  const tags = useMemo(
    () => Array.from(new Set(projects.flatMap((p) => p.tags))).sort((a, b) => a.localeCompare(b, "tr")),
    [projects],
  );

  const filtered = projects.filter((p) => (category === ALL || p.category === category) && (!tag || p.tags.includes(tag)));

  const setProject = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("proje", slug);
    else params.delete("proje");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <section className="container-wide pb-10">
      <div className="mb-8 space-y-4">
        <div
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
          role="tablist"
          aria-label="Kategori filtresi"
        >
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "shrink-0 rounded-lg border px-3.5 py-1.5 text-sm transition",
                category === c
                  ? "border-primary bg-primary/10 text-fg"
                  : "border-line text-muted hover:border-primary/50 hover:text-fg",
              )}
            >
              {c}
              <span className="ml-2 text-[11px] text-muted">
                {c === ALL ? projects.length : projects.filter((p) => p.category === c).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] tracking-wider text-muted uppercase">Etiket:</span>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag((cur) => (cur === t ? null : t))}
              aria-pressed={tag === t}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] transition",
                tag === t ? "border-warm bg-warm/10 text-warm" : "border-line text-muted hover:text-fg",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="card p-10 text-center text-sm text-muted">Seçili filtrelerle eşleşen bir proje bulunamadı.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          {filtered.map((project) => (
            <article key={project.id} className="card card-hover group flex flex-col overflow-hidden">
              <button
                type="button"
                onClick={() => setProject(project.slug)}
                className="text-left"
                aria-label={`${project.title} detaylarını aç`}
              >
                <div className="aspect-[16/10] overflow-hidden border-b border-line">
                  <CoverImage
                    src={project.coverImage}
                    alt={project.title}
                    label={project.title.slice(0, 2)}
                    className="transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              </button>
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="text-primary">{project.category}</span>
                  <span>{project.year}</span>
                </div>
                <h2 className="mt-2 font-display text-lg font-normal text-fg">{project.title}</h2>
                <p className="mt-1 text-xs text-muted">{project.client}</p>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted">{project.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {project.tags.map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
                  <button type="button" onClick={() => setProject(project.slug)} className="text-muted transition hover:text-fg">
                    Vaka detayı
                  </button>
                  {project.liveUrl ? (
                    <SmartLink
                      href={project.liveUrl}
                      className="inline-flex items-center gap-1 text-primary transition hover:text-fg"
                    >
                      Canlı önizleme
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </SmartLink>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(active)}
        onClose={() => setProject(null)}
        title={active?.title ?? ""}
        subtitle={active?.category}
        size="xl"
        footer={
          active?.liveUrl ? (
            <SmartLink
              href={active.liveUrl}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:text-fg"
            >
              Canlı projeyi görüntüle
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </SmartLink>
          ) : undefined
        }
      >
        {active ? (
          <div className="space-y-6">
            <div className="aspect-[16/8] overflow-hidden rounded-xl border border-line">
              <CoverImage src={active.coverImage} alt={active.title} label={active.title.slice(0, 2)} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
                {active.client}
              </span>
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                {active.year}
              </span>
            </div>
            <p className="text-base leading-7 text-fg/90">{active.summary}</p>
            <RichText content={active.content} />
            <div className="flex flex-wrap gap-1.5 border-t border-line pt-5">
              {active.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
