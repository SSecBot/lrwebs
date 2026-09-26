"use server";

import { headers } from "next/headers";
import { createSession, destroySession, rateLimit, requireAdmin, verifyPasscode } from "@/lib/auth";
import { deleteUpload, getCms, updateCms, updateMessages } from "@/lib/cms";
import { flattenIssues, sectionSchemas } from "@/lib/validation";
import type { ActionResult, CmsSectionKey, CmsStore, LegalKind } from "@/types/cms";

const SECTION_LABELS: Record<CmsSectionKey, string> = {
  general: "Genel Ayarlar",
  contact: "İletişim",
  hero: "Hero",
  stats: "İstatistikler",
  sections: "Bölüm Metinleri",
  pages: "Sayfa Başlıkları",
  services: "Hizmetler",
  projects: "Projeler",
  blog: "Blog",
  pricing: "Fiyatlandırma",
  about: "Hakkımızda",
  legal: "Yasal Metinler",
};

/* ---------- Oturum ---------- */

export async function loginAction(passcode: string): Promise<ActionResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!rateLimit(`login:${ip}`, 8, 15 * 60 * 1000)) {
    return { ok: false, message: "Çok fazla hatalı deneme. Lütfen 15 dakika sonra tekrar deneyin." };
  }
  if (typeof passcode !== "string" || passcode.length > 200 || !verifyPasscode(passcode)) {
    return { ok: false, message: "Parola hatalı." };
  }
  await createSession();
  return { ok: true, message: "Giriş başarılı." };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
}

/* ---------- İçerik kaydetme ---------- */

export async function saveSectionsAction(
  patch: Partial<Record<CmsSectionKey, unknown>>,
): Promise<ActionResult<{ store: CmsStore }>> {
  await requireAdmin();

  const keys = Object.keys(patch).filter((k): k is CmsSectionKey => k in sectionSchemas);
  if (keys.length === 0) return { ok: false, message: "Kaydedilecek bir değişiklik bulunamadı." };

  const clean: Partial<CmsStore> = {};
  const errors: Record<string, string> = {};

  for (const key of keys) {
    const result = sectionSchemas[key].safeParse(patch[key]);
    if (result.success) {
      (clean as Record<string, unknown>)[key] = result.data;
    } else {
      for (const [path, message] of Object.entries(flattenIssues(result.error))) {
        errors[`${SECTION_LABELS[key]} › ${path}`] = message;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Bazı alanlar geçersiz. Lütfen hataları düzeltip tekrar deneyin.", fieldErrors: errors };
  }

  // PDF yolları yalnızca yükleme uç noktası tarafından değiştirilebilir.
  if (clean.legal) {
    const current = await getCms();
    clean.legal = {
      privacy: { ...clean.legal.privacy, pdfUrl: current.legal.privacy.pdfUrl },
      kvkk: { ...clean.legal.kvkk, pdfUrl: current.legal.kvkk.pdfUrl },
    };
  }

  const store = await updateCms(clean);
  return { ok: true, message: "Değişiklikler kaydedildi ve sitede yayına alındı.", data: { store } };
}

export async function removeLegalPdfAction(kind: LegalKind): Promise<ActionResult<{ store: CmsStore }>> {
  await requireAdmin();
  if (kind !== "privacy" && kind !== "kvkk") return { ok: false, message: "Geçersiz belge türü." };
  const cms = await getCms();
  const previous = cms.legal[kind].pdfUrl;
  const store = await updateCms({ legal: { ...cms.legal, [kind]: { ...cms.legal[kind], pdfUrl: "" } } });
  if (previous) await deleteUpload(previous);
  return { ok: true, message: "PDF kaldırıldı. Modalda artık metin içeriği gösterilecek.", data: { store } };
}

/* ---------- Mesajlar ---------- */

export async function setMessageReadAction(id: string, read: boolean): Promise<ActionResult> {
  await requireAdmin();
  await updateMessages((list) => list.map((m) => (m.id === id ? { ...m, read: Boolean(read) } : m)));
  return { ok: true, message: read ? "Mesaj okundu olarak işaretlendi." : "Mesaj okunmadı olarak işaretlendi." };
}

export async function deleteMessageAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  await updateMessages((list) => list.filter((m) => m.id !== id));
  return { ok: true, message: "Mesaj silindi." };
}
