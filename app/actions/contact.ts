"use server";

import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { rateLimit } from "@/lib/auth";
import { addMessage } from "@/lib/cms";
import { contactMessageSchema, flattenIssues } from "@/lib/validation";
import type { ActionResult } from "@/types/cms";

export interface ContactInput {
  name: string;
  email: string;
  message: string;
  consent: boolean;
  /** Bal küpü alanı: gerçek kullanıcılar bu alanı görmez ve boş bırakır. */
  website?: string;
}

export async function submitContact(input: ContactInput): Promise<ActionResult> {
  if (input.website) {
    // Botlara başarılı görünen ancak hiçbir şey kaydetmeyen yanıt ver.
    return { ok: true, message: "Mesajınız alındı." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000)) {
    return { ok: false, message: "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin." };
  }

  const parsed = contactMessageSchema.safeParse({
    name: String(input.name ?? ""),
    email: String(input.email ?? ""),
    message: String(input.message ?? ""),
    consent: input.consent === true,
  });

  if (!parsed.success) {
    return { ok: false, message: "Lütfen işaretli alanları kontrol edin.", fieldErrors: flattenIssues(parsed.error) };
  }

  await addMessage({
    id: randomUUID(),
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
    createdAt: new Date().toISOString(),
    read: false,
  });

  return { ok: true, message: "Mesajınız alındı." };
}
