"use client";

import { ArrowRight, Check, LoaderCircle, Minus, Plus, RotateCcw, Tag, Timer, X } from "lucide-react";
import { useState, useTransition } from "react";
import { checkCoupon } from "@/app/actions/pricing";
import { ButtonLink, SmartLink } from "@/components/ui/primitives";
import { currencyCode, trackEvent } from "@/lib/analytics";
import {
  computeEstimate,
  discountLabel,
  discountStatus,
  formatDay,
  formatDiscountAmount,
  packageOffer,
  withQuote,
  type CouponInfo,
  type QuoteSelection,
} from "@/lib/pricing";
import { useToday } from "@/lib/use-today";
import { cn, formatPrice } from "@/lib/utils";
import type { PricingSettings } from "@/types/cms";

export function PricingBuilder({ pricing, today: serverToday }: { pricing: PricingSettings; today: string }) {
  const today = useToday(serverToday);
  const packages = pricing.packages.filter((p) => p.visible);
  const addons = pricing.addons.filter((a) => a.visible);
  const defaultPackage = packages.find((p) => p.highlighted)?.id ?? packages[0]?.id ?? "";

  const [packageId, setPackageId] = useState(defaultPackage);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [extraPages, setExtraPages] = useState(0);
  const [rush, setRush] = useState(false);

  // Kupon: kod sunucuda doğrulanır; sayfa kaynağında hiçbir kupon kodu bulunmaz.
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponInfo | null>(null);
  const [couponError, setCouponError] = useState("");
  const [checking, startCheck] = useTransition();

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponInput.trim();
    if (!code) return;
    setCouponError("");
    startCheck(async () => {
      const result = await checkCoupon(code).catch(() => ({ ok: false as const, message: "Kod kontrol edilemedi." }));
      if (result.ok) {
        setCoupon(result.coupon);
        setCouponInput("");
        trackEvent("pricing_coupon_apply", { discount: result.coupon.discount.name });
      } else {
        setCoupon(null);
        setCouponError(result.message);
      }
    });
  };

  const campaigns = (pricing.discounts ?? []).filter((d) => !d.code && discountStatus(d, today) === "active");

  const selected = packages.find((p) => p.id === packageId) ?? packages[0];

  const selection: QuoteSelection = {
    packageId: selected?.id ?? "",
    addonIds: addons.filter((a) => selectedAddons.has(a.id)).map((a) => a.id),
    extraPages,
    rush,
    ...(coupon ? { coupon: coupon.code } : {}),
  };
  const estimate = computeEstimate(pricing, selection, { today, coupon }) ?? {
    min: 0,
    max: 0,
    lines: [],
    discount: null,
    originalMin: 0,
    originalMax: 0,
  };
  const discount = estimate.discount;
  // Kupon girildi ama seçili pakette geçerli değil ya da daha avantajlı bir kampanya uygulandı.
  const couponNote =
    coupon && discount?.code !== coupon.code
      ? coupon.discount.packageIds.length && !coupon.discount.packageIds.includes(selected?.id ?? "")
        ? "Bu kod seçtiğiniz pakette geçerli değil."
        : "Daha avantajlı olan kampanya indirimi uygulandı."
      : "";

  // Seçimler, "teklif iste" bağlantısıyla iletişim formuna taşınır ve mesaja eklenir.
  const quoteHref = withQuote(pricing.summaryCtaHref, selection);
  const onQuoteRequest = () =>
    trackEvent("pricing_quote_request", {
      package: selected?.name,
      addons: selection.addonIds.length,
      value: estimate.min,
      currency: currencyCode(pricing.currency),
      discount: discount?.name,
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
    setCoupon(null);
    setCouponError("");
  };

  if (!selected) {
    return <p className="container-wide card p-10 text-center text-sm text-muted">Şu anda yayında bir paket bulunmuyor.</p>;
  }

  return (
    <section className="container-wide pb-10">
      {campaigns.length ? (
        <div className="mb-8 space-y-2" aria-label="Aktif kampanyalar">
          {campaigns.map((d) => (
            <p
              key={d.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warm/40 bg-warm/10 px-4 py-3 text-sm text-fg"
            >
              <Tag className="h-4 w-4 shrink-0 text-warm" aria-hidden="true" />
              <span className="font-semibold">{d.name}</span>
              <span className="text-fg/90">
                {discountLabel(d, pricing.currency)} indirim
                {d.appliesTo === "package" ? " (paket fiyatında)" : ""}
                {d.packageIds.length
                  ? ` · ${packages
                      .filter((p) => d.packageIds.includes(p.id))
                      .map((p) => p.name)
                      .join(", ")}`
                  : ""}
              </span>
              {d.endsAt ? <span className="text-xs text-muted">{formatDay(d.endsAt)} tarihine kadar</span> : null}
            </p>
          ))}
        </div>
      ) : null}

      {/* Adım 1: Paket seçimi */}
      <div className="mb-4 flex items-center gap-3">
        <span className="font-mono text-xs text-primary">01</span>
        <h2 className="font-display text-lg text-fg">Temel paketi seçin</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Temel paket">
        {packages.map((pkg) => {
          const active = pkg.id === selected.id;
          const offer = packageOffer(pricing, pkg, today);
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
                className="flex flex-1 flex-col rounded-xl p-6 text-left sm:p-7"
              >
                {pkg.highlighted || offer ? (
                  <span className="absolute top-5 right-5 flex flex-col items-end gap-1">
                    {offer ? (
                      <span className="rounded bg-warm px-2 py-0.5 text-[11px] font-semibold text-deep">
                        {offer.discount.label} indirim
                      </span>
                    ) : null}
                    {pkg.highlighted ? (
                      <span className="rounded bg-warm/10 px-2 py-0.5 text-[11px] font-medium text-warm">Önerilen</span>
                    ) : null}
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
                <h3 className="font-display text-xl text-fg">{pkg.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{pkg.description}</p>
                {offer ? (
                  <p className="mt-5 text-sm text-muted line-through decoration-muted/70">
                    <span className="sr-only">İndirimsiz fiyat: </span>
                    {formatPrice(pkg.priceMin, pricing.currency)} – {formatPrice(pkg.priceMax, pricing.currency)}
                  </p>
                ) : null}
                <p className={cn("text-lg font-semibold text-fg", offer ? "mt-0.5" : "mt-5")}>
                  {offer ? <span className="sr-only">İndirimli fiyat: </span> : null}
                  {formatPrice(offer?.min ?? pkg.priceMin, pricing.currency)}
                  <span className="text-muted"> – </span>
                  {formatPrice(offer?.max ?? pkg.priceMax, pricing.currency)}
                </p>
                {offer ? (
                  <p className="mt-1 text-xs text-warm">
                    {offer.discount.name}
                    {offer.discount.endsAt ? ` · ${formatDay(offer.discount.endsAt)} tarihine kadar` : ""}
                  </p>
                ) : null}
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
                <span className="font-mono text-xs text-primary">02</span>
                <h2 className="font-display text-lg text-fg">Ek modülleri işaretleyin</h2>
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
              <span className="font-mono text-xs text-primary">03</span>
              <h2 className="font-display text-lg text-fg">Kapsamı ince ayarlayın</h2>
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
              {discount ? (
                <li className="flex items-start justify-between gap-4 text-warm">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {discount.name} ({discount.label})
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    {formatDiscountAmount(discount.min, discount.max, pricing.currency)}
                  </span>
                </li>
              ) : null}
            </ul>

            <div className="border-t border-line px-5 py-4 sm:px-6">
              {coupon ? (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-2 text-fg">
                    <Tag className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span className="font-mono">{coupon.code}</span>
                    <span className="text-muted">· {coupon.discount.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCoupon(null)}
                    className="rounded-md p-1 text-muted transition hover:text-fg"
                    aria-label="İndirim kodunu kaldır"
                    title="Kaldır"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={applyCoupon} className="flex gap-2">
                  <label htmlFor="coupon-code" className="sr-only">
                    İndirim kodu
                  </label>
                  <input
                    id="coupon-code"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponError("");
                    }}
                    placeholder="İndirim kodunuz var mı?"
                    maxLength={30}
                    autoComplete="off"
                    spellCheck={false}
                    className="input h-9 flex-1 font-mono text-xs uppercase placeholder:font-sans placeholder:normal-case"
                    aria-invalid={couponError ? true : undefined}
                    aria-describedby={couponError ? "coupon-error" : undefined}
                  />
                  <button
                    type="submit"
                    disabled={checking || couponInput.trim().length < 3}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-xs text-fg transition hover:border-primary/60 disabled:opacity-40"
                  >
                    {checking ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                    Uygula
                  </button>
                </form>
              )}
              {couponError ? (
                <p id="coupon-error" role="alert" className="mt-2 text-xs text-red-300">
                  {couponError}
                </p>
              ) : null}
              {couponNote ? <p className="mt-2 text-xs text-muted">{couponNote}</p> : null}
            </div>

            <div className="border-t border-line bg-deep/60 p-5 sm:p-6">
              <p className="text-xs text-muted">Tahmini bütçe aralığı</p>
              {discount ? (
                <p className="mt-1 text-sm text-muted line-through decoration-muted/70">
                  <span className="sr-only">İndirimsiz: </span>
                  {formatPrice(estimate.originalMin, pricing.currency)} – {formatPrice(estimate.originalMax, pricing.currency)}
                </p>
              ) : null}
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
