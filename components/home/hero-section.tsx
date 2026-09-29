import { BlurHeadline } from "@/components/home/blur-headline";
import { DeviceShowcase } from "@/components/home/device-showcase";
import { ButtonLink } from "@/components/ui/primitives";
import type { HeroSettings } from "@/types/cms";

export function HeroSection({ hero }: { hero: HeroSettings }) {
  return (
    <section className="container-wide relative grid min-h-[100svh] items-center gap-12 pt-28 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10 lg:pt-24 xl:gap-16">
      <div className="max-w-2xl">
        {hero.eyebrow ? (
          <p className="eyebrow mb-6 inline-flex items-center gap-2 rounded-2xl border border-line bg-surface/60 px-3 py-1.5 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-warm" aria-hidden="true" />
            {hero.eyebrow}
          </p>
        ) : null}

        <BlurHeadline headline={hero.headline} accent={hero.headlineAccent} blur={hero.blur} />

        <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">{hero.description}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={hero.primaryCta.href} arrow>
            {hero.primaryCta.label}
          </ButtonLink>
          <ButtonLink href={hero.secondaryCta.href} variant="secondary">
            {hero.secondaryCta.label}
          </ButtonLink>
        </div>

        {hero.badges.length ? (
          <ul className="mt-10 flex flex-wrap gap-2" aria-label="Kullandığımız teknolojiler">
            {hero.badges.map((badge) => (
              <li key={badge} className="rounded-md border border-line px-2.5 py-1 text-[11px] text-muted">
                {badge}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <DeviceShowcase devices={hero.devices} />
    </section>
  );
}
