import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { z } from "zod";
import { getMessages, mutateCms, readCmsFresh, updateMessages, withDefaults } from "@/lib/cms";
import { isTrustedUploadContent, listUploads, writeRestoredUpload } from "@/lib/uploads";
import { flattenIssues, sectionSchemas } from "@/lib/validation";
import type { CmsSectionKey, CmsStore, ContactMessage } from "@/types/cms";

/**
 * .lrwebs yedek biçimi
 * --------------------
 * gzip ile sıkıştırılmış JSON:
 *   { format: "lrwebs-backup", version: 1, createdAt, store, messages, uploads: [{ name, data(base64) }] }
 *
 * Kapsam: tüm site içeriği (cms-store.json), gelen mesajlar ve yüklenen dosyalar (PDF'ler, sekme ikonu).
 * Kapsam dışı (bilinçli): oturum imzalama anahtarı ve iptal edilmiş oturumlar — sırlar yedek
 * dosyasına yazılmaz; ortam değişkenleri (.env) de sunucuya özeldir.
 */

export const BACKUP_FORMAT = "lrwebs-backup";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 60 * 1024 * 1024; // sıkıştırılmış
const MAX_UNPACKED_BYTES = 200 * 1024 * 1024; // açılmış (sıkıştırma bombasına karşı)

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

export async function createBackup(): Promise<{ filename: string; data: Buffer }> {
  // Güncel içerik doğrudan diskten okunur (istek önbelleğinden değil).
  const store = await readCmsFresh();
  const [messages, uploads] = await Promise.all([getMessages(), listUploads()]);

  const payload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    site: store.general.brandName,
    store,
    messages,
    uploads: uploads.map((u) => ({ name: u.name, data: u.data.toString("base64") })),
  };
  const data = gzipSync(Buffer.from(JSON.stringify(payload), "utf8"), { level: 9 });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return { filename: `lrwebs-yedek-${stamp}.lrwebs`, data };
}

/* ---------- Geri yükleme ---------- */

const messageSchema: z.ZodType<ContactMessage> = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]{1,64}$/),
  name: z.string().max(200),
  email: z.string().max(300),
  message: z.string().max(12000),
  createdAt: z.string().max(40),
  read: z.boolean(),
  quote: z
    .object({
      packageId: z.string().max(64),
      packageName: z.string().max(120),
      timeline: z.string().max(80),
      addons: z.array(z.string().max(120)).max(40),
      extraPages: z.number().min(0).max(1000),
      rush: z.boolean(),
      rushLabel: z.string().max(120),
      lines: z.array(z.object({ label: z.string().max(200), min: z.number(), max: z.number() })).max(60),
      min: z.number(),
      max: z.number(),
      currency: z.string().max(8),
    })
    .optional(),
});

const envelopeSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().min(1),
  createdAt: z.string().max(40),
  store: z.record(z.string(), z.unknown()),
  messages: z.array(z.unknown()).max(5000).default([]),
  uploads: z
    .array(z.object({ name: z.string().max(100), data: z.string() }))
    .max(200)
    .default([]),
});

export interface RestoreSummary {
  createdAt: string;
  sections: number;
  messages: number;
  uploads: number;
  skippedUploads: number;
  safetyBackup: string;
}

export class BackupError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "BackupError";
  }
}

/** Yedeği açar ve her parçasını güncel güvenlik kurallarıyla doğrular; hiçbir şey yazmaz. */
export function parseBackup(raw: Buffer) {
  let json: unknown;
  try {
    const unpacked = gunzipSync(raw, { maxOutputLength: MAX_UNPACKED_BYTES });
    json = JSON.parse(unpacked.toString("utf8"));
  } catch {
    throw new BackupError("Dosya okunamadı. Geçerli bir .lrwebs yedeği olduğundan emin olun.");
  }

  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) throw new BackupError("Bu dosya bir LrWebs yedeği değil ya da bozulmuş.");
  if (envelope.data.version > BACKUP_VERSION) {
    throw new BackupError("Bu yedek sitenin daha yeni bir sürümüyle oluşturulmuş. Önce siteyi güncelleyin.");
  }

  // İçerik: her bölüm, admin panelindeki kayıtla aynı doğrulama/temizlemeden geçer.
  const source = withDefaults(envelope.data.store as unknown as CmsStore);
  const store: Partial<CmsStore> = {};
  const errors: Record<string, string> = {};
  for (const key of Object.keys(sectionSchemas) as CmsSectionKey[]) {
    const result = sectionSchemas[key].safeParse(source[key]);
    if (result.success) (store as Record<string, unknown>)[key] = result.data;
    else for (const [p, m] of Object.entries(flattenIssues(result.error))) errors[`${key}.${p}`] = m;
  }
  if (Object.keys(errors).length) throw new BackupError("Yedekteki içerik doğrulanamadı.", errors);

  const messages = envelope.data.messages
    .map((m) => messageSchema.safeParse(m))
    .filter((r) => r.success)
    .map((r) => r.data as ContactMessage);

  let skippedUploads = 0;
  const uploads: { name: string; data: Buffer }[] = [];
  for (const u of envelope.data.uploads) {
    const data = Buffer.from(u.data, "base64");
    if (isTrustedUploadContent(u.name, data)) uploads.push({ name: u.name, data });
    else skippedUploads++;
  }

  return { createdAt: envelope.data.createdAt, store: store as Omit<CmsStore, "updatedAt">, messages, uploads, skippedUploads };
}

/** Doğrulanmış yedeği uygular. Öncesinde mevcut durumun güvenlik yedeği sunucuda saklanır. */
export async function restoreBackup(raw: Buffer): Promise<RestoreSummary> {
  const parsed = parseBackup(raw);

  // Geri dönüş imkânı: mevcut durum data/backups altına kaydedilir.
  const current = await createBackup();
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const safetyName = `geri-yukleme-oncesi-${current.filename}`;
  await fs.writeFile(path.join(BACKUP_DIR, safetyName), current.data, { mode: 0o600 });
  await pruneSafetyBackups();

  for (const upload of parsed.uploads) await writeRestoredUpload(upload.name, upload.data);
  await mutateCms(() => parsed.store);
  await updateMessages(() => parsed.messages);

  return {
    createdAt: parsed.createdAt,
    sections: Object.keys(parsed.store).length,
    messages: parsed.messages.length,
    uploads: parsed.uploads.length,
    skippedUploads: parsed.skippedUploads,
    safetyBackup: safetyName,
  };
}

/** Sunucuda en fazla son 10 otomatik güvenlik yedeği tutulur. */
async function pruneSafetyBackups() {
  const names = (await fs.readdir(BACKUP_DIR).catch(() => [] as string[])).filter((n) => n.endsWith(".lrwebs")).sort();
  for (const name of names.slice(0, Math.max(0, names.length - 10))) await fs.rm(path.join(BACKUP_DIR, name), { force: true });
}
