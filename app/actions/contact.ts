"use server";

import { randomUUID } from "node:crypto";
import { clientIp, rateLimit } from "@/lib/auth";
import { addMessage, getCms } from "@/lib/cms";
import { buildQuoteSnapshot, normalizeSelection, type QuoteSelection } from "@/lib/pricing";
import { contactMessageSchema, flattenIssues } from "@/lib/validation";
import type { ActionResult } from "@/types/cms";

export interface ContactInput {
  name: string;
  email: string;
  message: string;
  consent: boolean;
  /** Bal küpü alanı: gerçek kullanıcılar bu alanı görmez ve boş bırakır. */
  website?: string;
  /** Fiyatlandırma sayfasından taşınan seçimler (fiyatlar sunucuda yeniden hesaplanır). */
  quote?: QuoteSelection | null;
}

export async function submitContact(input: ContactInput): Promise<ActionResult> {
  // Sunucu eylemleri herkese açık uç noktalardır; gövde biçimi istemciye güvenilmeden doğrulanır.
  if (typeof input !== "object" || input === null) return { ok: false, message: "Geçersiz istek." };
  if (input.website) {
    // Botlara başarılı görünen ancak hiçbir şey kaydetmeyen yanıt ver.
    return { ok: true, message: "Mesajınız alındı." };
  }

  const ip = await clientIp();
  // IP başına ve toplam (IP sahteciliğine / dağıtık spam'e karşı) gönderim sınırı.
  if (!rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000) || !rateLimit("contact:global", 60, 10 * 60 * 1000)) {
    return { ok: false, message: "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin." };
  }

  const parsed = contactMessageSchema.safeParse({
    name: typeof input.name === "string" ? input.name : "",
    email: typeof input.email === "string" ? input.email : "",
    message: typeof input.message === "string" ? input.message : "",
    consent: input.consent === true,
  });

  if (!parsed.success) {
    return { ok: false, message: "Lütfen işaretli alanları kontrol edin.", fieldErrors: flattenIssues(parsed.error) };
  }

  // İstemcinin gönderdiği tutarlara güvenilmez: yalnızca seçimler alınır, fiyat güncel CMS'ten hesaplanır.
  let quote;
  if (input.quote) {
    const { pricing } = await getCms();
    const selection = normalizeSelection(pricing, input.quote);
    quote = selection ? (buildQuoteSnapshot(pricing, selection) ?? undefined) : undefined;
  }

  await addMessage({
    id: randomUUID(),
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
    createdAt: new Date().toISOString(),
    read: false,
    ...(quote ? { quote } : {}),
  });

  return { ok: true, message: "Mesajınız alındı." };
}
