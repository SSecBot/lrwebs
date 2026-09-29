"use client";

import {
  ArchiveRestore,
  BarChart3,
  ChartLine,
  Briefcase,
  CircleAlert,
  ExternalLink,
  Inbox,
  Layers,
  LoaderCircle,
  LogOut,
  Mail,
  Monitor,
  Newspaper,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Tags,
  Type,
  TypeOutline,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { logoutAction, saveSectionsAction } from "@/app/actions/admin";
import { BackupTab } from "@/components/admin/backup-tab";
import { TypographyTab } from "@/components/admin/typography-tab";
import { BlogTab, LegalTab, MessagesTab, PricingTab, ProjectsTab, ServicesTab } from "@/components/admin/tabs-collections";
import { AboutTab, AnalyticsTab, ContactTab, CopyTab, GeneralTab, HeroTab, StatsTab } from "@/components/admin/tabs-settings";
import { useToast } from "@/components/ui/toast";
import { contentHash } from "@/lib/hash";
import { cn } from "@/lib/utils";
import type { CmsSectionKey, CmsStore, ContactMessage, GeneralSettings, LegalSettings } from "@/types/cms";

type TabId =
  | "general"
  | "hero"
  | "stats"
  | "services"
  | "projects"
  | "blog"
  | "pricing"
  | "legal"
  | "about"
  | "contact"
  | "copy"
  | "analytics"
  | "typography"
  | "backup"
  | "messages";

const TABS: { id: TabId; label: string; icon: LucideIcon; keys: CmsSectionKey[]; group: "İçerik" | "Site" | "Gelen Kutusu" }[] = [
  { id: "general", label: "Genel Ayarlar", icon: Settings, keys: ["general", "contact"], group: "Site" },
  { id: "hero", label: "Hero & Cihaz Vitrini", icon: Monitor, keys: ["hero"], group: "Site" },
  { id: "stats", label: "İstatistikler", icon: BarChart3, keys: ["stats"], group: "Site" },
  { id: "services", label: "Hizmetler", icon: Layers, keys: ["services"], group: "İçerik" },
  { id: "projects", label: "Portfolyo / Projeler", icon: Briefcase, keys: ["projects"], group: "İçerik" },
  { id: "blog", label: "Blog Yönetimi", icon: Newspaper, keys: ["blog"], group: "İçerik" },
  { id: "pricing", label: "Fiyatlandırma", icon: Tags, keys: ["pricing"], group: "İçerik" },
  { id: "legal", label: "Yasal Metinler & KVKK", icon: ShieldCheck, keys: ["legal"], group: "İçerik" },
  { id: "about", label: "Hakkımızda", icon: Users, keys: ["about"], group: "İçerik" },
  { id: "contact", label: "İletişim & Form", icon: Mail, keys: ["contact"], group: "Site" },
  { id: "copy", label: "Bölüm & Sayfa Metinleri", icon: Type, keys: ["sections", "pages"], group: "Site" },
  { id: "typography", label: "Yazı Tipleri", icon: TypeOutline, keys: ["typography"], group: "Site" },
  { id: "analytics", label: "Analitik (GA4)", icon: ChartLine, keys: ["analytics"], group: "Site" },
  { id: "backup", label: "Yedekleme", icon: ArchiveRestore, keys: [], group: "Site" },
  { id: "messages", label: "Gelen Mesajlar", icon: Inbox, keys: [], group: "Gelen Kutusu" },
];

const GROUP_ORDER = ["Site", "İçerik", "Gelen Kutusu"] as const;

export function AdminDashboard({ initialStore, initialMessages }: { initialStore: CmsStore; initialMessages: ContactMessage[] }) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(initialStore);
  const [cms, setCms] = useState(initialStore);
  const [messages, setMessages] = useState(initialMessages);
  const [tab, setTab] = useState<TabId>("general");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [loggingOut, startLogout] = useTransition();

  const dirtyKeys = useMemo(
    () =>
      (Object.keys(cms) as (keyof CmsStore)[]).filter(
        (k): k is CmsSectionKey => k !== "updatedAt" && JSON.stringify(cms[k]) !== JSON.stringify(saved[k]),
      ),
    [cms, saved],
  );
  const isDirty = dirtyKeys.length > 0;
  const unread = messages.filter((m) => !m.read).length;

  const set =
    <K extends CmsSectionKey>(key: K) =>
    (value: CmsStore[K]) =>
      setCms((c) => ({ ...c, [key]: value }));

  const save = () => {
    if (!isDirty || saving) return;
    const sent = cms;
    const patch = Object.fromEntries(dirtyKeys.map((k) => [k, cms[k]]));
    // Düzenlemenin başladığı sürümün özetleri: sunucu bu arada değişmişse kayıt reddedilir.
    const base = Object.fromEntries(dirtyKeys.map((k) => [k, contentHash(saved[k])]));
    startSaving(async () => {
      try {
        const result = await saveSectionsAction(patch, base);
        if (result.ok && result.data) {
          const store = result.data.store;
          setSaved(store);
          // Sunucuda temizlenmiş değerleri forma yansıt; kayıt sürerken yapılan yeni düzenlemeleri koru.
          setCms((current) => {
            const next = { ...current, updatedAt: store.updatedAt };
            for (const k of Object.keys(store) as CmsSectionKey[]) {
              if (k in sent && JSON.stringify(current[k]) === JSON.stringify(sent[k])) {
                (next as Record<string, unknown>)[k] = store[k];
              }
            }
            return next;
          });
          setErrors({});
          toast.success(result.message);
        } else {
          setErrors(result.ok ? {} : (result.fieldErrors ?? {}));
          toast.error(result.message);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        toast.error(
          message.includes("Yetkisiz")
            ? "Oturum süresi doldu. Lütfen yeniden giriş yapın."
            : "Kaydetme sırasında bir hata oluştu.",
        );
        if (message.includes("Yetkisiz")) router.refresh();
      }
    });
  };

  const discard = () => {
    setCms(saved);
    setErrors({});
    toast.info("Kaydedilmemiş değişiklikler geri alındı.");
  };

  /*
   * Yükleme uç noktası veriyi doğrudan kaydeder. Kaydedilmiş sürüm sunucudakiyle birebir
   * eşitlenir; formda yalnızca yüklemenin değiştirdiği alanlar güncellenir, böylece
   * kaydedilmemiş diğer düzenlemeler korunur ve sonraki kayıtta sahte çakışma oluşmaz.
   */
  const onLegalSynced = (legal: LegalSettings) => {
    setSaved((s) => ({ ...s, legal }));
    setCms((c) => ({
      ...c,
      legal: {
        privacy: { ...c.legal.privacy, pdfUrl: legal.privacy.pdfUrl, updatedAt: legal.privacy.updatedAt },
        kvkk: { ...c.legal.kvkk, pdfUrl: legal.kvkk.pdfUrl, updatedAt: legal.kvkk.updatedAt },
      },
    }));
  };

  const onGeneralSynced = (general: GeneralSettings) => {
    setSaved((s) => ({ ...s, general }));
    setCms((c) => ({ ...c, general: { ...c.general, faviconUrl: general.faviconUrl } }));
  };

  // Ctrl/Cmd + S ile kaydet, kaydedilmemiş değişiklik varken sayfadan ayrılmayı uyar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        document.getElementById("admin-save")?.click();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [isDirty]);

  const logout = () =>
    startLogout(async () => {
      await logoutAction();
      router.refresh();
    });

  const active = TABS.find((t) => t.id === tab)!;
  const tabDirty = (t: (typeof TABS)[number]) => t.keys.some((k) => dirtyKeys.includes(k));

  return (
    <div className="min-h-dvh bg-deep">
      {/* Üst çubuk */}
      <header className="sticky top-0 z-40 border-b border-line bg-deep/90 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <span className="font-brand text-sm text-fg">
            {saved.general.brandName.slice(0, 2)}
            <span className="text-primary">{saved.general.brandName.slice(2)}</span>
            <span className="ml-2 hidden font-normal text-muted sm:inline">/ Yönetim Paneli</span>
          </span>
          <span className="flex-1" />
          {isDirty ? (
            <span className="hidden items-center gap-1.5 text-xs text-warm md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-warm" aria-hidden="true" />
              {dirtyKeys.length} bölümde kaydedilmemiş değişiklik
            </span>
          ) : (
            <span className="hidden text-xs text-muted md:inline">
              Son kayıt:{" "}
              {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(saved.updatedAt))}
            </span>
          )}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition hover:text-fg"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Siteyi görüntüle</span>
          </a>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition hover:border-red-500/50 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sekmeler: masaüstünde kenar çubuğu, mobilde yatay kaydırma */}
        <nav
          aria-label="Yönetim bölümleri"
          className="no-scrollbar sticky top-14 z-30 flex gap-1 overflow-x-auto border-b border-line bg-deep/95 px-3 py-2 backdrop-blur lg:h-[calc(100dvh-3.5rem)] lg:flex-col lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-3 lg:py-5"
        >
          {GROUP_ORDER.map((group) => (
            <div key={group} className="contents lg:mb-4 lg:block">
              <p className="hidden px-3 pb-2 font-mono text-[10px] tracking-widest text-muted/70 uppercase lg:block">{group}</p>
              {TABS.filter((t) => t.group === group).map((t) => {
                const Icon = t.icon;
                const selected = t.id === tab;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-current={selected ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition lg:w-full lg:text-[13px]",
                      selected ? "bg-surface text-fg" : "text-muted hover:bg-surface/60 hover:text-fg",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", selected && "text-primary")} aria-hidden="true" />
                    <span className="flex-1 whitespace-nowrap">{t.label}</span>
                    {tabDirty(t) ? <span className="h-1.5 w-1.5 rounded-full bg-warm" aria-label="kaydedilmemiş" /> : null}
                    {t.id === "messages" && unread > 0 ? (
                      <span className="rounded-full bg-primary px-1.5 font-mono text-[10px] text-deep">{unread}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <main className="min-w-0 px-4 pt-6 pb-32 sm:px-6 lg:px-10 lg:pt-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-center gap-3">
              <active.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h1 className="font-display text-lg text-fg sm:text-xl">{active.label}</h1>
            </div>

            {Object.keys(errors).length > 0 ? (
              <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/5 p-4" role="alert">
                <p className="flex items-center gap-2 text-sm font-medium text-red-300">
                  <CircleAlert className="h-4 w-4" aria-hidden="true" />
                  Kaydetme engellendi — aşağıdaki alanları düzeltin:
                </p>
                <ul className="mt-2 space-y-1 text-xs text-red-200/90">
                  {Object.entries(errors).map(([path, message]) => (
                    <li key={path}>
                      <span className="font-mono text-red-300">{path}</span>: {message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {tab === "general" && (
              <GeneralTab
                general={cms.general}
                contact={cms.contact}
                onGeneral={set("general")}
                onContact={set("contact")}
                onGeneralSynced={onGeneralSynced}
              />
            )}
            {tab === "hero" && <HeroTab value={cms.hero} onChange={set("hero")} />}
            {tab === "stats" && <StatsTab value={cms.stats} onChange={set("stats")} />}
            {tab === "services" && <ServicesTab value={cms.services} onChange={set("services")} />}
            {tab === "projects" && <ProjectsTab value={cms.projects} onChange={set("projects")} />}
            {tab === "blog" && <BlogTab value={cms.blog} onChange={set("blog")} />}
            {tab === "pricing" && <PricingTab value={cms.pricing} onChange={set("pricing")} />}
            {tab === "legal" && <LegalTab value={cms.legal} onChange={set("legal")} onSynced={onLegalSynced} />}
            {tab === "about" && <AboutTab value={cms.about} onChange={set("about")} />}
            {tab === "contact" && <ContactTab value={cms.contact} onChange={set("contact")} />}
            {tab === "copy" && (
              <CopyTab sections={cms.sections} pages={cms.pages} onSections={set("sections")} onPages={set("pages")} />
            )}
            {tab === "analytics" && <AnalyticsTab value={cms.analytics} onChange={set("analytics")} />}
            {tab === "typography" && <TypographyTab value={cms.typography} onChange={set("typography")} />}
            {tab === "backup" && <BackupTab isDirty={isDirty} />}
            {tab === "messages" && <MessagesTab messages={messages} onChange={setMessages} />}
          </div>
        </main>
      </div>

      {/* Kaydetme çubuğu */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur transition-transform duration-300 lg:left-[260px]",
          isDirty ? "translate-y-0" : "translate-y-full",
        )}
        aria-hidden={!isDirty}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <p className="text-xs text-muted">
            Kaydedilmemiş değişiklikler var. Kaydettiğinizde site anında güncellenir.{" "}
            <kbd className="rounded border border-line px-1 font-mono text-[10px]">Ctrl</kbd>+
            <kbd className="rounded border border-line px-1 font-mono text-[10px]">S</kbd>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={discard}
              disabled={saving}
              tabIndex={isDirty ? 0 : -1}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs text-muted transition hover:text-fg sm:flex-none"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Geri al
            </button>
            <button
              id="admin-save"
              type="button"
              onClick={save}
              disabled={saving || !isDirty}
              tabIndex={isDirty ? 0 : -1}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-deep transition hover:bg-[#22c3de] disabled:opacity-60 sm:flex-none"
            >
              {saving ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Değişiklikleri kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
