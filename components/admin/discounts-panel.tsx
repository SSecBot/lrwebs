"use client";

import { CalendarClock, CircleCheck, CircleOff, Clock, Info, Shuffle, Ticket, Zap } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Grid, NumberField, Panel, SelectField, SmallButton, TextField, Toggle } from "@/components/admin/fields";
import { ListEditor } from "@/components/admin/list-editor";
import { discountLabel, discountStatus, formatDay, packageOffer, todayKey, type DiscountStatus } from "@/lib/pricing";
import { cn, formatPrice, uid } from "@/lib/utils";
import type { PricingDiscount, PricingSettings } from "@/types/cms";

const STATUS: Record<DiscountStatus, { label: string; icon: typeof CircleCheck; className: string }> = {
  active: { label: "Yayında", icon: CircleCheck, className: "border-emerald-500/40 text-emerald-300" },
  scheduled: { label: "Planlandı", icon: CalendarClock, className: "border-primary/40 text-primary" },
  expired: { label: "Süresi doldu", icon: Clock, className: "border-line text-muted" },
  disabled: { label: "Kapalı", icon: CircleOff, className: "border-line text-muted" },
};

const noopSubscribe = () => () => {};

function StatusBadge({ status }: { status: DiscountStatus }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]", s.className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {s.label}
    </span>
  );
}

/** Karışması zor karakterlerden (0/O, 1/I hariç) rastgele kupon kodu. */
function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function describe(d: PricingDiscount, pricing: PricingSettings): string {
  const target = d.packageIds.length
    ? pricing.packages
        .filter((p) => d.packageIds.includes(p.id))
        .map((p) => p.name)
        .join(", ")
    : "tüm paketler";
  const scope = d.appliesTo === "package" ? "paket fiyatına" : "toplam tutara";
  const when =
    d.startsAt && d.endsAt
      ? `${formatDay(d.startsAt)} – ${formatDay(d.endsAt)}`
      : d.endsAt
        ? `${formatDay(d.endsAt)} tarihine kadar`
        : d.startsAt
          ? `${formatDay(d.startsAt)} tarihinden itibaren`
          : "süresiz";
  return `${discountLabel(d, pricing.currency)} · ${scope} · ${target} · ${when}`;
}

export function DiscountsPanel({
  pricing,
  onChange,
}: {
  pricing: PricingSettings;
  onChange: (discounts: PricingDiscount[]) => void;
}) {
  const today = useSyncExternalStore(
    noopSubscribe,
    () => todayKey(),
    () => todayKey(),
  );
  const visiblePackages = pricing.packages.filter((p) => p.visible);

  return (
    <Panel
      title="İndirimler"
      description="Kampanyalar herkese otomatik uygulanır ve sitede duyurulur; kupon kodlu indirimler yalnızca kodu giren ziyaretçiye uygulanır."
    >
      <ul className="space-y-1.5 rounded-xl border border-line bg-deep/60 px-4 py-3 text-xs leading-5 text-muted">
        <li className="flex items-start gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Aynı anda <span className="text-fg">tek bir indirim</span> uygulanır: ziyaretçi için en avantajlı olanı. İndirimler
            birbirinin üzerine eklenmez.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Öncelikli teslim çarpanı indirimli tutara uygulanır. Tarihler İstanbul saatine göredir; başlangıç ve bitiş günleri
            dahildir.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Kupon kodları sayfa kaynağında yer almaz, sunucuda doğrulanır ve deneme sayısı sınırlıdır. Gelen mesajlarda uygulanan
            indirim ve kod görünür.
          </span>
        </li>
      </ul>

      <ListEditor
        items={pricing.discounts}
        onChange={onChange}
        getKey={(d) => d.id}
        getTitle={(d) => `${d.code ? "Kupon" : "Kampanya"}: ${d.name}${d.code ? ` (${d.code})` : ""}`}
        getSubtitle={(d) => `${STATUS[discountStatus(d, today)].label} · ${describe(d, pricing)}`}
        isHidden={(d) => discountStatus(d, today) !== "active"}
        createItem={(): PricingDiscount => ({
          id: uid("dc"),
          name: "Yeni kampanya",
          enabled: false,
          type: "percent",
          value: 10,
          appliesTo: "total",
          packageIds: [],
          code: "",
          startsAt: "",
          endsAt: "",
        })}
        duplicateItem={(d) => ({ ...d, id: uid("dc"), name: `${d.name} (kopya)`, code: "", enabled: false })}
        addLabel="İndirim ekle"
        emptyLabel="Henüz indirim tanımlanmadı."
        maxItems={30}
        renderItem={(d, update) => {
          const status = discountStatus(d, today);
          const preview = visiblePackages.map((pkg) => ({
            pkg,
            // Bu indirimin tek başına paket fiyatına etkisi (durumu/kodu ne olursa olsun önizleme).
            offer: packageOffer(
              { ...pricing, discounts: [{ ...d, code: "", enabled: true, startsAt: "", endsAt: "" }] },
              pkg,
              today,
            ),
          }));
          return (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <span className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[11px] text-muted">
                  {d.code ? <Ticket className="h-3 w-3" aria-hidden="true" /> : <Zap className="h-3 w-3" aria-hidden="true" />}
                  {d.code ? "Kupon kodlu" : "Otomatik kampanya"}
                </span>
              </div>

              <Toggle
                label="Etkin"
                description="Kapalıyken hiçbir koşulda uygulanmaz."
                checked={d.enabled}
                onChange={(v) => update({ enabled: v })}
              />

              <Grid cols={3}>
                <TextField label="Ad" hint="sitede görünür" value={d.name} onChange={(v) => update({ name: v })} maxLength={60} />
                <SelectField
                  label="İndirim türü"
                  value={d.type}
                  onChange={(v) => update({ type: v, value: v === "percent" ? Math.min(d.value, 90) : d.value })}
                  options={[
                    { value: "percent", label: "Yüzde (%)" },
                    { value: "fixed", label: `Sabit tutar (${pricing.currency})` },
                  ]}
                />
                <NumberField
                  label="Değer"
                  value={d.value}
                  onChange={(v) => update({ value: v })}
                  min={0}
                  max={d.type === "percent" ? 90 : undefined}
                  step={d.type === "percent" ? 1 : 500}
                  suffix={d.type === "percent" ? "%" : pricing.currency}
                />
              </Grid>

              <Grid>
                <SelectField
                  label="Uygulandığı tutar"
                  value={d.appliesTo}
                  onChange={(v) => update({ appliesTo: v })}
                  options={[
                    { value: "total", label: "Toplam (paket + modüller + ek sayfalar)" },
                    { value: "package", label: "Yalnızca paket fiyatı" },
                  ]}
                />
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <label htmlFor={`${d.id}-code`} className="text-xs font-medium text-fg">
                      Kupon kodu
                      <span className="ml-2 font-normal text-muted">boş = herkese otomatik</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      id={`${d.id}-code`}
                      value={d.code}
                      onChange={(e) => update({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
                      maxLength={30}
                      placeholder="ör. YAZ2026"
                      autoComplete="off"
                      spellCheck={false}
                      className="input flex-1 font-mono text-sm"
                    />
                    <SmallButton onClick={() => update({ code: randomCode() })} title="Rastgele kod üret">
                      <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                      Üret
                    </SmallButton>
                  </div>
                </div>
              </Grid>

              <Grid>
                <TextField
                  label="Başlangıç"
                  hint="boş = hemen"
                  type="date"
                  value={d.startsAt}
                  onChange={(v) => update({ startsAt: v })}
                />
                <TextField
                  label="Bitiş"
                  hint="boş = süresiz, gün dahil"
                  type="date"
                  value={d.endsAt}
                  onChange={(v) => update({ endsAt: v })}
                />
              </Grid>

              <fieldset>
                <legend className="mb-1.5 text-xs font-medium text-fg">
                  Geçerli paketler
                  <span className="ml-2 font-normal text-muted">hiçbiri seçilmezse tüm paketler</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {pricing.packages.map((p) => {
                    const on = d.packageIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition",
                          on ? "border-primary bg-primary/10 text-fg" : "border-line text-muted hover:text-fg",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="accent-[#06b6d4]"
                          checked={on}
                          onChange={(e) =>
                            update({
                              packageIds: e.target.checked ? [...d.packageIds, p.id] : d.packageIds.filter((id) => id !== p.id),
                            })
                          }
                        />
                        {p.name}
                        {!p.visible ? <span className="text-muted/70">(gizli)</span> : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {preview.length ? (
                <div className="rounded-xl border border-line bg-deep/40 p-4">
                  <p className="mb-2 text-xs font-semibold text-fg">Paket fiyatlarına etkisi</p>
                  <ul className="space-y-1.5 text-xs">
                    {preview.map(({ pkg, offer }) => (
                      <li key={pkg.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                        <span className="text-muted">{pkg.name}</span>
                        {offer ? (
                          <span className="font-mono">
                            <span className="mr-2 text-muted line-through decoration-muted/70">
                              {formatPrice(pkg.priceMin, pricing.currency)} – {formatPrice(pkg.priceMax, pricing.currency)}
                            </span>
                            <span className="text-fg">
                              {formatPrice(offer.min, pricing.currency)} – {formatPrice(offer.max, pricing.currency)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted/70">uygulanmaz</span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {d.appliesTo === "total" ? (
                    <p className="mt-2 text-[11px] text-muted">
                      Toplam tutara uygulanan indirimde, seçilen modül ve ek sayfalar da indirime dahil olur.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </>
          );
        }}
      />
    </Panel>
  );
}
