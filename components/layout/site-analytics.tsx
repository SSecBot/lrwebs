"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { sendAnalytics } from "@/lib/analytics";

/*
 * Dahili analitik izleyicisi (çerezsiz)
 * -------------------------------------
 * - Tarayıcıda hiçbir şey saklamaz; yalnızca sayfa yolu, yönlendiren site ve sayfada geçirilen
 *   görünür süre sunucuya gönderilir.
 * - Cihaz vitrinindeki iframe önizlemelerinde çalışmaz (çift sayımı önler).
 * - "Do Not Track" / "Global Privacy Control" sinyali varsa (ayar açıksa) hiç çalışmaz.
 */

type AnalyticsWindow = Window & { __lrwebsAnalytics?: boolean; doNotTrack?: string };

/** React geliştirme modundaki çift efekt çalıştırmasında aynı sayfanın iki kez sayılmasını önler. */
let lastPageview = { path: "", at: 0 };

function optedOut(): boolean {
  const w = window as AnalyticsWindow;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  return nav.doNotTrack === "1" || w.doNotTrack === "1" || nav.msDoNotTrack === "1" || nav.globalPrivacyControl === true;
}

export function SiteAnalytics({ respectDoNotTrack }: { respectDoNotTrack: boolean }) {
  const pathname = usePathname();
  const active = useRef(false);
  const firstView = useRef(true);
  // Geçerli sayfada görünür geçirilen süre
  const page = useRef<{ path: string; engagedMs: number; visibleSince: number | null }>({
    path: "",
    engagedMs: 0,
    visibleSince: null,
  });

  const flushEngagement = () => {
    const current = page.current;
    if (!active.current || !current.path) return;
    const now = Date.now();
    const ms = current.engagedMs + (current.visibleSince !== null ? now - current.visibleSince : 0);
    current.engagedMs = 0;
    current.visibleSince = document.visibilityState === "visible" ? now : null;
    if (ms >= 1000) sendAnalytics({ type: "engagement", path: current.path, ms: Math.min(ms, 30 * 60 * 1000) });
  };

  // Kurulum: izin kontrolü ve sayfa gizlenince/kapanınca süre gönderimi
  useEffect(() => {
    const w = window as AnalyticsWindow;
    if (window.self !== window.top || (respectDoNotTrack && optedOut())) return;
    active.current = true;
    w.__lrwebsAnalytics = true;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushEngagement();
      else page.current.visibleSince = Date.now();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushEngagement);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushEngagement);
      active.current = false;
      w.__lrwebsAnalytics = false;
    };
  }, [respectDoNotTrack]);

  // Her sayfa geçişinde: önceki sayfanın süresini gönder, yeni sayfa görüntülemesini kaydet.
  useEffect(() => {
    if (!active.current) return;
    flushEngagement();
    page.current = {
      path: pathname,
      engagedMs: 0,
      visibleSince: document.visibilityState === "visible" ? Date.now() : null,
    };

    const now = Date.now();
    if (lastPageview.path === pathname && now - lastPageview.at < 1500) return;
    lastPageview = { path: pathname, at: now };

    // Yönlendiren site ve kampanya kaynağı yalnızca siteye giriş sayfasında anlamlıdır.
    const entry = firstView.current;
    firstView.current = false;
    sendAnalytics({
      type: "pageview",
      path: pathname,
      referrer: entry ? document.referrer.slice(0, 500) : "",
      utm: entry ? (new URLSearchParams(window.location.search).get("utm_source") ?? "").slice(0, 60) : "",
    });
  }, [pathname]);

  return null;
}
