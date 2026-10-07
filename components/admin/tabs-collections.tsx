"use client";

import { Calculator, ExternalLink, FileText, Mail, MailOpen, Trash2, Wand2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteMessageAction, removeLegalPdfAction, setMessageReadAction } from "@/app/actions/admin";
import { Grid, IconField, NumberField, Panel, SmallButton, TagsField, TextField, Toggle } from "@/components/admin/fields";
import { formatDiscountAmount } from "@/lib/pricing";
import { DiscountsPanel } from "@/components/admin/discounts-panel";
import { FileDropzone } from "@/components/admin/file-dropzone";
import { ListEditor } from "@/components/admin/list-editor";
import { MarkdownEditor, SummaryField } from "@/components/admin/markdown-editor";
import type { TabProps } from "@/components/admin/tabs-settings";
import { useToast } from "@/components/ui/toast";
import { cn, formatDate, formatPrice, safeHref, slugify, uid } from "@/lib/utils";
import type {
  BlogPost,
  ContactMessage,
  LegalDocument,
  LegalKind,
  LegalSettings,
  PricingSettings,
  Project,
  QuoteSnapshot,
  Service,
} from "@/types/cms";

function SlugField({ value, onChange, source }: { value: string; onChange: (v: string) => void; source: string }) {
  return (
    <div className="flex items-end gap-2">
      <TextField
        className="flex-1"
        label="Kısa ad (URL)"
        value={value}
        onChange={(v) => onChange(slugify(v))}
        mono
        hint="küçük-harf-ve-tire"
      />
      <SmallButton onClick={() => onChange(slugify(source))} title="Başlıktan üret">
        <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
        Üret
      </SmallButton>
    </div>
  );
}

function uniqueSlug(base: string, taken: string[]): string {
  let slug = slugify(base) || "icerik";
  let n = 2;
  while (taken.includes(slug)) slug = `${slugify(base)}-${n++}`;
  return slug;
}

/* ---------- 4. Hizmetler ---------- */

export function ServicesTab({ value, onChange }: TabProps<Service[]>) {
  return (
    <Panel
      title="Hizmet kartları"
      description="Ana sayfa ve /services sayfasında gösterilir. Sıralama sitedeki sıralamayı belirler."
    >
      <ListEditor
        items={value}
        onChange={onChange}
        getKey={(s) => s.id}
        getTitle={(s) => s.title}
        getSubtitle={(s) => `/services#${s.slug}`}
        isHidden={(s) => !s.visible}
        createItem={() => ({
          id: uid("sv"),
          slug: uniqueSlug(
            "yeni-hizmet",
            value.map((s) => s.slug),
          ),
          title: "Yeni hizmet",
          icon: "code",
          summary: "",
          content: "## Kapsam\nHizmet detaylarını buraya yazın.",
          features: [],
          duration: "",
          visible: false,
        })}
        duplicateItem={(s) => ({
          ...s,
          id: uid("sv"),
          slug: uniqueSlug(
            `${s.slug}-kopya`,
            value.map((x) => x.slug),
          ),
          title: `${s.title} (kopya)`,
          visible: false,
        })}
        addLabel="Hizmet ekle"
        renderItem={(s, update) => (
          <>
            <Grid>
              <TextField label="Başlık" value={s.title} onChange={(v) => update({ title: v })} maxLength={120} />
              <SlugField value={s.slug} source={s.title} onChange={(v) => update({ slug: v })} />
            </Grid>
            <Grid>
              <IconField value={s.icon} onChange={(v) => update({ icon: v })} />
              <TextField
                label="Tahmini süre"
                value={s.duration}
                onChange={(v) => update({ duration: v })}
                placeholder="Örn. 4–6 hafta"
              />
            </Grid>
            <MarkdownEditor label="Detaylı açıklama" value={s.content} onChange={(v) => update({ content: v })} rows={10} />
            <SummaryField
              label="Kart özeti"
              value={s.summary}
              onChange={(v) => update({ summary: v })}
              source={s.content}
              maxLength={220}
            />
            <TagsField label="Öne çıkan özellikler" value={s.features} onChange={(v) => update({ features: v })} />
            <Toggle label="Sitede yayınla" checked={s.visible} onChange={(v) => update({ visible: v })} />
          </>
        )}
      />
    </Panel>
  );
}

/* ---------- 5. Portfolyo ---------- */

export function ProjectsTab({ value, onChange }: TabProps<Project[]>) {
  return (
    <Panel title="Projeler" description="Ana sayfa karuseli ve /portfolio sayfasında gösterilir.">
      <ListEditor
        items={value}
        onChange={onChange}
        getKey={(p) => p.id}
        getTitle={(p) => p.title}
        getSubtitle={(p) => `${p.category} · ${p.client}`}
        isHidden={(p) => !p.visible}
        createItem={() => ({
          id: uid("pr"),
          slug: uniqueSlug(
            "yeni-proje",
            value.map((p) => p.slug),
          ),
          title: "Yeni proje",
          client: "",
          category: "Web Uygulaması",
          year: String(new Date().getFullYear()),
          summary: "",
          content: "## İhtiyaç\n\n## Çözüm\n",
          tags: [],
          liveUrl: "",
          coverImage: "",
          visible: false,
        })}
        duplicateItem={(p) => ({
          ...p,
          id: uid("pr"),
          slug: uniqueSlug(
            `${p.slug}-kopya`,
            value.map((x) => x.slug),
          ),
          title: `${p.title} (kopya)`,
          visible: false,
        })}
        addLabel="Proje ekle"
        renderItem={(p, update) => (
          <>
            <Grid>
              <TextField label="Proje adı" value={p.title} onChange={(v) => update({ title: v })} maxLength={120} />
              <SlugField value={p.slug} source={p.title} onChange={(v) => update({ slug: v })} />
            </Grid>
            <Grid cols={3}>
              <TextField label="Müşteri" value={p.client} onChange={(v) => update({ client: v })} />
              <TextField
                label="Kategori"
                value={p.category}
                onChange={(v) => update({ category: v })}
                hint="Filtrelerde kullanılır"
              />
              <TextField label="Yıl" value={p.year} onChange={(v) => update({ year: v })} mono />
            </Grid>
            <Grid>
              <TextField label="Canlı önizleme URL" type="url" value={p.liveUrl} onChange={(v) => update({ liveUrl: v })} mono />
              <TextField
                label="Kapak görseli URL"
                value={p.coverImage}
                onChange={(v) => update({ coverImage: v })}
                mono
                hint="/covers/… veya https://"
              />
            </Grid>
            {p.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safeHref(p.coverImage)} alt="" className="h-28 w-48 rounded-lg border border-line object-cover" />
            ) : null}
            <MarkdownEditor label="Vaka çalışması" value={p.content} onChange={(v) => update({ content: v })} rows={8} />
            <SummaryField
              label="Kart özeti"
              value={p.summary}
              onChange={(v) => update({ summary: v })}
              source={p.content}
              maxLength={220}
            />
            <TagsField label="Etiketler" value={p.tags} onChange={(v) => update({ tags: v })} />
            <Toggle label="Sitede yayınla" checked={p.visible} onChange={(v) => update({ visible: v })} />
          </>
        )}
      />
    </Panel>
  );
}

/* ---------- 6. Blog ---------- */

export function BlogTab({ value, onChange }: TabProps<BlogPost[]>) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Panel
      title="Blog yazıları"
      description="Yazılar yayın tarihine göre sıralanır. Gizli yazılar sitede ve site haritasında görünmez."
    >
      <ListEditor
        items={value}
        onChange={onChange}
        getKey={(p) => p.id}
        getTitle={(p) => p.title}
        getSubtitle={(p) => `${formatDate(p.publishedAt)} · ${p.category} · ${p.author}`}
        isHidden={(p) => !p.visible}
        createItem={() => ({
          id: uid("bl"),
          slug: uniqueSlug(
            "yeni-yazi",
            value.map((p) => p.slug),
          ),
          title: "Yeni yazı",
          excerpt: "",
          content: "## Giriş\nYazınızı buraya yazın.",
          author: value[0]?.author ?? "LrWebs Ekibi",
          category: "Geliştirme",
          tags: [],
          coverImage: "",
          publishedAt: today,
          visible: false,
        })}
        duplicateItem={(p) => ({
          ...p,
          id: uid("bl"),
          slug: uniqueSlug(
            `${p.slug}-kopya`,
            value.map((x) => x.slug),
          ),
          title: `${p.title} (kopya)`,
          visible: false,
        })}
        addLabel="Yeni yazı oluştur"
        renderItem={(p, update) => (
          <>
            <Grid>
              <TextField label="Başlık" value={p.title} onChange={(v) => update({ title: v })} maxLength={160} />
              <SlugField value={p.slug} source={p.title} onChange={(v) => update({ slug: v })} />
            </Grid>
            <Grid cols={3}>
              <TextField label="Yazar" value={p.author} onChange={(v) => update({ author: v })} />
              <TextField label="Kategori" value={p.category} onChange={(v) => update({ category: v })} />
              <TextField
                label="Yayın tarihi"
                type="date"
                value={p.publishedAt.slice(0, 10)}
                onChange={(v) => update({ publishedAt: v })}
              />
            </Grid>
            <TextField
              label="Kapak görseli URL"
              value={p.coverImage}
              onChange={(v) => update({ coverImage: v })}
              mono
              hint="/covers/… veya https://"
            />
            <MarkdownEditor label="İçerik" value={p.content} onChange={(v) => update({ content: v })} rows={16} />
            <SummaryField
              label="Kart özeti (excerpt)"
              value={p.excerpt}
              onChange={(v) => update({ excerpt: v })}
              source={p.content}
              maxLength={260}
            />
            <TagsField label="Etiketler" value={p.tags} onChange={(v) => update({ tags: v })} />
            <Toggle
              label="Yayında"
              description="Kapalıysa yazı taslak olarak saklanır."
              checked={p.visible}
              onChange={(v) => update({ visible: v })}
            />
          </>
        )}
      />
    </Panel>
  );
}

/* ---------- 7. Fiyatlandırma ---------- */

export function PricingTab({ value: pricing, onChange }: TabProps<PricingSettings>) {
  const set = <K extends keyof PricingSettings>(key: K, v: PricingSettings[K]) => onChange({ ...pricing, [key]: v });
  return (
    <div className="space-y-6">
      <Panel title="Paket oluşturucu ayarları">
        <Grid cols={3}>
          <TextField label="Para birimi" value={pricing.currency} onChange={(v) => set("currency", v)} maxLength={4} />
          <TextField label="Özet başlığı" value={pricing.builderTitle} onChange={(v) => set("builderTitle", v)} />
          <TextField label="Özet açıklaması" value={pricing.builderDescription} onChange={(v) => set("builderDescription", v)} />
        </Grid>
        <Grid cols={3}>
          <TextField label="Ek sayfa etiketi" value={pricing.extraPageLabel} onChange={(v) => set("extraPageLabel", v)} />
          <NumberField
            label="Ek sayfa fiyatı"
            value={pricing.extraPagePrice}
            onChange={(v) => set("extraPagePrice", v)}
            min={0}
            suffix={pricing.currency}
          />
          <NumberField
            label="En fazla ek sayfa"
            value={pricing.maxExtraPages}
            onChange={(v) => set("maxExtraPages", Math.round(v))}
            min={0}
            max={100}
            hint="0 = gizle"
          />
        </Grid>
        <Grid cols={3}>
          <TextField label="Öncelikli teslim etiketi" value={pricing.rushLabel} onChange={(v) => set("rushLabel", v)} />
          <NumberField
            label="Öncelik çarpanı"
            value={pricing.rushMultiplier}
            onChange={(v) => set("rushMultiplier", v)}
            min={1}
            max={3}
            step={0.05}
            suffix="×"
          />
          <div />
        </Grid>
        <Grid>
          <TextField label="Özet butonu" value={pricing.summaryCtaLabel} onChange={(v) => set("summaryCtaLabel", v)} />
          <TextField label="Özet butonu hedefi" value={pricing.summaryCtaHref} onChange={(v) => set("summaryCtaHref", v)} mono />
        </Grid>
        <TextField
          label="Bilgilendirme notu"
          multiline
          rows={2}
          value={pricing.note}
          onChange={(v) => set("note", v)}
          maxLength={400}
        />
      </Panel>

      <Panel title="Paketler" description="Kullanıcının seçtiği temel paket, tahmini aralığın başlangıç noktasıdır.">
        <ListEditor
          items={pricing.packages}
          onChange={(v) => set("packages", v)}
          getKey={(p) => p.id}
          getTitle={(p) => p.name}
          getSubtitle={(p) =>
            `${formatPrice(p.priceMin, pricing.currency)} – ${formatPrice(p.priceMax, pricing.currency)} · ${p.timeline}`
          }
          isHidden={(p) => !p.visible}
          createItem={() => ({
            id: uid("pk"),
            name: "Yeni paket",
            description: "",
            priceMin: 0,
            priceMax: 0,
            timeline: "",
            features: [],
            highlighted: false,
            ctaLabel: "Bu paketi konuşalım",
            ctaHref: "/contact",
            visible: false,
          })}
          duplicateItem={(p) => ({ ...p, id: uid("pk"), name: `${p.name} (kopya)`, highlighted: false, visible: false })}
          addLabel="Paket ekle"
          maxItems={8}
          renderItem={(p, update) => (
            <>
              <Grid cols={3}>
                <TextField label="Paket adı" value={p.name} onChange={(v) => update({ name: v })} />
                <NumberField
                  label="Alt fiyat"
                  value={p.priceMin}
                  onChange={(v) => update({ priceMin: v })}
                  min={0}
                  suffix={pricing.currency}
                />
                <NumberField
                  label="Üst fiyat"
                  value={p.priceMax}
                  onChange={(v) => update({ priceMax: v })}
                  min={0}
                  suffix={pricing.currency}
                />
              </Grid>
              <Grid>
                <TextField label="Tahmini süre" value={p.timeline} onChange={(v) => update({ timeline: v })} />
                <TextField label="Açıklama" value={p.description} onChange={(v) => update({ description: v })} maxLength={300} />
              </Grid>
              <TagsField label="Özellik listesi" value={p.features} onChange={(v) => update({ features: v })} />
              <Grid>
                <TextField label="Buton metni" value={p.ctaLabel} onChange={(v) => update({ ctaLabel: v })} />
                <TextField label="Buton hedefi" value={p.ctaHref} onChange={(v) => update({ ctaHref: v })} mono />
              </Grid>
              <Grid>
                <Toggle
                  label="Önerilen paket"
                  description="Varsayılan olarak seçilir ve etiketlenir."
                  checked={p.highlighted}
                  onChange={(v) => update({ highlighted: v })}
                />
                <Toggle label="Sitede göster" checked={p.visible} onChange={(v) => update({ visible: v })} />
              </Grid>
            </>
          )}
        />
      </Panel>

      <Panel title="Ek modüller">
        <ListEditor
          items={pricing.addons}
          onChange={(v) => set("addons", v)}
          getKey={(a) => a.id}
          getTitle={(a) => a.label}
          getSubtitle={(a) => `+${formatPrice(a.priceMin, pricing.currency)} – ${formatPrice(a.priceMax, pricing.currency)}`}
          isHidden={(a) => !a.visible}
          createItem={() => ({ id: uid("ad"), label: "Yeni modül", description: "", priceMin: 0, priceMax: 0, visible: true })}
          addLabel="Modül ekle"
          maxItems={30}
          renderItem={(a, update) => (
            <>
              <Grid cols={3}>
                <TextField label="Modül adı" value={a.label} onChange={(v) => update({ label: v })} />
                <NumberField
                  label="Alt fiyat"
                  value={a.priceMin}
                  onChange={(v) => update({ priceMin: v })}
                  min={0}
                  suffix={pricing.currency}
                />
                <NumberField
                  label="Üst fiyat"
                  value={a.priceMax}
                  onChange={(v) => update({ priceMax: v })}
                  min={0}
                  suffix={pricing.currency}
                />
              </Grid>
              <TextField label="Açıklama" value={a.description} onChange={(v) => update({ description: v })} maxLength={200} />
              <Toggle label="Sitede göster" checked={a.visible} onChange={(v) => update({ visible: v })} />
            </>
          )}
        />
      </Panel>

      <DiscountsPanel pricing={pricing} onChange={(v) => set("discounts", v)} />
    </div>
  );
}

/* ---------- 8. Yasal Metinler & KVKK ---------- */

function LegalPdfControls({
  kind,
  doc,
  onSynced,
}: {
  kind: LegalKind;
  doc: LegalDocument;
  onSynced: (legal: LegalSettings) => void;
}) {
  const toast = useToast();
  const [removing, startRemove] = useTransition();

  const remove = () =>
    startRemove(async () => {
      const result = await removeLegalPdfAction(kind);
      if (result.ok && result.data) {
        onSynced(result.data.store.legal);
        toast.success(result.message);
      } else toast.error(result.message);
    });

  return (
    <div className="space-y-3">
      <FileDropzone
        kind={kind}
        accept="application/pdf,.pdf"
        extensions={["pdf"]}
        maxBytes={10 * 1024 * 1024}
        title="PDF’i buraya sürükleyin veya seçmek için tıklayın"
        hint="Yalnızca .pdf · en fazla 10 MB · yükleme anında yayına alınır"
        onUploaded={(res) => res.legal && onSynced(res.legal)}
      />

      {doc.pdfUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="flex min-w-0 items-center gap-2 text-xs text-fg">
            <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate font-mono">{doc.pdfUrl.split("/").pop()}</span>
          </span>
          <div className="flex gap-2">
            <a
              href={safeHref(doc.pdfUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition hover:text-fg"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Görüntüle
            </a>
            <SmallButton variant="danger" onClick={remove} disabled={removing}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              PDF’i kaldır
            </SmallButton>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted">PDF yüklenmediği sürece modalda aşağıdaki metin içeriği gösterilir.</p>
      )}
    </div>
  );
}

export function LegalTab({
  value: legal,
  onChange,
  onSynced,
}: TabProps<LegalSettings> & {
  /** Yükleme/kaldırma sonrası sunucudaki güncel yasal metin bölümü. */
  onSynced: (legal: LegalSettings) => void;
}) {
  const docs: { kind: LegalKind; label: string }[] = [
    { kind: "privacy", label: "Gizlilik Politikası" },
    { kind: "kvkk", label: "KVKK Aydınlatma Metni" },
  ];

  return (
    <div className="space-y-6">
      {docs.map(({ kind, label }) => {
        const doc = legal[kind];
        const update = (patch: Partial<LegalDocument>) => onChange({ ...legal, [kind]: { ...doc, ...patch } });
        return (
          <Panel
            key={kind}
            title={label}
            description={doc.pdfUrl ? "Şu anda PDF görüntüleyici gösteriliyor." : "Şu anda zengin metin içeriği gösteriliyor."}
          >
            <Grid>
              <TextField label="Başlık" value={doc.title} onChange={(v) => update({ title: v })} />
              <TextField
                label="Son güncelleme"
                type="date"
                value={doc.updatedAt.slice(0, 10)}
                onChange={(v) => update({ updatedAt: v })}
              />
            </Grid>
            <LegalPdfControls kind={kind} doc={doc} onSynced={onSynced} />
            <MarkdownEditor label="Metin içeriği" value={doc.content} onChange={(v) => update({ content: v })} rows={14} />
          </Panel>
        );
      })}
    </div>
  );
}

/* ---------- Mesajlar ---------- */

/** Mesajla birlikte gelen fiyatlandırma seçimleri (gönderim anındaki fiyatlarla). */
function QuoteDetails({ quote }: { quote: QuoteSnapshot }) {
  const price = (n: number) => formatPrice(n, quote.currency);
  return (
    <div className="rounded-xl border border-warm/30 bg-warm/5 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-warm">
        <Calculator className="h-4 w-4" aria-hidden="true" />
        Fiyatlandırmada seçilenler
      </p>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted">Paket</dt>
          <dd className="text-fg">
            {quote.packageName}
            {quote.timeline ? <span className="text-muted"> · {quote.timeline}</span> : null}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Ek modüller</dt>
          <dd className="text-fg">{quote.addons.length ? quote.addons.join(", ") : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Ek sayfa</dt>
          <dd className="text-fg">{quote.extraPages || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">{quote.rushLabel}</dt>
          <dd className="text-fg">{quote.rush ? "Evet" : "Hayır"}</dd>
        </div>
      </dl>
      <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs">
        {quote.lines.map((line) => (
          <li key={line.label} className="flex justify-between gap-4">
            <span className="text-muted">{line.label}</span>
            <span className="font-mono text-fg/90">
              {price(line.min)} – {price(line.max)}
            </span>
          </li>
        ))}
        {quote.discount ? (
          <li className="flex justify-between gap-4 text-warm">
            <span>
              İndirim: {quote.discount.name} ({quote.discount.label}){quote.discount.code ? ` · kod ${quote.discount.code}` : ""}
            </span>
            <span className="font-mono">{formatDiscountAmount(quote.discount.min, quote.discount.max, quote.currency)}</span>
          </li>
        ) : null}
      </ul>
      <p className="mt-3 flex justify-between gap-4 border-t border-line pt-3 text-sm">
        <span className="text-muted">Tahmini bütçe</span>
        <span className="text-right">
          {quote.discount && quote.originalMin !== undefined && quote.originalMax !== undefined ? (
            <span className="mr-2 text-xs text-muted line-through decoration-muted/70">
              {price(quote.originalMin)} – {price(quote.originalMax)}
            </span>
          ) : null}
          <span className="font-semibold text-fg">
            {price(quote.min)} – {price(quote.max)}
          </span>
        </span>
      </p>
    </div>
  );
}

export function MessagesTab({
  messages,
  onChange,
}: {
  messages: ContactMessage[];
  onChange: (messages: ContactMessage[]) => void;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);

  const setRead = (id: string, read: boolean) =>
    startTransition(async () => {
      const result = await setMessageReadAction(id, read);
      if (result.ok) onChange(messages.map((m) => (m.id === id ? { ...m, read } : m)));
      else toast.error(result.message);
    });

  const remove = (id: string) =>
    startTransition(async () => {
      const result = await deleteMessageAction(id);
      if (result.ok) {
        onChange(messages.filter((m) => m.id !== id));
        toast.success(result.message);
      } else toast.error(result.message);
    });

  return (
    <Panel
      title="Gelen mesajlar"
      description="İletişim formundan gönderilen talepler data/messages.json dosyasında saklanır."
      actions={<span className="font-mono text-xs text-muted">{messages.filter((m) => !m.read).length} okunmamış</span>}
    >
      {messages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">Henüz mesaj yok.</p>
      ) : (
        <ul className="space-y-2">
          {messages.map((m) => {
            const open = openId === m.id;
            return (
              <li key={m.id} className={cn("rounded-xl border bg-deep/60", m.read ? "border-line" : "border-primary/40")}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(open ? null : m.id);
                    if (!m.read) setRead(m.id, true);
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left"
                  aria-expanded={open}
                >
                  {m.read ? (
                    <MailOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  ) : (
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={cn("text-sm", m.read ? "text-fg/80" : "font-semibold text-fg")}>{m.name}</span>
                        {m.quote ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-warm/40 bg-warm/10 px-1.5 py-0.5 text-[10px] font-medium text-warm">
                            <Calculator className="h-3 w-3" aria-hidden="true" />
                            {m.quote.packageName}
                          </span>
                        ) : null}
                      </span>
                      <span className="font-mono text-[10px] text-muted">
                        {new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(
                          new Date(m.createdAt),
                        )}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {m.email} — {m.message}
                    </span>
                  </span>
                </button>
                {open ? (
                  <div className="space-y-4 border-t border-line px-4 py-4">
                    {m.quote ? <QuoteDetails quote={m.quote} /> : null}
                    <p className="text-sm leading-6 whitespace-pre-wrap text-fg/90">{m.message}</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`mailto:${m.email}?subject=${encodeURIComponent("LrWebs — Proje talebiniz hakkında")}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-primary bg-primary px-2.5 py-1.5 text-xs font-medium text-deep"
                      >
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                        E-posta ile yanıtla
                      </a>
                      <SmallButton onClick={() => setRead(m.id, !m.read)} disabled={pending}>
                        {m.read ? "Okunmadı işaretle" : "Okundu işaretle"}
                      </SmallButton>
                      <SmallButton variant="danger" onClick={() => remove(m.id)} disabled={pending}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Sil
                      </SmallButton>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
