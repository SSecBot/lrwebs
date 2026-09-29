"use client";

import { ArrowRight, Check, Minus, Plus, RotateCcw, Timer } from "lucide-react";
import { useState } from "react";
import { ButtonLink, SmartLink } from "@/components/ui/primitives";
import { currencyCode, trackEvent } from "@/lib/analytics";
import { computeEstimate, withQuote, type QuoteSelection } from "@/lib/pricing";
import { cn, formatPrice } from "@/lib/utils";
import type { PricingSettings } from "@/types/cms";

export function PricingBuilder({ pricing }: { pricing: PricingSettings }) {
  const packages = pricing.packages.filter((p) => p.visible);
  const addons = pricing.addons.filter((a) => a.visible);
  const defaultPackage = packages.find((p) => p.highlighted)?.id ?? packages[0]?.id ?? "";

  const [packageId, setPackageId] = useState(defaultPackage);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [extraPages, setExtraPages] = useState(0);
  const [rush, setRush] = useState(false);

  const selected = packages.find((p) => p.id === packageId) ?? packages[0];

  const selection: QuoteSelection = {
    packageId: selected?.id ?? "",
    addonIds: addons.filter((a) => selectedAddons.has(a.id)).map((a) => a.id),
    extraPages,
    rush,
  };
  const estimate = computeEstimate(pricing, selection) ?? { min: 0, max: 0, lines: [] };

  // Seçimler, "teklif iste" bağlantısıyla iletişim formuna taşınır ve mesaja eklenir.
  const quoteHref = withQuote(pricing.summaryCtaHref, selection);
  const onQuoteRequest = () =>
    trackEvent("pricing_quote_request", {
      package: selected?.name,
      addons: selection.addonIds.length,
      value: estimate.min,
      currency: currencyCode(pricing.currency),
    });

  const toggleAddon = (id: string) =>
    setSelectedAddons((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const reset = () => {
    setPackageId(defaultPackage);
    setSelectedAddons(new Set());
    setExtraPages(0);
    setRush(false);
  };

  if (!selected) {
    return <p className="container-wide card p-10 text-center text-sm text-muted">Şu anda yayında bir paket bulunmuyor.</p>;
  }

  return (
    <section className="container-wide pb-10">
      {/* Adım 1: Paket seçimi */}
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-xs text-primary">01</span>
        <h2 className="font-display text-lg font-normal text-fg">Temel paketi seçin</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Temel paket">
        {packages.map((pkg) => {
          const active = pkg.id === selected.id;
          return (
            <div
              key={pkg.id}
              className={cn(
                "card relative flex flex-col transition duration-200",
                active ? "border-primary bg-surface" : "hover:border-primary/40",
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPackageId(pkg.id)}
                className="flex flex-1 flex-col rounded-2xl p-6 text-left sm:p-7"
              >
                {pkg.highlighted ? (
                  <span className="absolute top-5 right-5 rounded-md bg-warm/10 px-2 py-0.5 text-[10px] tracking-wider text-warm uppercase">
                    Önerilen
                  </span>
                ) : null}
                <span
                  className={cn(
                    "mb-5 flex h-5 w-5 items-center justify-center rounded-full border transition",
                    active ? "border-primary bg-primary" : "border-muted/50",
                  )}
                  aria-hidden="true"
                >
                  {active ? <Check className="h-3 w-3 text-deep" /> : null}
                </span>
                <h3 className="font-display text-xl font-normal text-fg">{pkg.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{pkg.description}</p>
                <p className="mt-5 text-lg font-semibold text-fg">
                  {formatPrice(pkg.priceMin, pricing.currency)}
                  <span className="text-muted"> – </span>
                  {formatPrice(pkg.priceMax, pricing.currency)}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <Timer className="h-3.5 w-3.5 text-warm" aria-hidden="true" />
                  {pkg.timeline}
                </p>
                <ul className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-fg/90">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
              {pkg.ctaLabel ? (
                <div className="border-t border-line px-6 py-4 sm:px-7">
                  <SmartLink
                    href={withQuote(pkg.ctaHref, { packageId: pkg.id })}
                    onClick={() => trackEvent("pricing_package_select", { package: pkg.name })}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition hover:text-fg"
                  >
                    {pkg.ctaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </SmartLink>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px]">
        <div className="space-y-12">
          {/* Adım 2: Modüller */}
          {addons.length ? (
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-xs text-primary">
                  02
                </span>
                <h2 className="font-display text-lg font-normal text-fg">Ek modülleri işaretleyin</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {addons.map((addon) => {
                  const on = selectedAddons.has(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className={cn(
                        "card flex cursor-pointer items-start gap-4 p-4 transition sm:p-5",
                        on ? "border-primary/70 bg-surface" : "hover:border-primary/40",
                      )}
                    >
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleAddon(addon.id)} />
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                          on ? "border-primary bg-primary" : "border-muted/50",
                        )}
                        aria-hidden="true"
                      >
                        {on ? <Check className="h-3.5 w-3.5 text-deep" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-fg">{addon.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted">{addon.description}</span>
                        <span className="mt-2 block text-xs text-primary">
                          +{formatPrice(addon.priceMin, pricing.currency)} – {formatPrice(addon.priceMax, pricing.currency)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Adım 3: Kapsam ayarları */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line text-xs text-primary">
                03
              </span>
              <h2 className="font-display text-lg font-normal text-fg">Kapsamı ince ayarlayın</h2>
            </div>
            <div className="card space-y-6 p-5 sm:p-6">
              {pricing.maxExtraPages > 0 ? (
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="extra-pages" className="text-sm font-medium text-fg">
                      {pricing.extraPageLabel}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExtraPages((n) => Math.max(0, n - 1))}
                        className="rounded-lg border border-line p-1.5 text-muted transition hover:text-fg"
                        aria-label="Azalt"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm text-fg">{extraPages}</span>
                      <button
                        type="button"
                        onClick={() => setExtraPages((n) => Math.min(pricing.maxExtraPages, n + 1))}
                        className="rounded-lg border border-line p-1.5 text-muted transition hover:text-fg"
                        aria-label="Artır"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    id="extra-pages"
                    type="range"
                    min={0}
                    max={pricing.maxExtraPages}
                    value={extraPages}
                    onChange={(e) => setExtraPages(Number(e.target.value))}
                    className="mt-4 w-full accent-[#06b6d4]"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Sayfa başına yaklaşık {formatPrice(pricing.extraPagePrice, pricing.currency)}
                  </p>
                </div>
              ) : null}

              <label className="flex cursor-pointer items-center justify-between gap-4 border-t border-line pt-5">
                <span>
                  <span className="block text-sm font-medium text-fg">{pricing.rushLabel}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Takvim önceliği tahmini bütçeyi ×{pricing.rushMultiplier.toLocaleString("tr-TR")} oranında etkiler.
                  </span>
                </span>
                <input type="checkbox" className="peer sr-only" checked={rush} onChange={(e) => setRush(e.target.checked)} />
                <span
                  className="relative h-6 w-11 shrink-0 rounded-full border border-line bg-deep transition peer-checked:border-primary peer-checked:bg-primary/20 peer-focus-visible:outline-2 peer-focus-visible:outline-primary after:absolute after:top-0.5 after:left-0.5 after:h-4.5 after:w-4.5 after:rounded-full after:bg-muted after:transition peer-checked:after:translate-x-5 peer-checked:after:bg-primary"
                  aria-hidden="true"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Özet */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="border-b border-line p-5 sm:p-6">
              <p className="eyebrow">{pricing.builderTitle}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{pricing.builderDescription}</p>
            </div>
            <ul className="space-y-2.5 p-5 text-sm sm:p-6">
              {estimate.lines.map((line) => (
                <li key={line.label} className="flex items-start justify-between gap-4">
                  <span className="text-muted">{line.label}</span>
                  <span className="shrink-0 text-right text-xs text-fg">
                    {formatPrice(line.min, pricing.currency)} – {formatPrice(line.max, pricing.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line bg-deep/60 p-5 sm:p-6">
              <p className="text-xs text-muted">Tahmini bütçe aralığı</p>
              <p className="mt-1 text-2xl font-semibold text-fg sm:text-3xl" aria-live="polite">
                {formatPrice(estimate.min, pricing.currency)}
                <span className="text-muted"> – </span>
                <span className="text-primary">{formatPrice(estimate.max, pricing.currency)}</span>
              </p>
              <p className="mt-1 text-xs text-muted">Tahmini süre: {selected.timeline}</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                <ButtonLink href={quoteHref} arrow className="flex-1" onClick={onQuoteRequest}>
                  {pricing.summaryCtaLabel}
                </ButtonLink>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-sm text-muted transition hover:text-fg"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Sıfırla
                </button>
              </div>
              {pricing.note ? <p className="mt-4 text-[11px] leading-5 text-muted">{pricing.note}</p> : null}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
