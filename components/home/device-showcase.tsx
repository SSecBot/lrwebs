"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isSafeSitePath } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import type { DeviceKind, HeroSettings } from "@/types/cms";

const DEVICES: DeviceKind[] = ["desktop", "tablet", "mobile"];

/** Önizleme iframe'inin sanal görüntü alanı genişlikleri (px). */
const VIEWPORT: Record<DeviceKind, number> = { desktop: 1440, tablet: 834, mobile: 390 };
/** Cihaz öndeyken sahne genişliğine oranı (%). */
const FRONT_WIDTH: Record<DeviceKind, number> = { desktop: 70, tablet: 38, mobile: 20 };
const SCREEN_RATIO: Record<DeviceKind, string> = { desktop: "16 / 10", tablet: "834 / 1194", mobile: "390 / 844" };
const ICON = { desktop: Monitor, tablet: Tablet, mobile: Smartphone } as const;

/* Sayfa bir iframe içinde mi çalışıyor? (sonsuz iç içe önizlemeyi engeller) */
const noopSubscribe = () => () => {};
function useFrameContext(): "server" | "top" | "embedded" {
  return useSyncExternalStore(
    noopSubscribe,
    () => (window.self !== window.top ? "embedded" : "top"),
    () => "server",
  );
}

function LivePreview({ kind, src, interactive }: { kind: DeviceKind; src: string; interactive: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = size.w ? size.w / VIEWPORT[kind] : 0;

  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden">
      {scale > 0 ? (
        <iframe
          src={src}
          title={`LrWebs ${kind} canlı önizleme`}
          loading="lazy"
          tabIndex={interactive ? 0 : -1}
          className={cn("absolute top-0 left-0 origin-top-left border-0 bg-deep", !interactive && "pointer-events-none")}
          style={{ width: VIEWPORT[kind], height: size.h / scale, transform: `scale(${scale})` }}
        />
      ) : null}
    </div>
  );
}

/** Iframe yüklenmediğinde veya iç içe önizlemede kullanılan statik minyatür. */
function StaticPreview({ kind }: { kind: DeviceKind }) {
  const compact = kind === "mobile";
  return (
    <div className="absolute inset-0 flex flex-col gap-[6%] bg-deep p-[6%]" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-[3px]">
          <span className="h-[2px] w-3 rounded bg-fg/70" />
          <span className="h-[2px] w-3 rounded bg-fg/70" />
        </div>
        <span className="font-brand text-[8px] text-fg">
          Lr<span className="text-primary">Webs</span>
        </span>
        <span className="h-2 w-3" />
      </div>
      <div className={cn("grid flex-1 gap-[6%]", compact ? "grid-cols-1" : "grid-cols-2")}>
        <div className="flex flex-col justify-center gap-[6%]">
          <span className="h-[7%] w-4/5 rounded bg-fg/80" />
          <span className="h-[7%] w-3/5 rounded bg-primary/80" />
          <span className="h-[4%] w-full rounded bg-muted/30" />
          <span className="h-[4%] w-5/6 rounded bg-muted/30" />
          <div className="mt-[4%] flex gap-[6%]">
            <span className="h-[9%] min-h-2 w-1/3 rounded bg-primary" />
            <span className="h-[9%] min-h-2 w-1/3 rounded border border-line" />
          </div>
        </div>
        <div className={cn("grid grid-cols-2 gap-[6%]", compact && "grid-cols-2")}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="rounded border border-line bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}

function DeviceFrame({ kind, children }: { kind: DeviceKind; children: React.ReactNode }) {
  if (kind === "desktop") {
    return (
      <div className="w-full">
        <div className="rounded-[1.6%/2.6%] border border-[#1e293b] bg-[#0b1220] p-[1.6%] pb-[4.5%] shadow-2xl shadow-black/60">
          <div className="relative overflow-hidden rounded-[0.6%] bg-deep" style={{ aspectRatio: SCREEN_RATIO.desktop }}>
            {children}
          </div>
        </div>
        {/* Stand */}
        <div className="mx-auto h-[1.4vw] max-h-5 w-[16%] bg-gradient-to-b from-[#111a2c] to-[#0b1220]" />
        <div className="mx-auto h-[0.35vw] max-h-1.5 w-[30%] rounded-t-sm rounded-b-md bg-[#1e293b]" />
      </div>
    );
  }
  if (kind === "tablet") {
    return (
      <div className="w-full rounded-[7%/5%] border border-[#1e293b] bg-[#0b1220] p-[4%] shadow-2xl shadow-black/60">
        <div className="relative overflow-hidden rounded-[3%/2%] bg-deep" style={{ aspectRatio: SCREEN_RATIO.tablet }}>
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="w-full rounded-[18%/8.5%] border border-[#1e293b] bg-[#0b1220] p-[5%] shadow-2xl shadow-black/60">
      <div className="relative overflow-hidden rounded-[14%/6.5%] bg-deep" style={{ aspectRatio: SCREEN_RATIO.mobile }}>
        {children}
        <span
          className="absolute top-[1.8%] left-1/2 z-10 h-[3.2%] w-[30%] -translate-x-1/2 rounded-full bg-black"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

type Slot = "front" | "left" | "right";

const SLOT_STYLE: Record<Slot, { left: string; bottom: string; scale: number; blur: number; opacity: number; z: number }> = {
  front: { left: "50%", bottom: "0%", scale: 1, blur: 0, opacity: 1, z: 30 },
  left: { left: "13%", bottom: "14%", scale: 0.62, blur: 2, opacity: 0.6, z: 10 },
  right: { left: "87%", bottom: "14%", scale: 0.62, blur: 2, opacity: 0.6, z: 20 },
};

export function DeviceShowcase({ devices }: { devices: HeroSettings["devices"] }) {
  const frame = useFrameContext();
  const [order, setOrder] = useState<DeviceKind[]>(() => [
    devices.defaultActive,
    ...DEVICES.filter((d) => d !== devices.defaultActive),
  ]);
  // Bir kez öne gelmiş cihazların canlı önizlemesi yüklü kalır.
  const [loaded, setLoaded] = useState<Set<DeviceKind>>(() => new Set([devices.defaultActive]));

  const bringToFront = (kind: DeviceKind) => {
    setOrder((current) => {
      const index = current.indexOf(kind);
      if (index <= 0) return current;
      const next = [...current];
      next[index] = current[0];
      next[0] = kind;
      return next;
    });
    setLoaded((set) => (set.has(kind) ? set : new Set(set).add(kind)));
  };

  const slotOf = (kind: DeviceKind): Slot => (["front", "left", "right"] as const)[order.indexOf(kind)];
  const canEmbed = frame === "top";

  return (
    <div className="relative w-full">
      <div className="relative mx-auto aspect-[16/11] w-full max-w-[860px] sm:aspect-[16/10]">
        {DEVICES.map((kind) => {
          const slot = slotOf(kind);
          const s = SLOT_STYLE[slot];
          const isFront = slot === "front";
          return (
            <div
              key={kind}
              className="absolute transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                left: s.left,
                bottom: s.bottom,
                width: `${FRONT_WIDTH[kind]}%`,
                zIndex: s.z,
                opacity: s.opacity,
                filter: s.blur ? `blur(${s.blur}px)` : "none",
                transform: `translateX(-50%) scale(${s.scale})`,
                transformOrigin: "bottom center",
              }}
            >
              <DeviceFrame kind={kind}>
                {canEmbed && loaded.has(kind) ? (
                  <LivePreview
                    kind={kind}
                    src={isSafeSitePath(devices.previewPath) ? devices.previewPath : "/"}
                    interactive={isFront}
                  />
                ) : (
                  <StaticPreview kind={kind} />
                )}
              </DeviceFrame>
              {!isFront ? (
                <button
                  type="button"
                  onClick={() => bringToFront(kind)}
                  className="absolute inset-0 cursor-pointer rounded-xl"
                  aria-label={`${devices.labels[kind]} görünümünü öne getir`}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {devices.showLabels ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          <div
            className="inline-flex rounded-xl border border-line bg-surface/70 p-1 backdrop-blur"
            role="tablist"
            aria-label="Cihaz görünümü"
          >
            {DEVICES.map((kind) => {
              const Icon = ICON[kind];
              const active = order[0] === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => bringToFront(kind)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                    active ? "bg-deep text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", active && "text-primary")} aria-hidden="true" />
                  {devices.labels[kind]}
                </button>
              );
            })}
          </div>
          {devices.hint ? <p className="text-center text-[11px] text-muted">{devices.hint}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
