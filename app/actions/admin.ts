"use server";

import { clientIp, createSession, destroySession, rateLimit, requireAdmin, verifyPasscode } from "@/lib/auth";
import { CmsConflictError, mutateCms, updateMessages, type CmsPatch } from "@/lib/cms";
import { contentHash } from "@/lib/hash";
import { deleteUpload } from "@/lib/uploads";
import { flattenIssues, sectionSchemas } from "@/lib/validation";
import type { ActionResult, CmsSectionKey, CmsStore, LegalKind } from "@/types/cms";

/*
 * GÜVENLİK: Bu dosyadaki her veri değiştiren eylem, ilk iş olarak requireAdmin() ile
 * oturumu SUNUCU TARAFINDA doğrular. Sunucu eylemleri herkese açık HTTP uç noktalarıdır;
 * istemci tarafındaki sayfa korumasına güvenilmez. Next.js ayrıca Origin/Host
 * karşılaştırmasıyla siteler arası (CSRF) çağrıları reddeder.
 */

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
  analytics: "Analitik (GA4)",
  typography: "Yazı Tipleri",
};

const isSectionKey = (key: string): key is CmsSectionKey => Object.hasOwn(sectionSchemas, key);
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

/* ---------- Oturum ---------- */

export async function loginAction(passcode: string): Promise<ActionResult> {
  const ip = await clientIp();
  // IP başına ve (IP sahteciliğine karşı) küresel deneme sınırı.
  if (!rateLimit(`login:${ip}`, 8, 15 * 60 * 1000) || !rateLimit("login:global", 40, 15 * 60 * 1000)) {
    return { ok: false, message: "Çok fazla hatalı deneme. Lütfen 15 dakika sonra tekrar deneyin." };
  }
  if (typeof passcode !== "string" || passcode.length === 0 || passcode.length > 200 || !verifyPasscode(passcode)) {
    return { ok: false, message: "Parola hatalı." };
  }
  await createSession();
  return { ok: true, message: "Giriş başarılı." };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
}

/* ---------- İçerik kaydetme ---------- */

/**
 * @param patch  Kaydedilecek bölümler.
 * @param base   İstemcinin düzenlemeye başladığı sürümün bölüm özetleri. Sunucudaki
 *               sürüm bu arada değişmişse kayıt reddedilir (sessizce üzerine yazılmaz).
 */
export async function saveSectionsAction(
  patch: Record<string, unknown>,
  base: Record<string, string> = {},
): Promise<ActionResult<{ store: CmsStore }>> {
  await requireAdmin();

  if (!isPlainObject(patch) || !isPlainObject(base)) return { ok: false, message: "Geçersiz istek." };
  const keys = Object.keys(patch).filter(isSectionKey);
  if (keys.length === 0) return { ok: false, message: "Kaydedilecek bir değişiklik bulunamadı." };

  const clean: CmsPatch = {};
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

  try {
    const store = await mutateCms((current) => {
      const conflicts = keys.filter((k) => typeof base[k] === "string" && base[k] !== contentHash(current[k]));
      if (conflicts.length) throw new CmsConflictError(conflicts);

      // Yükleme ile yönetilen alanlar en güncel diskteki değerden korunur.
      if (clean.legal) {
        clean.legal = {
          privacy: { ...clean.legal.privacy, pdfUrl: current.legal.privacy.pdfUrl },
          kvkk: { ...clean.legal.kvkk, pdfUrl: current.legal.kvkk.pdfUrl },
        };
      }
      return clean;
    });
    return { ok: true, message: "Değişiklikler kaydedildi ve sitede yayına alındı.", data: { store } };
  } catch (error) {
    if (error instanceof CmsConflictError) {
      return {
        ok: false,
        message: `${error.sections.map((k) => SECTION_LABELS[k]).join(", ")} başka bir oturumda değiştirildi. Sayfayı yenileyip değişikliklerinizi yeniden uygulayın.`,
      };
    }
    throw error;
  }
}

export async function removeLegalPdfAction(kind: LegalKind): Promise<ActionResult<{ store: CmsStore }>> {
  await requireAdmin();
  if (kind !== "privacy" && kind !== "kvkk") return { ok: false, message: "Geçersiz belge türü." };
  let previous = "";
  const store = await mutateCms((current) => {
    previous = current.legal[kind].pdfUrl;
    return { legal: { ...current.legal, [kind]: { ...current.legal[kind], pdfUrl: "" } } };
  });
  if (previous) await deleteUpload(previous);
  return { ok: true, message: "PDF kaldırıldı. Modalda artık metin içeriği gösterilecek.", data: { store } };
}

/* ---------- Mesajlar ---------- */

const isMessageId = (id: unknown): id is string => typeof id === "string" && /^[a-zA-Z0-9-]{1,64}$/.test(id);

export async function setMessageReadAction(id: string, read: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isMessageId(id)) return { ok: false, message: "Geçersiz mesaj." };
  await updateMessages((list) => list.map((m) => (m.id === id ? { ...m, read: read === true } : m)));
  return { ok: true, message: read ? "Mesaj okundu olarak işaretlendi." : "Mesaj okunmadı olarak işaretlendi." };
}

export async function deleteMessageAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isMessageId(id)) return { ok: false, message: "Geçersiz mesaj." };
  await updateMessages((list) => list.filter((m) => m.id !== id));
  return { ok: true, message: "Mesaj silindi." };
}
