import { z } from "zod";
import { isSafeSitePath, isSafeUrl, isValidEmail, sanitizeRichText, sanitizeText } from "@/lib/sanitize";
import { isSafeIconUrl } from "@/lib/site-identity";
import type {
  AboutSettings,
  BlogPost,
  CmsSectionKey,
  CmsStore,
  ContactSettings,
  GeneralSettings,
  HeroSettings,
  HomeSections,
  LegalSettings,
  PagesSettings,
  PricingSettings,
  Project,
  Service,
  StatsSettings,
} from "@/types/cms";

/* ---------- Temel alan tipleri ---------- */

const text = (max = 300) => z.string().max(max, `En fazla ${max} karakter olabilir.`).transform(sanitizeText);
const required = (max = 300) =>
  z
    .string()
    .max(max, `En fazla ${max} karakter olabilir.`)
    .transform(sanitizeText)
    .refine((v) => v.length > 0, "Bu alan boş bırakılamaz.");
const rich = (max = 60_000) => z.string().max(max, `En fazla ${max} karakter olabilir.`).transform(sanitizeRichText);
const url = () =>
  z
    .string()
    .max(600)
    .transform(sanitizeText)
    .refine(isSafeUrl, "Geçersiz bağlantı. Yalnızca /yol, https://, mailto: veya tel: kullanılabilir.");
const id = () => z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/, "Geçersiz kimlik.");
const slug = () => z.string().regex(/^[a-z0-9-]{1,80}$/, "Kısa ad yalnızca küçük harf, rakam ve tire içerebilir.");
const money = () => z.number().finite().min(0).max(100_000_000);
const icon = () => z.string().regex(/^[a-z0-9-]{1,40}$/, "Geçersiz ikon adı.");
const tags = (maxItems = 20) => z.array(required(60)).max(maxItems);
const isoDate = () =>
  z
    .string()
    .max(40)
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Geçersiz tarih.");

const linkAction = z.object({ label: required(60), href: url() });

const FAVICON_MESSAGE =
  "Sekme ikonu .ico, .png veya .svg uzantılı bir site içi yol (ör. /favicon.svg) ya da https:// adresi olmalıdır.";

function uniqueBy<T>(key: keyof T, message: string) {
  return (items: T[], ctx: z.RefinementCtx) => {
    const seen = new Set<unknown>();
    items.forEach((item, index) => {
      const value = item[key];
      if (seen.has(value)) ctx.addIssue({ code: "custom", message, path: [index, key as string] });
      seen.add(value);
    });
  };
}

/* ---------- Bölüm şemaları ---------- */

export const generalSchema: z.ZodType<GeneralSettings> = z.object({
  brandName: required(40),
  siteTitle: required(120),
  titleTemplate: text(80).refine(
    (v) => v === "" || (v.split("%s").length === 2 && v.length > 2),
    'Başlık şablonu tam olarak bir kez "%s" içermelidir (ör. "%s | LrWebs") veya boş bırakılmalıdır.',
  ),
  faviconUrl: z.string().max(300).transform(sanitizeText).refine(isSafeIconUrl, FAVICON_MESSAGE),
  siteTagline: text(200),
  siteDescription: required(400),
  siteUrl: z
    .string()
    .max(200)
    .transform(sanitizeText)
    .refine((v) => /^https?:\/\//i.test(v) && isSafeUrl(v), "Site adresi geçerli bir http:// veya https:// adresi olmalıdır."),
  keywords: tags(30),
  navigation: z
    .array(z.object({ id: id(), label: required(60), href: url(), visible: z.boolean() }))
    .max(20)
    .superRefine(uniqueBy("id", "Menü öğesi kimlikleri benzersiz olmalıdır.")),
  drawerNote: text(300),
  footer: z.object({
    description: text(400),
    copyright: text(200),
    privacyLabel: required(60),
    kvkkLabel: required(60),
  }),
});

export const contactSchema: z.ZodType<ContactSettings> = z.object({
  email: z
    .string()
    .max(200)
    .transform(sanitizeText)
    .refine((v) => v === "" || isValidEmail(v), "Geçerli bir e-posta adresi girin."),
  phone: text(40),
  address: text(300),
  responseNote: text(300),
  businessHours: z.array(z.object({ id: id(), day: required(60), hours: required(80) })).max(10),
  details: z.array(z.object({ id: id(), title: required(80), description: text(400), icon: icon() })).max(8),
  socials: z
    .array(
      z.object({
        id: id(),
        platform: z.enum(["github", "linkedin", "x", "instagram", "youtube", "dribbble", "website"]),
        label: required(40),
        url: url(),
        visible: z.boolean(),
      }),
    )
    .max(10),
  form: z.object({
    nameLabel: required(60),
    namePlaceholder: text(120),
    emailLabel: required(60),
    emailPlaceholder: text(120),
    messageLabel: required(60),
    messagePlaceholder: text(300),
    consentText: text(400),
    submitLabel: required(40),
    successMessage: required(300),
    errorMessage: required(300),
  }),
});

export const heroSchema: z.ZodType<HeroSettings> = z.object({
  eyebrow: text(120),
  headline: required(200),
  headlineAccent: text(120),
  description: text(600),
  primaryCta: linkAction,
  secondaryCta: linkAction,
  badges: tags(10),
  blur: z.object({
    enabled: z.boolean(),
    mode: z.enum(["hover", "cursor"]),
    intensity: z.number().min(0).max(24),
    radius: z.number().min(60).max(400),
    autoRevealSeconds: z.number().min(0).max(60),
    hint: text(120),
  }),
  devices: z.object({
    defaultActive: z.enum(["desktop", "tablet", "mobile"]),
    previewPath: z
      .string()
      .max(200)
      .transform(sanitizeText)
      .refine(
        (v) => isSafeSitePath(v) && !v.startsWith("/api/") && !v.startsWith("/admin"),
        "Önizleme yolu / ile başlayan, yönetim paneli veya API dışındaki site içi bir yol olmalıdır.",
      ),
    showLabels: z.boolean(),
    hint: text(160),
    labels: z.object({ desktop: required(30), tablet: required(30), mobile: required(30) }),
  }),
});

const statItem = z.object({
  id: id(),
  value: required(12),
  suffix: text(6),
  label: required(80),
  description: text(240),
  icon: icon(),
});

export const statsSchema: z.ZodType<StatsSettings> = z.object({
  eyebrow: text(80),
  title: text(160),
  items: z.tuple([statItem, statItem]),
});

const sectionCopy = z.object({
  eyebrow: text(80),
  title: required(160),
  description: text(400),
  linkLabel: text(60),
  linkHref: url(),
});

export const sectionsSchema: z.ZodType<HomeSections> = z.object({
  services: sectionCopy,
  about: sectionCopy,
  projects: sectionCopy,
  blog: sectionCopy,
  contact: sectionCopy,
});

const pageCopy = z.object({
  eyebrow: text(80),
  title: required(160),
  description: text(500),
  metaTitle: required(70),
  metaDescription: text(200),
});

export const pagesSchema: z.ZodType<PagesSettings> = z.object({
  services: pageCopy,
  portfolio: pageCopy,
  blog: pageCopy,
  pricing: pageCopy,
  about: pageCopy,
  contact: pageCopy,
});

export const servicesSchema: z.ZodType<Service[]> = z
  .array(
    z.object({
      id: id(),
      slug: slug(),
      title: required(120),
      icon: icon(),
      summary: text(400),
      content: rich(),
      features: tags(12),
      duration: text(60),
      visible: z.boolean(),
    }),
  )
  .max(50)
  .superRefine(uniqueBy("slug", "Hizmet kısa adları benzersiz olmalıdır."))
  .superRefine(uniqueBy("id", "Hizmet kimlikleri benzersiz olmalıdır."));

export const projectsSchema: z.ZodType<Project[]> = z
  .array(
    z.object({
      id: id(),
      slug: slug(),
      title: required(120),
      client: text(120),
      category: required(60),
      year: text(10),
      summary: text(400),
      content: rich(),
      tags: tags(12),
      liveUrl: url(),
      coverImage: url(),
      visible: z.boolean(),
    }),
  )
  .max(100)
  .superRefine(uniqueBy("slug", "Proje kısa adları benzersiz olmalıdır."))
  .superRefine(uniqueBy("id", "Proje kimlikleri benzersiz olmalıdır."));

export const blogSchema: z.ZodType<BlogPost[]> = z
  .array(
    z.object({
      id: id(),
      slug: slug(),
      title: required(160),
      excerpt: text(500),
      content: rich(120_000),
      author: required(80),
      category: required(60),
      tags: tags(12),
      coverImage: url(),
      publishedAt: isoDate(),
      visible: z.boolean(),
    }),
  )
  .max(500)
  .superRefine(uniqueBy("slug", "Yazı kısa adları benzersiz olmalıdır."))
  .superRefine(uniqueBy("id", "Yazı kimlikleri benzersiz olmalıdır."));

export const pricingSchema: z.ZodType<PricingSettings> = z.object({
  currency: required(4),
  builderTitle: required(80),
  builderDescription: text(300),
  extraPageLabel: required(80),
  extraPagePrice: money(),
  maxExtraPages: z.number().int().min(0).max(100),
  rushLabel: required(80),
  rushMultiplier: z.number().min(1).max(3),
  note: text(400),
  summaryCtaLabel: required(60),
  summaryCtaHref: url(),
  packages: z
    .array(
      z
        .object({
          id: id(),
          name: required(60),
          description: text(300),
          priceMin: money(),
          priceMax: money(),
          timeline: text(40),
          features: tags(15),
          highlighted: z.boolean(),
          ctaLabel: required(60),
          ctaHref: url(),
          visible: z.boolean(),
        })
        .refine((p) => p.priceMax >= p.priceMin, { message: "Üst fiyat alt fiyattan küçük olamaz.", path: ["priceMax"] }),
    )
    .max(8)
    .superRefine(uniqueBy("id", "Paket kimlikleri benzersiz olmalıdır.")),
  addons: z
    .array(
      z
        .object({
          id: id(),
          label: required(80),
          description: text(200),
          priceMin: money(),
          priceMax: money(),
          visible: z.boolean(),
        })
        .refine((a) => a.priceMax >= a.priceMin, { message: "Üst fiyat alt fiyattan küçük olamaz.", path: ["priceMax"] }),
    )
    .max(30)
    .superRefine(uniqueBy("id", "Modül kimlikleri benzersiz olmalıdır.")),
});

export const aboutSchema: z.ZodType<AboutSettings> = z.object({
  summary: text(1200),
  storyTitle: required(80),
  story: rich(),
  valuesTitle: required(80),
  values: z.array(z.object({ id: id(), title: required(80), description: text(300), icon: icon() })).max(12),
  stackTitle: required(80),
  techStack: z.array(z.object({ id: id(), category: required(60), items: tags(20) })).max(12),
  processTitle: required(80),
  process: z.array(z.object({ id: id(), title: required(80), description: text(300) })).max(12),
});

const legalDocument = z.object({
  title: required(120),
  content: rich(),
  pdfUrl: z
    .string()
    .max(300)
    .refine((v) => v === "" || /^\/api\/uploads\/(privacy|kvkk)-\d{10,16}-[a-f0-9]{8}\.pdf$/.test(v), "Geçersiz PDF yolu."),
  updatedAt: isoDate(),
});

export const legalSchema: z.ZodType<LegalSettings> = z.object({
  privacy: legalDocument,
  kvkk: legalDocument,
});

export const sectionSchemas: { [K in CmsSectionKey]: z.ZodType<CmsStore[K]> } = {
  general: generalSchema,
  contact: contactSchema,
  hero: heroSchema,
  stats: statsSchema,
  sections: sectionsSchema,
  pages: pagesSchema,
  services: servicesSchema,
  projects: projectsSchema,
  blog: blogSchema,
  pricing: pricingSchema,
  about: aboutSchema,
  legal: legalSchema,
};

export const cmsStoreSchema: z.ZodType<CmsStore> = z.object({
  ...sectionSchemas,
  updatedAt: z.string(),
});

/** Zod hatalarını "alan.yolu" → mesaj eşlemesine dönüştürür. */
export function flattenIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/* ---------- İletişim formu ---------- */

export const contactMessageSchema = z.object({
  name: z
    .string()
    .max(500, "Ad çok uzun.")
    .transform(sanitizeText)
    .pipe(z.string().min(2, "Lütfen adınızı girin.").max(100, "Ad en fazla 100 karakter olabilir.")),
  email: z
    .string()
    .max(500, "E-posta çok uzun.")
    .transform(sanitizeText)
    .pipe(z.string().max(200).refine(isValidEmail, "Geçerli bir e-posta adresi girin.")),
  message: z
    .string()
    .max(12000, "Mesaj çok uzun.")
    .transform(sanitizeText)
    .pipe(z.string().min(20, "Proje detayları en az 20 karakter olmalıdır.").max(4000, "Mesaj en fazla 4000 karakter olabilir.")),
  consent: z.literal(true, { error: "Devam etmek için aydınlatma metnini onaylayın." }),
});
