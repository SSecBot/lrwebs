/**
 * LrWebs CMS veri modeli.
 * data/cms-store.json dosyasının tamamı `CmsStore` arayüzüne karşılık gelir.
 */

export type DeviceKind = "desktop" | "tablet" | "mobile";
export type BlurMode = "hover" | "cursor";
export type SocialPlatform = "github" | "linkedin" | "x" | "instagram" | "youtube" | "dribbble" | "website";

export interface LinkAction {
  label: string;
  href: string;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  visible: boolean;
}

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  visible: boolean;
}

export interface GeneralSettings {
  brandName: string;
  /** Ana sayfada tarayıcı sekmesinde görünen başlık (varsayılan <title>). */
  siteTitle: string;
  /** Alt sayfalar için başlık şablonu; "%s" sayfa adıyla değiştirilir (ör. "%s | LrWebs"). */
  titleTemplate: string;
  /** Sekme ikonu: /favicon.svg, /favicon.ico, yüklenen dosya (/api/uploads/…) veya https:// adresi. */
  faviconUrl: string;
  siteTagline: string;
  siteDescription: string;
  siteUrl: string;
  keywords: string[];
  navigation: NavItem[];
  drawerNote: string;
  footer: {
    description: string;
    copyright: string;
    privacyLabel: string;
    kvkkLabel: string;
  };
}

export interface BusinessHour {
  id: string;
  day: string;
  hours: string;
}

export interface OperationalDetail {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface ContactSettings {
  email: string;
  phone: string;
  address: string;
  responseNote: string;
  businessHours: BusinessHour[];
  details: OperationalDetail[];
  socials: SocialLink[];
  form: {
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    consentText: string;
    submitLabel: string;
    successMessage: string;
    errorMessage: string;
  };
}

export interface HeroSettings {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  description: string;
  primaryCta: LinkAction;
  secondaryCta: LinkAction;
  badges: string[];
  blur: {
    enabled: boolean;
    mode: BlurMode;
    intensity: number;
    radius: number;
    autoRevealSeconds: number;
    hint: string;
  };
  devices: {
    defaultActive: DeviceKind;
    previewPath: string;
    showLabels: boolean;
    hint: string;
    labels: Record<DeviceKind, string>;
  };
}

export interface StatItem {
  id: string;
  value: string;
  suffix: string;
  label: string;
  description: string;
  icon: string;
}

export interface StatsSettings {
  eyebrow: string;
  title: string;
  items: [StatItem, StatItem];
}

export interface SectionCopy {
  eyebrow: string;
  title: string;
  description: string;
  linkLabel: string;
  linkHref: string;
}

export interface HomeSections {
  services: SectionCopy;
  about: SectionCopy;
  projects: SectionCopy;
  blog: SectionCopy;
  contact: SectionCopy;
}

export interface PageCopy {
  eyebrow: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
}

export interface PagesSettings {
  services: PageCopy;
  portfolio: PageCopy;
  blog: PageCopy;
  pricing: PageCopy;
  about: PageCopy;
  contact: PageCopy;
}

export interface Service {
  id: string;
  slug: string;
  title: string;
  icon: string;
  summary: string;
  content: string;
  features: string[];
  duration: string;
  visible: boolean;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  client: string;
  category: string;
  year: string;
  summary: string;
  content: string;
  tags: string[];
  liveUrl: string;
  coverImage: string;
  visible: boolean;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  coverImage: string;
  publishedAt: string;
  visible: boolean;
}

export interface PricingPackage {
  id: string;
  name: string;
  description: string;
  priceMin: number;
  priceMax: number;
  timeline: string;
  features: string[];
  highlighted: boolean;
  ctaLabel: string;
  ctaHref: string;
  visible: boolean;
}

export interface PricingAddon {
  id: string;
  label: string;
  description: string;
  priceMin: number;
  priceMax: number;
  visible: boolean;
}

export interface PricingSettings {
  currency: string;
  builderTitle: string;
  builderDescription: string;
  extraPageLabel: string;
  extraPagePrice: number;
  maxExtraPages: number;
  rushLabel: string;
  rushMultiplier: number;
  note: string;
  summaryCtaLabel: string;
  summaryCtaHref: string;
  packages: PricingPackage[];
  addons: PricingAddon[];
}

export interface ValueItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface TechGroup {
  id: string;
  category: string;
  items: string[];
}

export interface ProcessStep {
  id: string;
  title: string;
  description: string;
}

export interface AboutSettings {
  summary: string;
  storyTitle: string;
  story: string;
  valuesTitle: string;
  values: ValueItem[];
  stackTitle: string;
  techStack: TechGroup[];
  processTitle: string;
  process: ProcessStep[];
}

export interface LegalDocument {
  title: string;
  content: string;
  pdfUrl: string;
  updatedAt: string;
}

export interface LegalSettings {
  privacy: LegalDocument;
  kvkk: LegalDocument;
}

/** Google Analytics 4. Yalnızca Ölçüm Kimliği saklanır; ham betik kodu asla saklanmaz/gömülmez. */
export interface AnalyticsSettings {
  enabled: boolean;
  /** GA4 Ölçüm Kimliği, ör. "G-ABC123XYZ9". */
  measurementId: string;
  /** Açıksa (önerilen, KVKK) analitik yalnızca ziyaretçi çerez onayı verdikten sonra yüklenir. */
  requireConsent: boolean;
  consent: {
    title: string;
    text: string;
    acceptLabel: string;
    rejectLabel: string;
    settingsLabel: string;
  };
}

export interface CmsStore {
  general: GeneralSettings;
  contact: ContactSettings;
  hero: HeroSettings;
  stats: StatsSettings;
  sections: HomeSections;
  pages: PagesSettings;
  services: Service[];
  projects: Project[];
  blog: BlogPost[];
  pricing: PricingSettings;
  about: AboutSettings;
  legal: LegalSettings;
  analytics: AnalyticsSettings;
  updatedAt: string;
}

export type CmsSectionKey = Exclude<keyof CmsStore, "updatedAt">;

export type LegalKind = keyof LegalSettings;

/** Fiyatlandırma sayfasından gelen seçimlerin, gönderim anındaki fiyatlarla dondurulmuş özeti. */
export interface QuoteSnapshot {
  packageId: string;
  packageName: string;
  timeline: string;
  addons: string[];
  extraPages: number;
  rush: boolean;
  rushLabel: string;
  lines: { label: string; min: number; max: number }[];
  min: number;
  max: number;
  currency: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  read: boolean;
  /** Fiyatlandırma üzerinden gelindiyse seçilen paket ve tahmini bütçe. */
  quote?: QuoteSnapshot;
}

export type ActionResult<T = undefined> =
  { ok: true; message: string; data?: T } | { ok: false; message: string; fieldErrors?: Record<string, string> };
