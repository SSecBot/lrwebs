"use client";

import { Image as ImageIcon, Link2, Type, X } from "lucide-react";
import { useId } from "react";
import { Grid, NumberField, Panel, SelectField, TextField, Toggle } from "@/components/admin/fields";
import { FileDropzone } from "@/components/admin/file-dropzone";
import { ListEditor } from "@/components/admin/list-editor";
import type { TabProps } from "@/components/admin/tabs-settings";
import { FooterCredit } from "@/components/layout/footer-credit";
import { uid } from "@/lib/utils";
import type { FooterCreditSettings, FooterSegment, FooterSegmentType } from "@/types/cms";

const TYPE_LABELS: Record<FooterSegmentType, string> = {
  text: "Düz metin",
  link: "Bağlantılı metin",
  logo: "Bağlantılı logo",
};

const TYPE_ICONS = { text: Type, link: Link2, logo: ImageIcon };

const newSegment = (type: FooterSegmentType): FooterSegment => ({
  id: uid("fc"),
  type,
  text: type === "logo" ? "" : type === "link" ? "Bağlantı" : "Metin",
  href: type === "text" ? "" : "https://",
  newTab: type !== "text",
  color: "",
  imageUrl: "",
  imageHeight: 20,
});

/** Renk seçici + boşaltma düğmesi. Boş değer = varsayılan renk. */
function ColorField({
  label,
  value,
  onChange,
  emptyLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  emptyLabel: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-fg">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value || "#06b6d4"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-deep p-1"
        />
        <input
          value={value}
          placeholder={emptyLabel}
          maxLength={7}
          onChange={(e) => onChange(e.target.value.trim())}
          className="input font-mono text-xs"
          aria-label={`${label} (hex)`}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-lg border border-line p-2 text-muted transition hover:text-fg"
            aria-label="Varsayılana döndür"
            title="Varsayılana döndür"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FooterCreditTab({ value: fc, onChange }: TabProps<FooterCreditSettings>) {
  const set = <K extends keyof FooterCreditSettings>(key: K, v: FooterCreditSettings[K]) => onChange({ ...fc, [key]: v });

  return (
    <div className="space-y-6">
      <Panel
        title="Footer alt satırı"
        description="Footer'ın en altında gösterilen, bağlantılı metin ve logolar içerebilen serbest satır (ör. “Tasarım ve geliştirme: [logo]”)."
      >
        <Toggle label="Sitede göster" checked={fc.enabled} onChange={(v) => set("enabled", v)} />
        <Grid cols={3}>
          <SelectField
            label="Hizalama"
            value={fc.align}
            onChange={(v) => set("align", v)}
            options={[
              { value: "left", label: "Sola" },
              { value: "center", label: "Ortaya" },
              { value: "right", label: "Sağa" },
            ]}
          />
          <ColorField label="Bağlantı rengi" value={fc.linkColor} onChange={(v) => set("linkColor", v)} emptyLabel="Tema rengi" />
          <ColorField
            label="Üzerine gelince renk"
            value={fc.linkHoverColor}
            onChange={(v) => set("linkHoverColor", v)}
            emptyLabel="Aynı renk"
          />
        </Grid>
      </Panel>

      <Panel
        title="Parçalar"
        description="Satır, parçaların sırasıyla yan yana dizilmesiyle oluşur. Metnin arasına bağlantı veya logo eklemek için araya yeni bir parça ekleyip sürükleyerek sıralayın."
      >
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABELS) as FooterSegmentType[]).map((type) => {
            const Icon = TYPE_ICONS[type];
            return (
              <button
                key={type}
                type="button"
                disabled={fc.segments.length >= 20}
                onClick={() => set("segments", [...fc.segments, newSegment(type)])}
                className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-muted transition hover:border-primary/50 hover:text-fg disabled:opacity-40"
              >
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />+ {TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
        <ListEditor
          items={fc.segments}
          onChange={(v) => set("segments", v)}
          getKey={(s) => s.id}
          getTitle={(s) => (s.type === "logo" ? s.text || "Logo" : s.text || "(boş)")}
          getSubtitle={(s) => `${TYPE_LABELS[s.type]}${s.href && s.type !== "text" ? ` → ${s.href}` : ""}`}
          createItem={() => newSegment("text")}
          duplicateItem={(s) => ({ ...s, id: uid("fc") })}
          addLabel="Metin parçası ekle"
          emptyLabel="Henüz parça eklenmedi."
          maxItems={20}
          renderItem={(s, update) => (
            <>
              <Grid>
                <SelectField
                  label="Tür"
                  value={s.type}
                  onChange={(v) => update({ type: v })}
                  options={(Object.keys(TYPE_LABELS) as FooterSegmentType[]).map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
                />
                <TextField
                  label={s.type === "logo" ? "Alternatif metin" : "Metin"}
                  hint={s.type === "logo" ? "ekran okuyucular için" : undefined}
                  value={s.text}
                  onChange={(v) => update({ text: v })}
                  maxLength={200}
                />
              </Grid>

              {s.type !== "text" ? (
                <Grid>
                  <TextField
                    label="Bağlantı adresi"
                    hint={s.type === "logo" ? "boş = bağlantısız" : "/yol, https://, mailto:"}
                    type="url"
                    value={s.href}
                    onChange={(v) => update({ href: v })}
                    mono
                  />
                  <Toggle label="Yeni sekmede aç" checked={s.newTab} onChange={(v) => update({ newTab: v })} />
                </Grid>
              ) : null}

              {s.type === "link" ? (
                <ColorField
                  label="Bu bağlantının rengi"
                  value={s.color}
                  onChange={(v) => update({ color: v })}
                  emptyLabel="Genel bağlantı rengi"
                />
              ) : null}

              {s.type === "logo" ? (
                <>
                  <Grid>
                    <TextField
                      label="Logo adresi"
                      hint="yükleyin veya https:// girin"
                      value={s.imageUrl}
                      onChange={(v) => update({ imageUrl: v })}
                      mono
                    />
                    <NumberField
                      label="Logo yüksekliği"
                      value={s.imageHeight}
                      onChange={(v) => update({ imageHeight: v })}
                      min={12}
                      max={80}
                      suffix="px"
                    />
                  </Grid>
                  <FileDropzone
                    kind="image"
                    accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                    extensions={["png", "jpg", "jpeg", "webp", "svg"]}
                    maxBytes={1024 * 1024}
                    title="Logoyu buraya sürükleyin veya seçmek için tıklayın"
                    hint=".png, .jpg, .webp veya .svg · en fazla 1 MB · yayına almak için kaydedin"
                    onUploaded={(res) => res.url && update({ imageUrl: res.url })}
                    compact
                  />
                </>
              ) : null}
            </>
          )}
        />
      </Panel>

      <Panel title="Canlı önizleme" description="Kaydetmeden önce satırın footer'da nasıl görüneceği.">
        <div className="overflow-hidden rounded-xl border border-line bg-deep">
          {fc.enabled ? (
            <FooterCredit credit={fc} />
          ) : (
            <p className="px-4 py-4 text-center text-xs text-muted">Satır şu an gizli. Göstermek için “Sitede göster”i açın.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
