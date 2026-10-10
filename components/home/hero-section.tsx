import { BlurHeadline } from "@/components/home/blur-headline";
import { DeviceShowcase } from "@/components/home/device-showcase";
import { ButtonLink } from "@/components/ui/primitives";
import type { HeroSettings } from "@/types/cms";

export function HeroSection({ hero }: { hero: HeroSettings }) {
  return (
    <section className="container-wide relative grid min-h-[100svh] items-center gap-12 pt-28 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10 lg:pt-24 xl:gap-16">
      <div className="max-w-2xl">
        {hero.eyebrow ? <p className="eyebrow mb-7">{hero.eyebrow}</p> : null}

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
          <ul className="meta-list mt-10 border-t border-line pt-5" aria-label="Kullandığımız teknolojiler">
            {hero.badges.map((badge) => (
              <li key={badge}>{badge}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <DeviceShowcase devices={hero.devices} />
    </section>
  );
}
