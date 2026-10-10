import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, UserRound } from "lucide-react";
import { BlogCard } from "@/components/home/sections";
import { ReadingProgress } from "@/components/pages/reading-progress";
import { RichText } from "@/components/rich-text";
import { ButtonLink, CoverImage, Tag } from "@/components/ui/primitives";
import { getCms } from "@/lib/cms";
import { serializeJsonLd } from "@/lib/seo";
import { extractHeadings } from "@/lib/markdown";
import { formatDate, readingTime } from "@/lib/utils";

async function findPost(slug: string) {
  const cms = await getCms();
  const post = cms.blog.find((p) => p.slug === slug && p.visible);
  return { cms, post };
}

export async function generateStaticParams() {
  const cms = await getCms();
  return cms.blog.filter((p) => p.visible).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { post } = await findPost(slug);
  if (!post) return { title: "Yazı bulunamadı" };
  const path = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: post.author }],
    keywords: post.tags,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      locale: "tr_TR",
      url: path,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const { cms, post } = await findPost(slug);
  if (!post) notFound();

  const headings = extractHeadings(post.content);
  const related = cms.blog
    .filter((p) => p.visible && p.id !== post.id)
    .map((p) => ({ p, score: (p.category === post.category ? 2 : 0) + p.tags.filter((t) => post.tags.includes(t)).length }))
    .sort((a, b) => b.score - a.score || b.p.publishedAt.localeCompare(a.p.publishedAt))
    .slice(0, 3)
    .map(({ p }) => p);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: cms.general.brandName },
    mainEntityOfPage: `${cms.general.siteUrl}/blog/${post.slug}`,
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <ReadingProgress />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <article className="container-wide pt-28 sm:pt-36">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-fg">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Tüm yazılar
        </Link>

        <header className="mt-8 max-w-4xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="text-primary">{post.category}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {readingTime(post.content)} dk okuma
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl leading-snug text-fg sm:text-4xl lg:text-5xl">{post.title}</h1>
          <p className="mt-5 text-base leading-8 text-muted sm:text-lg">{post.excerpt}</p>
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-fg">
            <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
            {post.author}
          </p>
        </header>

        <div className="mt-10 aspect-[21/9] overflow-hidden rounded-xl border border-line">
          <CoverImage src={post.coverImage} alt={post.title} label={post.category} />
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <RichText content={post.content} className="max-w-3xl text-base leading-8" />
          <aside className="order-first lg:order-last">
            <div className="space-y-8 lg:sticky lg:top-28">
              {headings.length ? (
                <nav aria-label="İçindekiler" className="card p-5">
                  <p className="eyebrow mb-4">İçindekiler</p>
                  <ol className="space-y-2.5 text-sm">
                    {headings.map((h, i) => (
                      <li key={h.id} className={h.level === 3 ? "pl-4" : undefined}>
                        <a href={`#${h.id}`} className="flex gap-3 text-muted transition hover:text-fg">
                          <span className="text-xs text-primary/70">{String(i + 1).padStart(2, "0")}</span>
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <Tag key={t}>#{t}</Tag>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <div className="card mt-16 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="font-display text-lg text-fg">Benzer bir proje mi planlıyorsunuz?</p>
            <p className="mt-1 text-sm text-muted">Teknik gereksinimlerinizi birlikte değerlendirelim.</p>
          </div>
          <ButtonLink href="/contact" arrow>
            İletişime geçin
          </ButtonLink>
        </div>
      </article>

      {related.length ? (
        <section className="container-wide mt-20" aria-labelledby="related-title">
          <h2 id="related-title" className="font-display text-xl text-fg sm:text-2xl">
            İlgili yazılar
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
            {related.map((p) => (
              <BlogCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
