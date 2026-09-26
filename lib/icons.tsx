import {
  Activity,
  BarChart3,
  BookOpen,
  Boxes,
  Briefcase,
  Calendar,
  Clock,
  Code2,
  Cpu,
  Database,
  FileText,
  Gauge,
  Globe,
  Heart,
  Layers,
  LayoutGrid,
  Lock,
  Mail,
  MapPin,
  Palette,
  Phone,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  Timer,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { SVGProps } from "react";
import type { SocialPlatform } from "@/types/cms";

/** Yönetim panelinden seçilebilen ikonlar. */
export const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  activity: { icon: Activity, label: "Aktivite" },
  gauge: { icon: Gauge, label: "Gösterge" },
  code: { icon: Code2, label: "Kod" },
  server: { icon: Server, label: "Sunucu" },
  palette: { icon: Palette, label: "Palet" },
  wrench: { icon: Wrench, label: "Anahtar" },
  boxes: { icon: Boxes, label: "Kutular" },
  layers: { icon: Layers, label: "Katmanlar" },
  database: { icon: Database, label: "Veritabanı" },
  cpu: { icon: Cpu, label: "İşlemci" },
  globe: { icon: Globe, label: "Küre" },
  rocket: { icon: Rocket, label: "Roket" },
  zap: { icon: Zap, label: "Şimşek" },
  terminal: { icon: Terminal, label: "Terminal" },
  shield: { icon: ShieldCheck, label: "Kalkan" },
  lock: { icon: Lock, label: "Kilit" },
  users: { icon: Users, label: "Kullanıcılar" },
  heart: { icon: Heart, label: "Kalp" },
  target: { icon: Target, label: "Hedef" },
  sparkles: { icon: Sparkles, label: "Parıltı" },
  chart: { icon: BarChart3, label: "Grafik" },
  briefcase: { icon: Briefcase, label: "Çanta" },
  book: { icon: BookOpen, label: "Kitap" },
  grid: { icon: LayoutGrid, label: "Izgara" },
  calendar: { icon: Calendar, label: "Takvim" },
  clock: { icon: Clock, label: "Saat" },
  timer: { icon: Timer, label: "Zamanlayıcı" },
  "file-text": { icon: FileText, label: "Doküman" },
  mail: { icon: Mail, label: "E-posta" },
  phone: { icon: Phone, label: "Telefon" },
  "map-pin": { icon: MapPin, label: "Konum" },
};

export const ICON_OPTIONS = Object.entries(ICONS).map(([value, { label }]) => ({ value, label }));

export function CmsIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name]?.icon ?? Sparkles;
  return <Icon className={className} aria-hidden="true" />;
}

/* ---------- Marka ikonları (lucide v1 marka ikonlarını içermez) ---------- */

type BrandProps = SVGProps<SVGSVGElement>;

const BRAND_PATHS: Record<Exclude<SocialPlatform, "website">, string> = {
  github:
    "M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.02c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z",
  linkedin:
    "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
  x: "M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.64 7.58H.48l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.41Z",
  instagram:
    "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16ZM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.88 5.88 0 0 0-2.13 1.38A5.88 5.88 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13a5.88 5.88 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.88 5.88 0 0 0 2.13-1.38 5.88 5.88 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.88 5.88 0 0 0-1.38-2.13A5.88 5.88 0 0 0 19.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0Zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z",
  youtube:
    "M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z",
  dribbble:
    "M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm7.93 5.53a10.2 10.2 0 0 1 2.32 6.37c-.34-.07-3.73-.76-7.14-.33-.08-.17-.14-.35-.22-.53-.21-.5-.44-1-.68-1.49 3.77-1.54 5.49-3.75 5.72-4.02ZM12 1.77c2.6 0 4.98.97 6.79 2.57-.18.26-1.74 2.35-5.43 3.73a55.5 55.5 0 0 0-3.87-6.07c.81-.15 1.65-.23 2.51-.23Zm-4.4.98a65.5 65.5 0 0 1 3.83 5.99c-4.83 1.28-9.08 1.26-9.54 1.26A10.26 10.26 0 0 1 7.6 2.75ZM1.75 12.01v-.32c.45.01 5.45.08 10.6-1.47.3.58.58 1.17.84 1.76l-.4.12c-5.32 1.72-8.15 6.41-8.39 6.8a10.2 10.2 0 0 1-2.65-6.89ZM12 22.25a10.2 10.2 0 0 1-6.28-2.16c.19-.38 2.28-4.42 8.1-6.44l.07-.03a42.6 42.6 0 0 1 2.19 7.77c-1.24.55-2.62.86-4.08.86Zm5.8-1.8a44.2 44.2 0 0 0-2-7.31c3.2-.51 6 .33 6.35.44a10.23 10.23 0 0 1-4.35 6.87Z",
};

export function SocialIcon({ platform, ...props }: { platform: SocialPlatform } & BrandProps) {
  if (platform === "website") return <Globe className={props.className} aria-hidden="true" />;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d={BRAND_PATHS[platform]} />
    </svg>
  );
}
