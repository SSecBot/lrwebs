"use client";

import { Cookie } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { CONSENT_STORAGE_KEY, isValidMeasurementId, OPEN_CONSENT_EVENT } from "@/lib/analytics";
import type { AnalyticsSettings } from "@/types/cms";

/*
 * Google Analytics 4 (gtag.js)
 * ----------------------------
 * - Yalnızca yönetim panelinde doğrulanmış Ölçüm Kimliği kullanılır; ham betik gömülmez.
 * - "Temel" Consent Mode: onay gerekiyorsa gtag.js ziyaretçi kabul edene kadar HİÇ yüklenmez.
 * - Cihaz vitrinindeki iframe önizlemelerinde yüklenmez (çift sayfa görüntülemesini önler).
 * - SPA sayfa geçişleri GA4'ün "Gelişmiş ölçüm › Tarayıcı geçmişi olayları" özelliğiyle
 *   otomatik ölçülür; ayrıca manuel page_view gönderilmez (çift sayım olmaz).
 */

type Consent = "granted" | "denied" | null;
type WindowWithGtag = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void; __lrwebsGaLoaded?: string };

function readConsent(): Consent {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function writeConsent(value: Exclude<Consent, null>) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    /* depolama kapalıysa tercih yalnızca bu oturumda geçerli olur */
  }
}

function loadGtag(measurementId: string) {
  const w = window as WindowWithGtag;
  if (w.__lrwebsGaLoaded === measurementId) return;
  w.__lrwebsGaLoaded = measurementId;
  w.dataLayer = w.dataLayer || [];
  // gtag, argümanları "arguments" nesnesi olarak dataLayer'a iter (Google'ın resmi tanımı).
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  w.gtag("js", new Date());
  w.gtag("config", measurementId, { allow_google_signals: false, allow_ad_personalization_signals: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

/** Onay geri çekildiğinde GA çerezlerini siler ve izlemeyi durdurmak için sayfayı yeniler. */
function revokeAnalytics() {
  const w = window as WindowWithGtag;
  w.gtag?.("consent", "update", { analytics_storage: "denied" });
  const domain = window.location.hostname;
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_") || name === "_gid") {
      for (const d of [domain, `.${domain}`, `.${domain.split(".").slice(-2).join(".")}`]) {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${d}`;
      }
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
  window.location.reload();
}

const noopSubscribe = () => () => {};
const isTopWindow = () => window.self === window.top;
const serverFalse = () => false;

export function GoogleAnalytics({ settings }: { settings: AnalyticsSettings }) {
  const active = settings.enabled && isValidMeasurementId(settings.measurementId);
  const isTop = useSyncExternalStore(noopSubscribe, isTopWindow, serverFalse);
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);

  // Kayıtlı tercihi yalnızca istemcide oku (SSR ile uyumsuzluk olmaması için efekt içinde).
  useEffect(() => {
    if (!active || !isTop) return;
    const stored = readConsent();
    const frame = requestAnimationFrame(() => {
      setConsent(stored);
      setReady(true);
      setBannerOpen(settings.requireConsent && stored === null);
    });
    return () => cancelAnimationFrame(frame);
  }, [active, isTop, settings.requireConsent]);

  // Onay durumu uygunsa gtag.js'i yükle.
  useEffect(() => {
    if (!active || !isTop || !ready) return;
    if (!settings.requireConsent || consent === "granted") loadGtag(settings.measurementId);
  }, [active, isTop, ready, consent, settings.requireConsent, settings.measurementId]);

  // Footer'daki "Çerez Tercihleri" bağlantısı banner'ı yeniden açar.
  useEffect(() => {
    const open = () => setBannerOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open);
  }, []);

  const decide = useCallback(
    (value: Exclude<Consent, null>) => {
      const previous = consent;
      writeConsent(value);
      setConsent(value);
      setBannerOpen(false);
      if (value === "denied" && previous === "granted") revokeAnalytics();
    },
    [consent],
  );

  if (!active || !isTop || !settings.requireConsent || !bannerOpen) return null;

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="consent-title" className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-5">
      <div className="mx-auto flex max-w-3xl animate-toast-in flex-col gap-4 rounded-2xl border border-line bg-surface/95 p-5 shadow-2xl shadow-black/50 backdrop-blur sm:flex-row sm:items-center">
        <Cookie className="hidden h-6 w-6 shrink-0 text-warm sm:block" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p id="consent-title" className="text-sm font-semibold text-fg">
            {settings.consent.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">{settings.consent.text}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide("denied")}
            className="flex-1 rounded-lg border border-line px-4 py-2 text-xs font-medium text-fg transition hover:border-primary/50 sm:flex-none"
          >
            {settings.consent.rejectLabel}
          </button>
          <button
            type="button"
            onClick={() => decide("granted")}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-deep transition hover:bg-[#22c3de] sm:flex-none"
          >
            {settings.consent.acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Footer'da çerez tercihlerini yeniden açan bağlantı (KVKK: onayın geri alınabilmesi). */
export function ConsentSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      className="text-sm text-muted underline-offset-4 transition hover:text-fg hover:underline"
    >
      {label}
    </button>
  );
}
