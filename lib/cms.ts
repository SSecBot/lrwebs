import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { revalidatePath } from "next/cache";
import type { CmsSectionKey, CmsStore, ContactMessage } from "@/types/cms";

/**
 * Veri Erişim Katmanı (DAL)
 * -------------------------
 * Tüm site içeriği data/cms-store.json dosyasında tutulur. Okuma ve yazma işlemleri
 * yalnızca bu modül üzerinden yapılır; böylece depolama katmanı ileride bir veritabanı
 * ile değiştirilmek istendiğinde yalnızca bu dosyanın güncellenmesi yeterli olur.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "cms-store.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

/* Aynı süreç içindeki eşzamanlı yazma işlemlerini sıraya koyar. */
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

/** Önce geçici dosyaya yazar, ardından atomik olarak yer değiştirir. */
async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  try {
    await fs.rename(tmp, file);
  } catch {
    // Windows'ta hedef dosya kilitliyse doğrudan yazmaya geri dön.
    await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await fs.rm(tmp, { force: true });
  }
}

async function readStore(): Promise<CmsStore> {
  const raw = await fs.readFile(STORE_FILE, "utf8");
  return JSON.parse(raw) as CmsStore;
}

/** İstek başına tekilleştirilmiş CMS okuması. */
export const getCms = cache(readStore);

/** Belirtilen bölümleri günceller ve sitenin tamamını yeniden doğrular. */
export async function updateCms(patch: Partial<Pick<CmsStore, CmsSectionKey>>): Promise<CmsStore> {
  const next = await enqueue(async () => {
    const current = await readStore();
    const merged: CmsStore = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await writeJsonAtomic(STORE_FILE, merged);
    return merged;
  });
  revalidateSite();
  return next;
}

export function revalidateSite() {
  revalidatePath("/", "layout");
}

/* ---------- İletişim mesajları ---------- */

export async function getMessages(): Promise<ContactMessage[]> {
  const list = await readJson<ContactMessage[]>(MESSAGES_FILE, []);
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addMessage(message: ContactMessage): Promise<void> {
  await enqueue(async () => {
    const list = await readJson<ContactMessage[]>(MESSAGES_FILE, []);
    list.push(message);
    // Dosyanın kontrolsüz büyümesini engellemek için son 1000 mesaj tutulur.
    await writeJsonAtomic(MESSAGES_FILE, list.slice(-1000));
  });
}

export async function updateMessages(mutate: (list: ContactMessage[]) => ContactMessage[]): Promise<void> {
  await enqueue(async () => {
    const list = await readJson<ContactMessage[]>(MESSAGES_FILE, []);
    await writeJsonAtomic(MESSAGES_FILE, mutate(list));
  });
}

/* ---------- Yüklenen dosyalar ---------- */

export const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function deleteUpload(publicUrl: string): Promise<void> {
  const match = /^\/api\/uploads\/([a-z0-9-]+\.pdf)$/.exec(publicUrl);
  if (!match) return;
  await fs.rm(path.join(UPLOAD_DIR, match[1]), { force: true });
}
