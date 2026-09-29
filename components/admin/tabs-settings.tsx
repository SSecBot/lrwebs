"use client";

import { Grid, IconField, Panel, RangeField, SelectField, TagsField, TextField, Toggle } from "@/components/admin/fields";
import { ListEditor } from "@/components/admin/list-editor";
import { MarkdownEditor, SummaryField } from "@/components/admin/markdown-editor";
import { SiteIdentityPanel } from "@/components/admin/site-identity-panel";
import { CircleAlert, CircleCheck } from "lucide-react";
import { extractMeasurementId } from "@/lib/analytics";
import { cn, uid } from "@/lib/utils";
import type {
  AboutSettings,
  AnalyticsSettings,
  ContactSettings,
  GeneralSettings,
  HeroSettings,
  HomeSections,
  PageCopy,
  PagesSettings,
  SectionCopy,
  SocialPlatform,
  StatsSettings,
} from "@/types/cms";

export interface TabProps<T> {
  value: T;
  onChange: (value: T) => void;
}

const SOCIAL_OPTIONS: { value: SocialPlatform; label: string }[] = [
  { value: "github", label: "GitHub" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X (Twitter)" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "dribbble", label: "Dribbble" },
  { value: "website", label: "Web sitesi" },
];

/* ---------- 1. Genel Ayarlar ---------- */

export function GeneralTab({
  general,
  contact,
  onGeneral,
  onContact,
  onGeneralSynced,
}: {
  general: GeneralSettings;
  contact: ContactSettings;
  onGeneral: (v: GeneralSettings) => void;
  onContact: (v: ContactSettings) => void;
  onGeneralSynced: (v: GeneralSettings) => void;
}) {
  const g = <K extends keyof GeneralSettings>(key: K, v: GeneralSettings[K]) => onGeneral({ ...general, [key]: v });
  const c = <K extends keyof ContactSettings>(key: K, v: ContactSettings[K]) => onContact({ ...contact, [key]: v });

  return (
    <div className="space-y-6">
      <SiteIdentityPanel general={general} onChange={onGeneral} onSynced={onGeneralSynced} />

      <Panel title="Marka ve SEO" description="Arama motorları ve sosyal paylaşımlarda kullanılan bilgiler.">
        <Grid>
          <TextField
            label="Marka adı"
            value={general.brandName}
            onChange={(v) => g("brandName", v)}
            maxLength={40}
            hint="Header ve footer'da görünür"
          />
          <TextField
            label="Slogan"
            value={general.siteTagline}
            onChange={(v) => g("siteTagline", v)}
            maxLength={200}
            hint="OG görselinde kullanılır"
          />
          <TextField
            label="Site adresi (URL)"
            type="url"
            value={general.siteUrl}
            onChange={(v) => g("siteUrl", v)}
            mono
            hint="Canonical ve sitemap için"
          />
        </Grid>
        <TextField
          label="Meta açıklaması"
          multiline
          value={general.siteDescription}
          onChange={(v) => g("siteDescription", v)}
          maxLength={400}
        />
        <TagsField label="Anahtar kelimeler" value={general.keywords} onChange={(v) => g("keywords", v)} />
      </Panel>

      <Panel
        title="Navigasyon menüsü"
        description="Hamburger menüdeki bağlantılar. Sürükleyerek veya oklarla sıralayabilirsiniz."
      >
        <ListEditor
          items={general.navigation}
          onChange={(v) => g("navigation", v)}
          getKey={(i) => i.id}
          getTitle={(i) => i.label}
          getSubtitle={(i) => i.href}
          isHidden={(i) => !i.visible}
          createItem={() => ({ id: uid("nav"), label: "Yeni bağlantı", href: "/", visible: true })}
          addLabel="Menü bağlantısı ekle"
          maxItems={20}
          renderItem={(item, update) => (
            <>
              <Grid>
                <TextField label="Etiket" value={item.label} onChange={(v) => update({ label: v })} maxLength={60} />
                <TextField
                  label="Bağlantı"
                  value={item.href}
                  onChange={(v) => update({ href: v })}
                  mono
                  hint="/sayfa veya https://"
                />
              </Grid>
              <Toggle label="Menüde göster" checked={item.visible} onChange={(v) => update({ visible: v })} />
            </>
          )}
        />
        <TextField
          label="Menü alt notu"
          multiline
          rows={2}
          value={general.drawerNote}
          onChange={(v) => g("drawerNote", v)}
          maxLength={300}
        />
      </Panel>

      <Panel title="İletişim bilgileri" description="Header menüsü, footer ve iletişim sayfalarında gösterilir.">
        <Grid cols={3}>
          <TextField label="E-posta" type="email" value={contact.email} onChange={(v) => c("email", v)} />
          <TextField label="Telefon" value={contact.phone} onChange={(v) => c("phone", v)} />
          <TextField label="Adres" value={contact.address} onChange={(v) => c("address", v)} />
        </Grid>
      </Panel>

      <Panel title="Sosyal medya bağlantıları">
        <ListEditor
          items={contact.socials}
          onChange={(v) => c("socials", v)}
          getKey={(i) => i.id}
          getTitle={(i) => i.label}
          getSubtitle={(i) => i.url}
          isHidden={(i) => !i.visible}
          createItem={() => ({
            id: uid("so"),
            platform: "website" as SocialPlatform,
            label: "Yeni bağlantı",
            url: "https://",
            visible: true,
          })}
          addLabel="Sosyal bağlantı ekle"
          maxItems={10}
          renderItem={(item, update) => (
            <>
              <Grid cols={3}>
                <SelectField
                  label="Platform"
                  value={item.platform}
                  options={SOCIAL_OPTIONS}
                  onChange={(v) => update({ platform: v })}
                />
                <TextField label="Etiket" value={item.label} onChange={(v) => update({ label: v })} />
                <TextField label="URL" type="url" value={item.url} onChange={(v) => update({ url: v })} mono />
              </Grid>
              <Toggle label="Sitede göster" checked={item.visible} onChange={(v) => update({ visible: v })} />
            </>
          )}
        />
      </Panel>

      <Panel title="Footer">
        <TextField
          label="Footer açıklaması"
          multiline
          rows={2}
          value={general.footer.description}
          onChange={(v) => g("footer", { ...general.footer, description: v })}
          maxLength={400}
        />
        <Grid cols={3}>
          <TextField
            label="Telif metni"
            value={general.footer.copyright}
            onChange={(v) => g("footer", { ...general.footer, copyright: v })}
            hint="{year} = yıl"
          />
          <TextField
            label="Gizlilik bağlantı metni"
            value={general.footer.privacyLabel}
            onChange={(v) => g("footer", { ...general.footer, privacyLabel: v })}
          />
          <TextField
            label="KVKK bağlantı metni"
            value={general.footer.kvkkLabel}
            onChange={(v) => g("footer", { ...general.footer, kvkkLabel: v })}
          />
        </Grid>
      </Panel>

      <p className="rounded-xl border border-line bg-deep/60 px-4 py-3 text-xs leading-5 text-muted">
        Güvenlik notu: Yönetici parolası <code className="font-mono text-primary">ADMIN_PASSCODE</code>, oturum imzalama anahtarı{" "}
        <code className="font-mono text-primary">ADMIN_SESSION_SECRET</code> ortam değişkenleriyle belirlenir. Varsayılan parola
        yalnızca geliştirme ortamı içindir.
      </p>
    </div>
  );
}

/* ---------- 2. Hero & Cihaz Vitrini ---------- */

export function HeroTab({ value: hero, onChange }: TabProps<HeroSettings>) {
  const set = <K extends keyof HeroSettings>(key: K, v: HeroSettings[K]) => onChange({ ...hero, [key]: v });
  const blur = (patch: Partial<HeroSettings["blur"]>) => set("blur", { ...hero.blur, ...patch });
  const devices = (patch: Partial<HeroSettings["devices"]>) => set("devices", { ...hero.devices, ...patch });

  return (
    <div className="space-y-6">
      <Panel title="Hero metinleri">
        <TextField label="Üst etiket" value={hero.eyebrow} onChange={(v) => set("eyebrow", v)} maxLength={120} />
        <Grid>
          <TextField
            label="Başlık"
            multiline
            rows={2}
            value={hero.headline}
            onChange={(v) => set("headline", v)}
            maxLength={200}
          />
          <TextField
            label="Vurgulu başlık devamı"
            multiline
            rows={2}
            value={hero.headlineAccent}
            onChange={(v) => set("headlineAccent", v)}
            maxLength={120}
            hint="Cyan renkte gösterilir"
          />
        </Grid>
        <TextField label="Açıklama" multiline value={hero.description} onChange={(v) => set("description", v)} maxLength={600} />
        <Grid cols={4}>
          <TextField
            label="Birincil buton"
            value={hero.primaryCta.label}
            onChange={(v) => set("primaryCta", { ...hero.primaryCta, label: v })}
          />
          <TextField
            label="Birincil hedef URL"
            value={hero.primaryCta.href}
            onChange={(v) => set("primaryCta", { ...hero.primaryCta, href: v })}
            mono
          />
          <TextField
            label="İkincil buton"
            value={hero.secondaryCta.label}
            onChange={(v) => set("secondaryCta", { ...hero.secondaryCta, label: v })}
          />
          <TextField
            label="İkincil hedef URL"
            value={hero.secondaryCta.href}
            onChange={(v) => set("secondaryCta", { ...hero.secondaryCta, href: v })}
            mono
          />
        </Grid>
        <TagsField label="Teknoloji rozetleri" value={hero.badges} onChange={(v) => set("badges", v)} />
      </Panel>

      <Panel title="Bulanıklık efekti" description="Başlık başlangıçta bulanık görünür; imleç hareketiyle netleşir.">
        <Toggle label="Bulanıklık efektini etkinleştir" checked={hero.blur.enabled} onChange={(v) => blur({ enabled: v })} />
        <Grid>
          <SelectField
            label="Tetikleme modu"
            value={hero.blur.mode}
            onChange={(v) => blur({ mode: v })}
            options={[
              { value: "cursor", label: "İmleç spotu — imlecin çevresi netleşir" },
              { value: "hover", label: "Üzerine gelme — başlığın tamamı netleşir" },
            ]}
          />
          <TextField label="İpucu metni" value={hero.blur.hint} onChange={(v) => blur({ hint: v })} maxLength={120} />
        </Grid>
        <Grid cols={3}>
          <RangeField
            label="Bulanıklık yoğunluğu"
            value={hero.blur.intensity}
            min={0}
            max={24}
            unit="px"
            onChange={(v) => blur({ intensity: v })}
          />
          <RangeField
            label="Spot yarıçapı"
            value={hero.blur.radius}
            min={60}
            max={400}
            step={10}
            unit="px"
            onChange={(v) => blur({ radius: v })}
          />
          <RangeField
            label="Otomatik netleşme"
            value={hero.blur.autoRevealSeconds}
            min={0}
            max={60}
            unit=" sn"
            onChange={(v) => blur({ autoRevealSeconds: v })}
          />
        </Grid>
        <p className="text-[11px] text-muted">
          Otomatik netleşme 0 olduğunda başlık yalnızca etkileşimle netleşir. Dokunmatik cihazlarda dokunma ile netleşir.
        </p>
      </Panel>

      <Panel title="Cihaz vitrini" description="Masaüstü, tablet ve mobil çerçeveler içinde sitenin canlı önizlemesi.">
        <Grid>
          <SelectField
            label="Varsayılan öndeki cihaz"
            value={hero.devices.defaultActive}
            onChange={(v) => devices({ defaultActive: v })}
            options={[
              { value: "desktop", label: "Masaüstü" },
              { value: "tablet", label: "Tablet" },
              { value: "mobile", label: "Mobil" },
            ]}
          />
          <TextField
            label="Önizleme yolu"
            value={hero.devices.previewPath}
            onChange={(v) => devices({ previewPath: v })}
            mono
            hint="Örn. / veya /services"
          />
        </Grid>
        <Grid cols={3}>
          <TextField
            label="Masaüstü etiketi"
            value={hero.devices.labels.desktop}
            onChange={(v) => devices({ labels: { ...hero.devices.labels, desktop: v } })}
          />
          <TextField
            label="Tablet etiketi"
            value={hero.devices.labels.tablet}
            onChange={(v) => devices({ labels: { ...hero.devices.labels, tablet: v } })}
          />
          <TextField
            label="Mobil etiketi"
            value={hero.devices.labels.mobile}
            onChange={(v) => devices({ labels: { ...hero.devices.labels, mobile: v } })}
          />
        </Grid>
        <TextField label="Vitrin ipucu" value={hero.devices.hint} onChange={(v) => devices({ hint: v })} maxLength={160} />
        <Toggle
          label="Cihaz seçici ve ipucunu göster"
          checked={hero.devices.showLabels}
          onChange={(v) => devices({ showLabels: v })}
        />
      </Panel>
    </div>
  );
}

/* ---------- 3. İstatistikler ---------- */

export function StatsTab({ value: stats, onChange }: TabProps<StatsSettings>) {
  const updateItem = (index: 0 | 1, patch: Partial<StatsSettings["items"][0]>) => {
    const items = [...stats.items] as StatsSettings["items"];
    items[index] = { ...items[index], ...patch };
    onChange({ ...stats, items });
  };

  return (
    <div className="space-y-6">
      <Panel title="Bölüm başlığı">
        <Grid>
          <TextField label="Üst etiket" value={stats.eyebrow} onChange={(v) => onChange({ ...stats, eyebrow: v })} />
          <TextField label="Başlık" value={stats.title} onChange={(v) => onChange({ ...stats, title: v })} />
        </Grid>
      </Panel>
      <div className="grid gap-6 xl:grid-cols-2">
        {([0, 1] as const).map((i) => {
          const item = stats.items[i];
          return (
            <Panel
              key={item.id}
              title={`İstatistik ${i + 1}`}
              description="Gerçekçi, doğrulanabilir değerler kullanmanız önerilir."
            >
              <Grid>
                <TextField label="Değer" value={item.value} onChange={(v) => updateItem(i, { value: v })} maxLength={12} mono />
                <TextField
                  label="Sonek"
                  value={item.suffix}
                  onChange={(v) => updateItem(i, { suffix: v })}
                  maxLength={6}
                  hint="Örn. +"
                />
              </Grid>
              <TextField label="Etiket" value={item.label} onChange={(v) => updateItem(i, { label: v })} maxLength={80} />
              <TextField
                label="Açıklama"
                multiline
                rows={2}
                value={item.description}
                onChange={(v) => updateItem(i, { description: v })}
                maxLength={240}
              />
              <IconField value={item.icon} onChange={(v) => updateItem(i, { icon: v })} />
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Bölüm & Sayfa Metinleri ---------- */

function SectionCopyEditor({ copy, onChange }: { copy: SectionCopy; onChange: (v: SectionCopy) => void }) {
  const set = <K extends keyof SectionCopy>(key: K, v: SectionCopy[K]) => onChange({ ...copy, [key]: v });
  return (
    <>
      <Grid>
        <TextField label="Üst etiket" value={copy.eyebrow} onChange={(v) => set("eyebrow", v)} maxLength={80} />
        <TextField label="Başlık" value={copy.title} onChange={(v) => set("title", v)} maxLength={160} />
      </Grid>
      <TextField
        label="Açıklama"
        multiline
        rows={2}
        value={copy.description}
        onChange={(v) => set("description", v)}
        maxLength={400}
      />
      <Grid>
        <TextField
          label="Bağlantı metni"
          value={copy.linkLabel}
          onChange={(v) => set("linkLabel", v)}
          hint="Boş bırakılırsa gizlenir"
        />
        <TextField label="Bağlantı hedefi" value={copy.linkHref} onChange={(v) => set("linkHref", v)} mono />
      </Grid>
    </>
  );
}

function PageCopyEditor({ copy, onChange }: { copy: PageCopy; onChange: (v: PageCopy) => void }) {
  const set = <K extends keyof PageCopy>(key: K, v: PageCopy[K]) => onChange({ ...copy, [key]: v });
  return (
    <>
      <Grid>
        <TextField label="Üst etiket" value={copy.eyebrow} onChange={(v) => set("eyebrow", v)} maxLength={80} />
        <TextField label="Sayfa başlığı (H1)" value={copy.title} onChange={(v) => set("title", v)} maxLength={160} />
      </Grid>
      <TextField
        label="Giriş metni"
        multiline
        rows={2}
        value={copy.description}
        onChange={(v) => set("description", v)}
        maxLength={500}
      />
      <Grid>
        <TextField label="SEO başlığı" value={copy.metaTitle} onChange={(v) => set("metaTitle", v)} maxLength={70} />
        <TextField
          label="SEO açıklaması"
          value={copy.metaDescription}
          onChange={(v) => set("metaDescription", v)}
          maxLength={200}
        />
      </Grid>
    </>
  );
}

const SECTION_NAMES: Record<keyof HomeSections, string> = {
  services: "Ana sayfa · Hizmetler",
  about: "Ana sayfa · Hakkımızda özeti",
  projects: "Ana sayfa · Proje karuseli",
  blog: "Ana sayfa · Blog",
  contact: "Ana sayfa · İletişim",
};

const PAGE_NAMES: Record<keyof PagesSettings, string> = {
  services: "/services · Hizmetlerimiz",
  portfolio: "/portfolio · Portfolyomuz",
  blog: "/blog · Blog",
  pricing: "/pricing · Fiyatlandırma",
  about: "/about · Hakkımızda",
  contact: "/contact · İletişim",
};

export function CopyTab({
  sections,
  pages,
  onSections,
  onPages,
}: {
  sections: HomeSections;
  pages: PagesSettings;
  onSections: (v: HomeSections) => void;
  onPages: (v: PagesSettings) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 2xl:grid-cols-2">
        {(Object.keys(SECTION_NAMES) as (keyof HomeSections)[]).map((key) => (
          <Panel key={key} title={SECTION_NAMES[key]}>
            <SectionCopyEditor copy={sections[key]} onChange={(v) => onSections({ ...sections, [key]: v })} />
          </Panel>
        ))}
      </div>
      <div className="grid gap-6 2xl:grid-cols-2">
        {(Object.keys(PAGE_NAMES) as (keyof PagesSettings)[]).map((key) => (
          <Panel key={key} title={PAGE_NAMES[key]} description="Sayfa başlığı ve arama motoru meta verileri">
            <PageCopyEditor copy={pages[key]} onChange={(v) => onPages({ ...pages, [key]: v })} />
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ---------- İletişim sayfası ---------- */

export function ContactTab({ value: contact, onChange }: TabProps<ContactSettings>) {
  const set = <K extends keyof ContactSettings>(key: K, v: ContactSettings[K]) => onChange({ ...contact, [key]: v });
  const form = (patch: Partial<ContactSettings["form"]>) => set("form", { ...contact.form, ...patch });

  return (
    <div className="space-y-6">
      <Panel title="Çalışma saatleri">
        <ListEditor
          items={contact.businessHours}
          onChange={(v) => set("businessHours", v)}
          getKey={(i) => i.id}
          getTitle={(i) => i.day}
          getSubtitle={(i) => i.hours}
          createItem={() => ({ id: uid("bh"), day: "Gün", hours: "09:00 – 18:00" })}
          addLabel="Satır ekle"
          maxItems={10}
          renderItem={(item, update) => (
            <Grid>
              <TextField label="Gün(ler)" value={item.day} onChange={(v) => update({ day: v })} />
              <TextField label="Saatler" value={item.hours} onChange={(v) => update({ hours: v })} />
            </Grid>
          )}
        />
        <TextField
          label="Yanıt süresi notu"
          multiline
          rows={2}
          value={contact.responseNote}
          onChange={(v) => set("responseNote", v)}
          maxLength={300}
        />
      </Panel>

      <Panel title="Operasyonel detaylar" description="/contact sayfasındaki bilgi kartları">
        <ListEditor
          items={contact.details}
          onChange={(v) => set("details", v)}
          getKey={(i) => i.id}
          getTitle={(i) => i.title}
          createItem={() => ({ id: uid("od"), title: "Yeni detay", description: "", icon: "clock" })}
          duplicateItem={(i) => ({ ...i, id: uid("od"), title: `${i.title} (kopya)` })}
          addLabel="Detay kartı ekle"
          maxItems={8}
          renderItem={(item, update) => (
            <>
              <Grid>
                <TextField label="Başlık" value={item.title} onChange={(v) => update({ title: v })} />
                <IconField value={item.icon} onChange={(v) => update({ icon: v })} />
              </Grid>
              <TextField
                label="Açıklama"
                multiline
                rows={2}
                value={item.description}
                onChange={(v) => update({ description: v })}
                maxLength={400}
              />
            </>
          )}
        />
      </Panel>

      <Panel title="İletişim formu metinleri">
        <Grid>
          <TextField label="Ad alanı etiketi" value={contact.form.nameLabel} onChange={(v) => form({ nameLabel: v })} />
          <TextField
            label="Ad alanı yer tutucusu"
            value={contact.form.namePlaceholder}
            onChange={(v) => form({ namePlaceholder: v })}
          />
          <TextField label="E-posta etiketi" value={contact.form.emailLabel} onChange={(v) => form({ emailLabel: v })} />
          <TextField
            label="E-posta yer tutucusu"
            value={contact.form.emailPlaceholder}
            onChange={(v) => form({ emailPlaceholder: v })}
          />
          <TextField label="Mesaj etiketi" value={contact.form.messageLabel} onChange={(v) => form({ messageLabel: v })} />
          <TextField label="Gönder butonu" value={contact.form.submitLabel} onChange={(v) => form({ submitLabel: v })} />
        </Grid>
        <TextField
          label="Mesaj yer tutucusu"
          multiline
          rows={2}
          value={contact.form.messagePlaceholder}
          onChange={(v) => form({ messagePlaceholder: v })}
        />
        <TextField
          label="Onay metni (KVKK)"
          multiline
          rows={2}
          value={contact.form.consentText}
          onChange={(v) => form({ consentText: v })}
          hint="Boş bırakılırsa onay kutusu gizlenir"
        />
        <Grid>
          <TextField
            label="Başarı bildirimi"
            multiline
            rows={2}
            value={contact.form.successMessage}
            onChange={(v) => form({ successMessage: v })}
          />
          <TextField
            label="Hata bildirimi"
            multiline
            rows={2}
            value={contact.form.errorMessage}
            onChange={(v) => form({ errorMessage: v })}
          />
        </Grid>
      </Panel>
    </div>
  );
}

/* ---------- Hakkımızda ---------- */

export function AboutTab({ value: about, onChange }: TabProps<AboutSettings>) {
  const set = <K extends keyof AboutSettings>(key: K, v: AboutSettings[K]) => onChange({ ...about, [key]: v });

  return (
    <div className="space-y-6">
      <Panel title="Hikâye">
        <TextField label="Hikâye başlığı" value={about.storyTitle} onChange={(v) => set("storyTitle", v)} />
        <MarkdownEditor label="Hikâye içeriği" value={about.story} onChange={(v) => set("story", v)} />
        <SummaryField
          label="Özet paragraf (ana sayfa ve /about)"
          value={about.summary}
          onChange={(v) => set("summary", v)}
          source={about.story}
          maxLength={600}
          maxSentences={3}
        />
      </Panel>

      <Panel title="Değerler">
        <TextField label="Bölüm başlığı" value={about.valuesTitle} onChange={(v) => set("valuesTitle", v)} />
        <ListEditor
          items={about.values}
          onChange={(v) => set("values", v)}
          getKey={(i) => i.id}
          getTitle={(i) => i.title}
          createItem={() => ({ id: uid("va"), title: "Yeni değer", description: "", icon: "sparkles" })}
          duplicateItem={(i) => ({ ...i, id: uid("va"), title: `${i.title} (kopya)` })}
          addLabel="Değer ekle"
          maxItems={12}
          renderItem={(item, update) => (
            <>
              <Grid>
                <TextField label="Başlık" value={item.title} onChange={(v) => update({ title: v })} />
                <IconField value={item.icon} onChange={(v) => update({ icon: v })} />
              </Grid>
              <TextField
                label="Açıklama"
                multiline
                rows={2}
                value={item.description}
                onChange={(v) => update({ description: v })}
                maxLength={300}
              />
            </>
          )}
        />
      </Panel>

      <Panel title="Teknoloji yığını">
        <TextField label="Bölüm başlığı" value={about.stackTitle} onChange={(v) => set("stackTitle", v)} />
        <ListEditor
          items={about.techStack}
          onChange={(v) => set("techStack", v)}
          getKey={(i) => i.id}
          getTitle={(i) => i.category}
          getSubtitle={(i) => i.items.join(", ")}
          createItem={() => ({ id: uid("ts"), category: "Yeni kategori", items: [] })}
          addLabel="Kategori ekle"
          maxItems={12}
          renderItem={(item, update) => (
            <>
              <TextField label="Kategori" value={item.category} onChange={(v) => update({ category: v })} />
              <TagsField label="Teknolojiler" value={item.items} onChange={(v) => update({ items: v })} />
            </>
          )}
        />
      </Panel>

      <Panel title="Çalışma süreci">
        <TextField label="Bölüm başlığı" value={about.processTitle} onChange={(v) => set("processTitle", v)} />
        <ListEditor
          items={about.process}
          onChange={(v) => set("process", v)}
          getKey={(i) => i.id}
          getTitle={(i) => i.title}
          createItem={() => ({ id: uid("ps"), title: "Yeni adım", description: "" })}
          addLabel="Adım ekle"
          maxItems={12}
          renderItem={(item, update) => (
            <>
              <TextField label="Adım adı" value={item.title} onChange={(v) => update({ title: v })} />
              <TextField
                label="Açıklama"
                multiline
                rows={2}
                value={item.description}
                onChange={(v) => update({ description: v })}
                maxLength={300}
              />
            </>
          )}
        />
      </Panel>
    </div>
  );
}

/* ---------- Analitik (Google Analytics 4) ---------- */

export function AnalyticsTab({ value: analytics, onChange }: TabProps<AnalyticsSettings>) {
  const set = <K extends keyof AnalyticsSettings>(key: K, v: AnalyticsSettings[K]) => onChange({ ...analytics, [key]: v });
  const consent = (patch: Partial<AnalyticsSettings["consent"]>) => set("consent", { ...analytics.consent, ...patch });
  const extracted = extractMeasurementId(analytics.measurementId);
  const pastedSnippet = analytics.measurementId.trim() !== "" && analytics.measurementId.trim() !== extracted;
  const live = analytics.enabled && Boolean(extracted);

  return (
    <div className="space-y-6">
      <Panel
        title="Google Analytics 4"
        description="Ölçüm Kimliğini girin veya Google'ın verdiği kod parçacığının tamamını yapıştırın; kimlik otomatik olarak ayıklanır."
      >
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-5",
            live ? "border-primary/40 bg-primary/5 text-fg" : "border-line bg-deep/60 text-muted",
          )}
        >
          {live ? (
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warm" aria-hidden="true" />
          )}
          <span>
            {live
              ? `Kaydettiğinizde ${extracted} kimliği ile ölçüm tüm herkese açık sayfalarda etkinleşir${
                  analytics.requireConsent ? " (ziyaretçi çerez onayı verdikten sonra)" : ""
                }.`
              : analytics.enabled
                ? "Geçerli bir Ölçüm Kimliği bulunamadı. Kimlik G- ile başlar, ör. G-ABC123XYZ9."
                : "Analitik şu anda kapalı; sitede hiçbir Google betiği yüklenmez."}
          </span>
        </div>

        <Toggle label="Google Analytics'i etkinleştir" checked={analytics.enabled} onChange={(v) => set("enabled", v)} />

        <TextField
          label="Ölçüm Kimliği veya Google etiket kodu"
          value={analytics.measurementId}
          onChange={(v) => set("measurementId", v)}
          multiline
          rows={pastedSnippet ? 5 : 1}
          mono
          placeholder="G-ABC123XYZ9"
          hint="GA4 › Yönetici › Veri akışları › Web akışı"
        />
        {pastedSnippet && extracted ? (
          <p className="flex items-center gap-2 text-xs text-primary">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Kod parçacığından ayıklanan kimlik: <span className="font-mono">{extracted}</span> — kaydettiğinizde yalnızca bu
            kimlik saklanır.
            <button type="button" onClick={() => set("measurementId", extracted)} className="underline underline-offset-2">
              Alanı sadeleştir
            </button>
          </p>
        ) : null}

        <Toggle
          label="Çerez onayı iste (KVKK — önerilir)"
          description="Açıkken Google Analytics, ziyaretçi banner'da 'Kabul et' diyene kadar hiç yüklenmez. Footer'a 'Çerez Tercihleri' bağlantısı eklenir."
          checked={analytics.requireConsent}
          onChange={(v) => set("requireConsent", v)}
        />

        <ul className="space-y-1.5 rounded-xl border border-line bg-deep/60 px-4 py-3 text-[11px] leading-5 text-muted">
          <li>• Yönetim paneli ve cihaz vitrinindeki önizlemeler ölçülmez.</li>
          <li>
            • Sayfa geçişleri GA4&apos;ün <span className="text-fg">Gelişmiş ölçüm › Tarayıcı geçmişi olayları</span> ayarıyla
            otomatik ölçülür (varsayılan olarak açıktır).
          </li>
          <li>
            • Ek olaylar: <span className="font-mono text-fg">generate_lead</span> (iletişim formu),{" "}
            <span className="font-mono text-fg">pricing_quote_request</span>,{" "}
            <span className="font-mono text-fg">pricing_package_select</span>.
          </li>
          <li>• Doğrulama: siteyi açıp onay verin, ardından GA4 › Raporlar › Gerçek zamanlı ekranını kontrol edin.</li>
        </ul>
      </Panel>

      <Panel title="Çerez onayı banner'ı" description="Onay istendiğinde sitenin altında gösterilen metinler.">
        <TextField label="Başlık" value={analytics.consent.title} onChange={(v) => consent({ title: v })} maxLength={80} />
        <TextField
          label="Açıklama"
          multiline
          rows={3}
          value={analytics.consent.text}
          onChange={(v) => consent({ text: v })}
          maxLength={500}
        />
        <Grid cols={3}>
          <TextField label="Kabul butonu" value={analytics.consent.acceptLabel} onChange={(v) => consent({ acceptLabel: v })} />
          <TextField label="Ret butonu" value={analytics.consent.rejectLabel} onChange={(v) => consent({ rejectLabel: v })} />
          <TextField
            label="Footer bağlantısı"
            value={analytics.consent.settingsLabel}
            onChange={(v) => consent({ settingsLabel: v })}
          />
        </Grid>
      </Panel>
    </div>
  );
}
