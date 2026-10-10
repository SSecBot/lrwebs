import type { Metadata } from "next";
import { RichText } from "@/components/rich-text";
import { ButtonLink, PageHeader } from "@/components/ui/primitives";
import { getCms } from "@/lib/cms";
import { CmsIcon } from "@/lib/icons";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getCms();
  return pageMetadata(pages.about, "/about");
}

export default async function AboutPage() {
  const cms = await getCms();
  const { about, stats } = cms;
  const copy = cms.pages.about;

  return (
    <>
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      {/* Hikâye */}
      <section className="container-wide" aria-labelledby="story-title">
        <div className="card grid gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_1.6fr] lg:p-14">
          <div className="space-y-8">
            <h2 id="story-title" className="font-display text-2xl text-fg sm:text-3xl">
              {about.storyTitle}
            </h2>
            <p className="text-base leading-8 text-fg/90">{about.summary}</p>
            <div className="grid grid-cols-2 gap-3">
              {stats.items.map((item, i) => (
                <div key={item.id} className="rounded-xl border border-line bg-deep/60 p-4">
                  <p className="text-3xl font-semibold text-fg">
                    {item.value}
                    <span className={i === 0 ? "text-primary" : "text-warm"}>{item.suffix}</span>
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <RichText content={about.story} />
        </div>
      </section>

      {/* Değerler */}
      <section className="container-wide py-20" aria-labelledby="values-title">
        <h2 id="values-title" className="font-display text-2xl text-fg sm:text-3xl">
          {about.valuesTitle}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {about.values.map((value) => (
            <article key={value.id} className="card p-6">
              <CmsIcon name={value.icon} className="h-5 w-5 text-primary" />
              <h3 className="mt-5 font-display text-base text-fg">{value.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{value.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Teknoloji yığını */}
      <section className="container-wide" aria-labelledby="stack-title">
        <h2 id="stack-title" className="font-display text-2xl text-fg sm:text-3xl">
          {about.stackTitle}
        </h2>
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
          {about.techStack.map((group) => (
            <div key={group.id} className="bg-deep p-6">
              <p className="mb-4 text-xs font-medium text-muted">{group.category}</p>
              <ul className="space-y-2.5">
                {group.items.map((item) => (
                  <li key={item} className="text-sm text-fg">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Süreç */}
      <section className="container-wide py-20" aria-labelledby="process-title">
        <h2 id="process-title" className="font-display text-2xl text-fg sm:text-3xl">
          {about.processTitle}
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {about.process.map((step, i) => (
            <li key={step.id} className="card relative p-6">
              <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-display text-base text-fg">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
              {i < about.process.length - 1 ? (
                <span className="absolute top-1/2 -right-3 hidden h-px w-6 bg-line xl:block" aria-hidden="true" />
              ) : null}
            </li>
          ))}
        </ol>
        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/contact" arrow>
            Projenizi konuşalım
          </ButtonLink>
          <ButtonLink href="/portfolio" variant="secondary">
            Çalışmalarımızı inceleyin
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
