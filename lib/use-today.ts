"use client";

import { useSyncExternalStore } from "react";
import { todayKey } from "@/lib/pricing";

const subscribe = (onChange: () => void) => {
  // Gün dönümünü yakalamak için dakikada bir kontrol (değer değişmedikçe yeniden çizim olmaz).
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
};

/**
 * Site saat diliminde bugünün tarihi. Sayfalar statik üretildiği için sunucudaki tarih eski
 * olabilir: hidrasyon sunucu değeriyle yapılır, ardından tarayıcının güncel tarihine geçilir.
 * (Kampanya tarihleri yalnızca gösterim içindir; tutar her zaman sunucuda yeniden hesaplanır.)
 */
export function useToday(serverToday: string): string {
  return useSyncExternalStore(
    subscribe,
    () => todayKey(),
    () => serverToday,
  );
}
