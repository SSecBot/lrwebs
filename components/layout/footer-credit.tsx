import type { CSSProperties } from "react";
import { isSafeImageUrl } from "@/lib/site-identity";
import { cn, safeHref } from "@/lib/utils";
import type { FooterCreditSettings, FooterSegment } from "@/types/cms";

const HEX = /^#[0-9a-f]{6}$/i;
const color = (value: string) => (HEX.test(value) ? value : undefined);

/** Telif metnindeki gibi {year} (veya @year) içinde bulunulan yıla dönüşür. */
const withYear = (text: string) => text.replace(/{year}|@year/g, String(new Date().getFullYear()));

function Segment({ segment: s }: { segment: FooterSegment }) {
  if (s.type === "text") return <span>{withYear(s.text)}</span>;

  const external = s.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  if (s.type === "link") {
    return (
      <a
        href={safeHref(s.href)}
        {...external}
        className="footer-credit-link underline-offset-4 transition-colors hover:underline"
        style={s.color && color(s.color) ? ({ "--fc-link": s.color } as CSSProperties) : undefined}
      >
        {withYear(s.text)}
      </a>
    );
  }

  if (!isSafeImageUrl(s.imageUrl)) return null;
  const height = Math.min(80, Math.max(12, s.imageHeight || 20));
  // Boyutu bilinmeyen, harici olabilen küçük logo: next/image yerine düz <img>.
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={s.imageUrl} alt={s.text} style={{ height, width: "auto" }} className="inline-block align-middle" loading="lazy" />
  );
  if (!s.href) return img;
  return (
    <a
      href={safeHref(s.href)}
      {...external}
      aria-label={s.text || "Logo"}
      className="inline-block align-middle transition-opacity hover:opacity-80"
    >
      {img}
    </a>
  );
}

/**
 * Footer'ın alt çubuğunda telif metninin yerini alan, yönetim panelinden düzenlenen
 * bağlantılı metin/logo satırı. Kapalıysa null döner (telif metni gösterilir).
 */
export function FooterCredit({ credit, className }: { credit: FooterCreditSettings | undefined; className?: string }) {
  if (!credit?.enabled || credit.segments.length === 0) return null;
  const style = {
    "--fc-link-default": color(credit.linkColor),
    "--fc-link-hover": color(credit.linkHoverColor),
  } as CSSProperties;

  return (
    <p style={style} className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-2", className)}>
      {credit.segments.map((s) => (
        <Segment key={s.id} segment={s} />
      ))}
    </p>
  );
}
