"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Mail, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SocialIcon } from "@/lib/icons";
import { cn, safeHref } from "@/lib/utils";
import type { NavItem, SocialLink } from "@/types/cms";

interface SiteHeaderProps {
  brandName: string;
  navigation: NavItem[];
  drawerNote: string;
  email: string;
  phone: string;
  socials: SocialLink[];
}

export function SiteHeader({ brandName, navigation, drawerNote, email, phone, socials }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const trigger = triggerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  const items = navigation.filter((n) => n.visible);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
          scrolled ? "border-line bg-deep/75 backdrop-blur-md" : "border-transparent bg-transparent",
        )}
      >
        <div className="container-wide grid h-16 grid-cols-[1fr_auto_1fr] items-center sm:h-[4.5rem]">
          <div className="flex items-center">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Menüyü aç"
              aria-expanded={open}
              aria-controls="site-drawer"
              className="group -ml-2 flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-lg transition hover:bg-surface/80"
            >
              <span className="h-[1.5px] w-5 rounded-full bg-fg transition-all group-hover:w-6" />
              <span className="h-[1.5px] w-5 rounded-full bg-fg" />
              <span className="h-[1.5px] w-5 rounded-full bg-fg transition-all group-hover:w-3.5" />
            </button>
          </div>

          <Link
            href="/"
            className="font-brand text-lg text-fg transition hover:text-primary sm:text-xl"
            aria-label={`${brandName} ana sayfa`}
            onClick={(e) => {
              // Zaten ana sayfadaysa gezinme yerine sayfanın başına yumuşakça kaydır.
              if (pathname !== "/" || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
              if (window.location.hash) history.replaceState(null, "", "/");
            }}
          >
            {brandName.slice(0, 2)}
            <span className="text-primary">{brandName.slice(2)}</span>
          </Link>

          <div className="flex justify-end">
            <Link
              href="/contact"
              className="hidden items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition hover:border-primary/60 hover:text-fg sm:inline-flex"
            >
              {items.find((i) => i.href === "/contact")?.label ?? "İletişim"}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-[60]" role="presentation">
          <div
            className="absolute inset-0 animate-fade-in bg-deep/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            id="site-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menüsü"
            className="absolute inset-y-0 left-0 flex w-full max-w-[420px] animate-slide-in flex-col border-r border-line bg-surface"
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-5 sm:h-[4.5rem] sm:px-7">
              <span className="font-brand text-lg">
                {brandName.slice(0, 2)}
                <span className="text-primary">{brandName.slice(2)}</span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-line p-2 text-muted transition hover:border-primary/60 hover:text-fg"
                aria-label="Menüyü kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-6 sm:px-5" aria-label="Ana menü">
              <ol className="space-y-1">
                {items.map((item, index) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.id}>
                      <Link
                        href={safeHref(item.href)}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-4 rounded-xl px-4 py-3.5 transition",
                          active ? "bg-deep text-fg" : "text-muted hover:bg-deep/60 hover:text-fg",
                        )}
                      >
                        <span className={cn("text-xs", active ? "text-primary" : "text-muted/60")}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="flex-1 text-lg font-medium">{item.label}</span>
                        <ArrowUpRight
                          className={cn(
                            "h-4 w-4 transition",
                            active ? "text-primary" : "opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100",
                          )}
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="space-y-4 border-t border-line px-5 py-6 sm:px-7">
              {drawerNote ? <p className="text-sm leading-6 text-muted">{drawerNote}</p> : null}
              <div className="space-y-2 text-sm">
                {email ? (
                  <a href={`mailto:${email}`} className="flex items-center gap-2 text-fg transition hover:text-primary">
                    <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                    {email}
                  </a>
                ) : null}
                {phone ? (
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                    className="flex items-center gap-2 text-fg transition hover:text-primary"
                  >
                    <Phone className="h-4 w-4 text-primary" aria-hidden="true" />
                    {phone}
                  </a>
                ) : null}
              </div>
              <div className="flex gap-2">
                {socials
                  .filter((s) => s.visible)
                  .map((s) => (
                    <a
                      key={s.id}
                      href={safeHref(s.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="rounded-lg border border-line p-2 text-muted transition hover:border-primary/60 hover:text-fg"
                    >
                      <SocialIcon platform={s.platform} className="h-4 w-4" />
                    </a>
                  ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
