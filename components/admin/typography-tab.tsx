"use client";

import { CircleAlert } from "lucide-react";
import { useId } from "react";
import { Grid, Panel, SelectField } from "@/components/admin/fields";
import type { TabProps } from "@/components/admin/tabs-settings";
import {
  BASE_SIZES,
  CATEGORY_LABELS,
  effectiveWeight,
  FONT_CATALOG,
  findFont,
  fontStack,
  type FontCategory,
} from "@/lib/font-catalog";
import { cn } from "@/lib/utils";
import type { TypographySettings } from "@/types/cms";

const PRESETS: { label: string; value: Omit<TypographySettings, "baseSize"> }[] = [
  {
    label: "Varsayılan (Pacifico + Poppins)",
    value: { headingFont: "pacifico", bodyFont: "poppins", brandFont: "pacifico", headingWeight: 400 },
  },
  { label: "Modern (Inter)", value: { headingFont: "inter", bodyFont: "inter", brandFont: "inter", headingWeight: 700 } },
  {
    label: "Kurumsal (Montserrat + Open Sans)",
    value: { headingFont: "montserrat", bodyFont: "open-sans", brandFont: "montserrat", headingWeight: 700 },
  },
  {
    label: "Klasik (Playfair + Lora)",
    value: { headingFont: "playfair-display", bodyFont: "lora", brandFont: "playfair-display", headingWeight: 600 },
  },
  {
    label: "Teknik (Space Grotesk + Inter)",
    value: { headingFont: "space-grotesk", bodyFont: "inter", brandFont: "jetbrains-mono", headingWeight: 600 },
  },
  { label: "Samimi (Nunito)", value: { headingFont: "nunito", bodyFont: "nunito", brandFont: "caveat", headingWeight: 700 } },
];

const CATEGORY_ORDER: FontCategory[] = ["sans", "serif", "display", "script", "mono"];

function FontSelect({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-fg">
        {label}
        {hint ? <span className="ml-2 font-normal text-muted">{hint}</span> : null}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input text-sm">
        {CATEGORY_ORDER.map((cat) => (
          <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
            {FONT_CATALOG.filter((f) => f.category === cat).map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {/* Seçilen fontun kendisiyle yazılmış küçük örnek */}
      <p
        className="mt-2 truncate rounded-lg border border-line bg-deep/60 px-3 py-2 text-lg text-fg"
        style={{ fontFamily: fontStack(value) }}
      >
        Aa Çğış Öü
      </p>
    </div>
  );
}

export function TypographyTab({ value: t, onChange }: TabProps<TypographySettings>) {
  const set = <K extends keyof TypographySettings>(key: K, v: TypographySettings[K]) => onChange({ ...t, [key]: v });
  const headingWeight = effectiveWeight(t.headingFont, t.headingWeight);
  const weightClamped = headingWeight !== t.headingWeight;
  const scale = (BASE_SIZES[t.baseSize] ?? 16) / 16;

  return (
    <div className="space-y-6">
      <Panel
        title="Hazır kombinasyonlar"
        description="Tek tıkla uyumlu bir font eşleşmesi uygulayın; ardından dilediğiniz gibi değiştirebilirsiniz."
      >
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const active =
              p.value.headingFont === t.headingFont && p.value.bodyFont === t.bodyFont && p.value.brandFont === t.brandFont;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onChange({ ...t, ...p.value })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs transition",
                  active
                    ? "border-primary bg-primary/10 text-fg"
                    : "border-line text-muted hover:border-primary/50 hover:text-fg",
                )}
              >
                <span className="block text-sm text-fg" style={{ fontFamily: fontStack(p.value.headingFont) }}>
                  Aa
                </span>
                {p.label}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Yazı tipleri"
        description="Tüm fontlar Türkçe karakterleri destekler ve sitenizin kendi sunucusundan yüklenir."
      >
        <Grid cols={3}>
          <FontSelect label="Başlıklar" value={t.headingFont} onChange={(v) => set("headingFont", v)} hint="h1–h3" />
          <FontSelect label="Gövde metni" value={t.bodyFont} onChange={(v) => set("bodyFont", v)} hint="tüm metinler" />
          <FontSelect label="Marka logosu" value={t.brandFont} onChange={(v) => set("brandFont", v)} hint="logo" />
        </Grid>
        <Grid>
          <SelectField
            label="Başlık kalınlığı"
            value={String(t.headingWeight) as "400" | "500" | "600" | "700"}
            onChange={(v) => set("headingWeight", Number(v) as TypographySettings["headingWeight"])}
            options={[
              { value: "400", label: "Normal (400)" },
              { value: "500", label: "Orta (500)" },
              { value: "600", label: "Yarı kalın (600)" },
              { value: "700", label: "Kalın (700)" },
            ]}
          />
          <SelectField
            label="Temel yazı boyutu"
            value={t.baseSize}
            onChange={(v) => set("baseSize", v)}
            options={[
              { value: "sm", label: "Küçük (15 px)" },
              { value: "md", label: "Normal (16 px)" },
              { value: "lg", label: "Büyük (17 px)" },
            ]}
          />
        </Grid>
        {weightClamped ? (
          <p className="flex items-center gap-2 text-xs text-warm">
            <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {findFont(t.headingFont).label} yalnızca {findFont(t.headingFont).weights.join(", ")} ağırlığına sahip; sitede{" "}
            {headingWeight} kullanılacak (sahte kalınlaştırma bozuk görünür).
          </p>
        ) : null}
      </Panel>

      <Panel title="Canlı önizleme" description="Kaydetmeden önce seçimlerin sitede nasıl görüneceği.">
        <div className="overflow-hidden rounded-xl border border-line bg-deep" style={{ fontSize: `${scale}rem` }}>
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <span
              style={{ fontFamily: fontStack(t.brandFont), fontWeight: effectiveWeight(t.brandFont, 700) }}
              className="text-lg text-fg"
            >
              Lr<span className="text-primary">Webs</span>
            </span>
            <span className="text-xs text-muted" style={{ fontFamily: fontStack(t.bodyFont) }}>
              Hizmetlerimiz · Blog · İletişim
            </span>
          </div>
          <div className="space-y-3 p-5" style={{ fontFamily: fontStack(t.bodyFont) }}>
            <p className="text-[0.75em] font-medium tracking-[0.14em] text-primary uppercase">Web mühendisliği</p>
            <h3
              className="text-[2em] leading-[1.35] text-fg"
              style={{ fontFamily: fontStack(t.headingFont), fontWeight: headingWeight }}
            >
              Sürdürülebilir kod mimarisiyle <span className="text-primary">yeniden inşa</span>
            </h3>
            <p className="text-[0.95em] leading-7 text-muted">
              Next.js ve TypeScript ile hızlı, erişilebilir ve bakımı kolay web uygulamaları geliştiriyoruz. Çağdaş, ölçülebilir
              ve şeffaf bir süreç: ğ ü ş ı ö ç İ.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-lg bg-primary px-4 py-2 text-[0.85em] font-medium text-deep">Detaylı Bilgi</span>
              <span className="rounded-lg border border-line px-4 py-2 text-[0.85em] font-medium text-fg">
                ₺95.000 – ₺150.000
              </span>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
