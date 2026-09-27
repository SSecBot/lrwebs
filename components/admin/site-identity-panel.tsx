"use client";

import { CircleAlert, Lock, Plus, RotateCcw, X } from "lucide-react";
import { Grid, Panel, SmallButton, TextField } from "@/components/admin/fields";
import { FileDropzone } from "@/components/admin/file-dropzone";
import { DEFAULT_FAVICON, formatTabTitle, isSafeIconUrl } from "@/lib/site-identity";
import type { GeneralSettings } from "@/types/cms";

interface SiteIdentityPanelProps {
  general: GeneralSettings;
  onChange: (general: GeneralSettings) => void;
  /** Yükleme sonrası sunucuda kaydedilmiş Genel Ayarlar bölümü. */
  onSynced: (general: GeneralSettings) => void;
}

function TabIcon({ src, size = 16 }: { src: string; size?: number }) {
  // Önizleme; yalnızca doğrulanmış ikon adresleri yüklenir.
  return (
    // eslint-disable-next-line @next/next/no-img-element -- harici/yüklenen ikon önizlemesi, optimizasyon gerekmez
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-[3px] object-contain"
      style={{ width: size, height: size }}
    />
  );
}

/** Tarayıcı sekmesi başlığı ve ikonunu düzenleme + canlı sekme önizlemesi. */
export function SiteIdentityPanel({ general, onChange, onSynced }: SiteIdentityPanelProps) {
  const set = <K extends keyof GeneralSettings>(key: K, v: GeneralSettings[K]) => onChange({ ...general, [key]: v });

  const iconValid = isSafeIconUrl(general.faviconUrl);
  const icon = iconValid ? general.faviconUrl : DEFAULT_FAVICON;
  const templateValid = general.titleTemplate === "" || general.titleTemplate.split("%s").length === 2;
  const homeTitle = general.siteTitle || "Başlıksız";
  const blogTitle = formatTabTitle(general, "Blog");
  let host = "lrwebs.com";
  try {
    host = new URL(general.siteUrl).host || host;
  } catch {
    /* önizleme için varsayılan */
  }

  return (
    <Panel
      title="Site Kimliği ve Sekme Ayarları"
      description="Tüm sayfalarda tarayıcı sekmesinde görünen başlık ve ikon. Kaydettiğinizde site anında güncellenir."
    >
      {/* Canlı tarayıcı sekmesi önizlemesi */}
      <div className="overflow-hidden rounded-xl border border-line bg-[#0b1220]" aria-label="Tarayıcı sekmesi önizlemesi">
        <div className="flex items-end gap-1 px-3 pt-2.5">
          <span className="mr-2 mb-2.5 flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#334155]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#334155]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#334155]" />
          </span>
          <div className="flex h-9 w-60 max-w-[55%] min-w-0 items-center gap-2 rounded-t-lg bg-surface px-3 text-xs text-fg">
            <TabIcon src={icon} />
            <span className="min-w-0 flex-1 truncate" title={homeTitle}>
              {homeTitle}
            </span>
            <X className="h-3 w-3 shrink-0 text-muted" aria-hidden="true" />
          </div>
          <div className="hidden h-8 w-48 min-w-0 items-center gap-2 rounded-t-lg px-3 text-xs text-muted sm:flex">
            <TabIcon src={icon} />
            <span className="min-w-0 flex-1 truncate" title={blogTitle}>
              {blogTitle}
            </span>
          </div>
          <Plus className="mb-2.5 ml-1 h-3.5 w-3.5 text-muted" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2 bg-surface px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-deep px-3 py-1.5 text-[11px] text-muted">
            <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{host}</span>
          </div>
        </div>
      </div>
      <p className="text-[11px] leading-5 text-muted">
        Etkin sekme ana sayfayı, ikinci sekme şablonun bir alt sayfada (&quot;Blog&quot;) nasıl görüneceğini gösterir.
      </p>

      <Grid>
        <TextField
          label="Sekme başlığı (siteTitle)"
          value={general.siteTitle}
          onChange={(v) => set("siteTitle", v)}
          maxLength={120}
          hint="Ana sayfa ve varsayılan başlık"
        />
        <TextField
          label="Alt sayfa başlık şablonu"
          value={general.titleTemplate}
          onChange={(v) => set("titleTemplate", v)}
          maxLength={80}
          mono
          hint='"%s" = sayfa adı'
          placeholder="%s | LrWebs"
        />
      </Grid>
      {!templateValid ? (
        <p className="flex items-center gap-2 text-xs text-red-300">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
          Şablon tam olarak bir kez &quot;%s&quot; içermelidir.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <TextField
              className="flex-1"
              label="Sekme ikonu adresi (faviconUrl)"
              value={general.faviconUrl}
              onChange={(v) => set("faviconUrl", v)}
              mono
              hint=".ico · .png · .svg"
              placeholder="/favicon.svg"
            />
            <SmallButton onClick={() => set("faviconUrl", DEFAULT_FAVICON)} title="Varsayılan ikonu kullan">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Varsayılan
            </SmallButton>
          </div>
          {!iconValid ? (
            <p className="flex items-center gap-2 text-xs text-red-300">
              <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Geçersiz adres: /yol veya https:// ile başlamalı ve .ico, .png ya da .svg ile bitmelidir. Önizlemede varsayılan ikon
              gösteriliyor.
            </p>
          ) : null}
          <div className="flex items-center gap-4 rounded-xl border border-line bg-deep/60 px-4 py-3">
            <TabIcon src={icon} size={16} />
            <TabIcon src={icon} size={32} />
            <TabIcon src={icon} size={48} />
            <span className="text-[11px] text-muted">16 · 32 · 48 px önizleme</span>
          </div>
        </div>
        <FileDropzone
          kind="favicon"
          accept=".ico,.png,.svg,image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml"
          extensions={["ico", "png", "svg"]}
          maxBytes={512 * 1024}
          title="İkonu buraya sürükleyin veya seçmek için tıklayın"
          hint=".ico, .png veya .svg · en fazla 512 KB · kare, en az 48×48 önerilir · yükleme anında yayına alınır"
          onUploaded={(res) => res.general && onSynced(res.general)}
          compact
        />
      </div>
    </Panel>
  );
}
