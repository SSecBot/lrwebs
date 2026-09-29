"use client";

import { MousePointer2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { HeroSettings } from "@/types/cms";

interface BlurHeadlineProps {
  headline: string;
  accent: string;
  blur: HeroSettings["blur"];
}

/**
 * Başlangıçta bulanık görünen, imleçle netleşen başlık.
 * - "cursor": imlecin çevresindeki dairesel alan netleşir (maske).
 * - "hover": başlığın üzerine gelindiğinde tamamı netleşir.
 * Dokunmatik cihazlarda dokunma ile ve autoRevealSeconds sonunda kalıcı olarak netleşir.
 */
export function BlurHeadline({ headline, accent, blur }: BlurHeadlineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [revealed, setRevealed] = useState(!blur.enabled);

  useEffect(() => {
    if (!blur.enabled || blur.autoRevealSeconds <= 0) return;
    const timer = window.setTimeout(() => setRevealed(true), blur.autoRevealSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [blur.enabled, blur.autoRevealSeconds]);

  const text = (
    <>
      {headline} {accent ? <span className="text-primary">{accent}</span> : null}
    </>
  );

  const classes =
    // Pacifico el yazısı bir fonttur; uzun çıkıntıları kesilmesin diye satır yüksekliği geniş tutulur.
    "font-display text-[1.9rem] leading-[1.4] font-normal text-fg sm:text-5xl sm:leading-[1.35] lg:text-[2.6rem] xl:text-5xl 2xl:text-6xl";

  if (!blur.enabled) {
    return <h1 className={classes}>{text}</h1>;
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  const isClear = revealed || (blur.mode === "hover" && hovering);
  const style = {
    "--blur": `${blur.intensity}px`,
    "--r": `${blur.radius}px`,
    "--mx": "-999px",
    "--my": "-999px",
  } as CSSProperties;

  return (
    <div
      ref={ref}
      style={style}
      className="relative select-none"
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onPointerMove={blur.mode === "cursor" ? onPointerMove : undefined}
      onClick={() => setRevealed(true)}
    >
      {/* Taban katman: bulanık metin (erişilebilirlik ağacındaki asıl başlık) */}
      <h1
        className={cn(classes, "transition-[filter,opacity] duration-700 ease-out")}
        style={{ filter: isClear ? "blur(0px)" : "blur(var(--blur))", opacity: isClear ? 1 : 0.75 }}
      >
        {text}
      </h1>

      {/* İmleç modunda net katman, radyal maske ile yalnızca imleç çevresinde görünür */}
      {blur.mode === "cursor" && !revealed ? (
        <div
          aria-hidden="true"
          className={cn(classes, "pointer-events-none absolute inset-0 transition-opacity duration-300")}
          style={{
            opacity: hovering ? 1 : 0,
            WebkitMaskImage: "radial-gradient(circle var(--r) at var(--mx) var(--my), #000 35%, transparent 100%)",
            maskImage: "radial-gradient(circle var(--r) at var(--mx) var(--my), #000 35%, transparent 100%)",
          }}
        >
          {text}
        </div>
      ) : null}

      {blur.hint && !revealed ? (
        <p
          className={cn(
            "mt-4 flex items-center gap-2 text-[11px] tracking-wide text-muted transition-opacity duration-300",
            hovering ? "opacity-0" : "opacity-100",
          )}
        >
          <MousePointer2 className="h-3.5 w-3.5 text-warm" aria-hidden="true" />
          {blur.hint}
        </p>
      ) : null}
    </div>
  );
}
