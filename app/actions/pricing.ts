"use server";

import { clientIp, rateLimit } from "@/lib/auth";
import { getCms } from "@/lib/cms";
import { findCoupon, type CouponInfo } from "@/lib/pricing";

export type CouponResult = { ok: true; coupon: CouponInfo } | { ok: false; message: string };

/**
 * Kupon kodunu doğrular. Kodlar sayfa kaynağında bulunmaz; yalnızca bu eylemle, IP başına
 * sınırlı sayıda denemeyle kontrol edilir (kaba kuvvetle kod tahminine karşı).
 */
export async function checkCoupon(code: unknown): Promise<CouponResult> {
  if (typeof code !== "string" || code.length > 40) return { ok: false, message: "Geçersiz kod." };
  const ip = await clientIp();
  if (!rateLimit(`coupon:${ip}`, 15, 10 * 60 * 1000) || !rateLimit("coupon:global", 300, 10 * 60 * 1000)) {
    return { ok: false, message: "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin." };
  }
  const { pricing } = await getCms();
  const coupon = findCoupon(pricing, code);
  if (!coupon) return { ok: false, message: "Bu indirim kodu geçerli değil veya süresi dolmuş." };
  return { ok: true, coupon };
}
