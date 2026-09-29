import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn, isExternalHref, safeHref } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

export const buttonStyles = (variant: Variant = "primary", className?: string) =>
  cn(
    "group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variant === "primary" && "bg-primary text-deep hover:bg-[#22c3de]",
    variant === "secondary" && "border border-line bg-surface/60 text-fg backdrop-blur hover:border-primary/60",
    variant === "ghost" && "px-0 py-0 text-primary hover:text-fg",
    className,
  );

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
  arrow = false,
  onClick,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  arrow?: boolean;
  onClick?: () => void;
}) {
  const target = safeHref(href);
  const content = (
    <>
      {children}
      {arrow ? <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /> : null}
    </>
  );
  if (isExternalHref(target) || target.startsWith("mailto:") || target.startsWith("tel:")) {
    return (
      <a
        href={target}
        className={buttonStyles(variant, className)}
        onClick={onClick}
        {...(isExternalHref(target) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {content}
      </a>
    );
  }
  return (
    <Link href={target} className={buttonStyles(variant, className)} onClick={onClick}>
      {content}
    </Link>
  );
}

export function SmartLink({ href, children, ...rest }: Omit<ComponentProps<"a">, "href"> & { href: string }) {
  const target = safeHref(href);
  if (isExternalHref(target) || target.startsWith("mailto:") || target.startsWith("tel:")) {
    return (
      <a href={target} {...(isExternalHref(target) ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={target} {...rest}>
      {children}
    </Link>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  as: Tag = "h2",
  id,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  as?: "h1" | "h2";
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-3xl">
        {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
        <Tag
          id={id}
          className={cn(
            "font-display text-fg",
            Tag === "h1" ? "text-3xl leading-tight sm:text-4xl lg:text-5xl" : "text-2xl leading-snug sm:text-3xl lg:text-4xl",
          )}
        >
          {title}
        </Tag>
        {description ? <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-line bg-deep/60 px-2 py-0.5 text-[11px] text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="container-wide pt-28 pb-10 sm:pt-36 sm:pb-14">
      <SectionHeading as="h1" eyebrow={eyebrow} title={title} description={description} />
    </section>
  );
}

/** Kapak görseli yoksa kullanılan sade, desenli yer tutucu. */
export function CoverImage({ src, alt, label, className }: { src: string; alt: string; label?: string; className?: string }) {
  const url = safeHref(src);
  if (src && url !== "#") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Yönetim panelinden girilen serbest URL'ler için düz <img> kullanılır.
      <img src={url} alt={alt} loading="lazy" decoding="async" className={cn("h-full w-full object-cover", className)} />
    );
  }
  return (
    <div
      className={cn("relative flex h-full w-full items-center justify-center overflow-hidden bg-surface", className)}
      role="img"
      aria-label={alt}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: "linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <span className="relative font-display text-2xl text-primary/80">{label ?? "LrWebs"}</span>
    </div>
  );
}
