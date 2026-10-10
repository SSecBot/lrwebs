import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock } from "lucide-react";
import { ButtonLink, CoverImage, SectionHeading, SmartLink } from "@/components/ui/primitives";
import { CmsIcon } from "@/lib/icons";
import { formatDate, readingTime, safeHref } from "@/lib/utils";
import type { AboutSettings, BlogPost, Project, SectionCopy, Service, StatsSettings } from "@/types/cms";

function SectionLink({ copy }: { copy: SectionCopy }) {
  if (!copy.linkLabel || !copy.linkHref) return null;
  return (
    <ButtonLink href={copy.linkHref} variant="secondary" arrow>
      {copy.linkLabel}
    </ButtonLink>
  );
}

/* ---------- İstatistikler ---------- */

export function StatsSection({ stats }: { stats: StatsSettings }) {
  return (
    <section className="container-wide py-16 sm:py-20" aria-labelledby="stats-title">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {stats.eyebrow ? <p className="eyebrow mb-2">{stats.eyebrow}</p> : null}
          <h2 id="stats-title" className="font-display text-xl text-fg sm:text-2xl">
            {stats.title}
          </h2>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        {stats.items.map((item) => (
          <article key={item.id} className="card group relative overflow-hidden p-6 sm:p-8 lg:p-10">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-5xl font-semibold tracking-tight text-fg tabular-nums sm:text-6xl lg:text-7xl">
                  {item.value}
                  <span className="text-primary">{item.suffix}</span>
                </p>
                <h3 className="mt-4 text-lg font-semibold text-fg">{item.label}</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted">{item.description}</p>
              </div>
              <CmsIcon name={item.icon} className="mt-2 h-6 w-6 shrink-0 text-muted/70" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Hizmetler ---------- */

export function ServicesPreview({ copy, services }: { copy: SectionCopy; services: Service[] }) {
  return (
    <section className="container-wide py-16 sm:py-24" aria-labelledby="services-title">
      <SectionHeading
        id="services-title"
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        action={<SectionLink copy={copy} />}
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {services.map((service) => (
          <Link key={service.id} href={`/services#${service.slug}`} className="card card-hover group flex flex-col p-6 lg:p-7">
            <CmsIcon name={service.icon} className="h-5 w-5 text-primary" />
            <h3 className="mt-5 font-display text-lg text-fg">{service.title}</h3>
            <p className="mt-3 flex-1 text-sm leading-6 text-muted">{service.summary}</p>
            <p className="meta-list mt-5">
              {service.features.slice(0, 3).map((f) => (
                <span key={f}>{f}</span>
              ))}
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm text-fg/80 transition-colors group-hover:text-primary">
              Detayları incele
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------- Hakkımızda özeti ---------- */

export function AboutSummary({ copy, about }: { copy: SectionCopy; about: AboutSettings }) {
  return (
    <section className="container-wide py-16 sm:py-24" aria-labelledby="about-summary-title">
      <div className="card grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.3fr] lg:p-14">
        <div>
          {copy.eyebrow ? <p className="eyebrow mb-3">{copy.eyebrow}</p> : null}
          <h2 id="about-summary-title" className="font-display text-2xl leading-snug text-fg sm:text-3xl lg:text-4xl">
            {copy.title}
          </h2>
          {copy.description ? <p className="mt-4 text-sm leading-7 text-muted">{copy.description}</p> : null}
        </div>
        <div className="flex flex-col justify-between gap-8">
          <p className="text-base leading-8 text-fg/90 sm:text-lg">{about.summary}</p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            {about.values.slice(0, 3).map((v) => (
              <div key={v.id} className="flex items-center gap-2 text-sm text-muted">
                <CmsIcon name={v.icon} className="h-4 w-4 text-warm" />
                {v.title}
              </div>
            ))}
          </div>
          {copy.linkLabel ? (
            <Link
              href={safeHref(copy.linkHref)}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:text-fg"
            >
              {copy.linkLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ---------- Proje karuseli ---------- */

function ProjectCard({ project, hidden = false }: { project: Project; hidden?: boolean }) {
  return (
    <article
      className="card group flex w-[82vw] max-w-[420px] shrink-0 flex-col overflow-hidden sm:w-[380px] lg:w-[420px]"
      aria-hidden={hidden || undefined}
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line">
        <CoverImage
          src={project.coverImage}
          alt={project.title}
          label={project.title.slice(0, 2)}
          className="transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute top-3 left-3 rounded bg-deep/90 px-2 py-0.5 text-[11px] text-fg">{project.category}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3 text-xs text-muted">
          <span>{project.client}</span>
          <span>{project.year}</span>
        </div>
        <h3 className="mt-2 font-display text-base text-fg">{project.title}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted">{project.summary}</p>
        <p className="meta-list mt-4">
          {project.tags.slice(0, 3).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
          <Link
            href={`/portfolio?proje=${project.slug}`}
            tabIndex={hidden ? -1 : undefined}
            className="text-muted transition hover:text-fg"
          >
            Detaylar
          </Link>
          {project.liveUrl ? (
            <SmartLink
              href={project.liveUrl}
              tabIndex={hidden ? -1 : undefined}
              className="inline-flex items-center gap-1 text-primary transition hover:text-fg"
            >
              Canlı önizleme
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </SmartLink>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ProjectsCarousel({ copy, projects }: { copy: SectionCopy; projects: Project[] }) {
  if (projects.length === 0) return null;
  const duration = `${Math.max(30, projects.length * 9)}s`;
  return (
    <section className="py-16 sm:py-24" aria-labelledby="projects-title">
      <div className="container-wide">
        <SectionHeading
          id="projects-title"
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          action={<SectionLink copy={copy} />}
        />
      </div>
      <div
        className="group relative mt-10 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]"
        style={{ ["--marquee-duration" as string]: duration }}
      >
        <div className="flex w-max animate-marquee gap-4 px-2 group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused] motion-reduce:animate-none sm:gap-6">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
          {projects.map((p) => (
            <ProjectCard key={`${p.id}-clone`} project={p} hidden />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Blog ---------- */

export function BlogCard({ post, priority = false }: { post: BlogPost; priority?: boolean }) {
  return (
    <Link href={`/blog/${post.slug}`} className="card card-hover group flex flex-col overflow-hidden">
      <div className="aspect-[16/9] overflow-hidden border-b border-line">
        <CoverImage
          src={post.coverImage}
          alt={post.title}
          label={post.category}
          className="transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="text-primary">{post.category}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {readingTime(post.content)} dk
          </span>
        </div>
        <h3 className={priority ? "mt-3 font-display text-xl text-fg" : "mt-3 font-display text-base text-fg sm:text-lg"}>
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-muted">{post.excerpt}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-fg/80 transition-colors group-hover:text-primary">
          Yazıyı oku
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

export function BlogGrid({ copy, posts }: { copy: SectionCopy; posts: BlogPost[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="container-wide py-16 sm:py-24" aria-labelledby="blog-title">
      <SectionHeading
        id="blog-title"
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        action={<SectionLink copy={copy} />}
      />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
