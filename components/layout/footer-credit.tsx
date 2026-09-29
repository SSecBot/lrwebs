import type { CSSProperties } from "react";
import { isSafeImageUrl } from "@/lib/site-identity";
import { cn, safeHref } from "@/lib/utils";
import type { FooterCreditSettings, FooterSegment } from "@/types/cms";

const HEX = /^#[0-9a-f]{6}$/i;
const color = (value: string) => (HEX.test(value) ? value : undefined);

const ALIGN = { left: "justify-start text-left", center: "justify-center text-center", right: "justify-end text-right" };

function Segment({ segment: s }: { segment: FooterSegment }) {
  if (s.type === "text") return <span>{s.text}</span>;

  const external = s.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {};
  if (s.type === "link") {
    return (
      <a
        href={safeHref(s.href)}
        {...external}
        className="footer-credit-link underline-offset-4 transition-colors hover:underline"
        style={s.color && color(s.color) ? ({ "--fc-link": s.color } as CSSProperties) : undefined}
      >
        {s.text}
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

/** Footer'ın en altındaki, yönetim panelinden düzenlenen bağlantılı metin/logo satırı. */
export function FooterCredit({ credit }: { credit: FooterCreditSettings | undefined }) {
  if (!credit?.enabled || credit.segments.length === 0) return null;
  const style = {
    "--fc-link-default": color(credit.linkColor),
    "--fc-link-hover": color(credit.linkHoverColor),
  } as CSSProperties;

  return (
    <div className="border-t border-line">
      <p
        style={style}
        className={cn(
          "container-wide flex flex-wrap items-center gap-x-1.5 gap-y-2 py-4 text-sm text-muted",
          ALIGN[credit.align] ?? ALIGN.center,
        )}
      >
        {credit.segments.map((s) => (
          <Segment key={s.id} segment={s} />
        ))}
      </p>
    </div>
  );
}
