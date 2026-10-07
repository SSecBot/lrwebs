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
 *
 * Bütünlük garantileri:
 *  - Süreç içi yazma kuyruğu + süreçler arası kilit dosyası (O_EXCL) ile yazmalar sıralanır.
 *  - Her okuma-değiştirme-yazma döngüsü kilit altında, diskteki en güncel veriyle yapılır.
 *  - Yeni içerik önce geçici dosyaya yazılıp fsync edilir, ardından atomik rename yapılır.
 *  - Bir önceki sürüm .bak olarak saklanır; ana dosya bozulursa okuma yedekten yapılır.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "cms-store.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

const LOCK_STALE_MS = 15_000;
const LOCK_TIMEOUT_MS = 10_000;

export class CmsConflictError extends Error {
  constructor(public readonly sections: CmsSectionKey[]) {
    super("Bu bölümler siz düzenlerken başka bir oturumda değiştirildi.");
    this.name = "CmsConflictError";
  }
}

/* ---------- Kilitleme ---------- */

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Birden fazla Node sürecinin (ör. küme/çoklu worker) aynı dosyaya eşzamanlı yazmasını engeller. */
async function withFileLock<T>(file: string, task: () => Promise<T>): Promise<T> {
  const lock = `${file}.lock`;
  const started = Date.now();
  for (;;) {
    try {
      const handle = await fs.open(lock, "wx");
      await handle.writeFile(`${process.pid}:${Date.now()}`);
      await handle.close();
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const stat = await fs.stat(lock).catch(() => null);
      if (stat && Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
        await fs.rm(lock, { force: true }); // çökmüş bir süreçten kalan kilit
        continue;
      }
      if (Date.now() - started > LOCK_TIMEOUT_MS)
        throw new Error("Veri dosyası kilitli. Lütfen birkaç saniye sonra tekrar deneyin.");
      await sleep(40 + Math.random() * 60);
    }
  }
  try {
    return await task();
  } finally {
    await fs.rm(lock, { force: true });
  }
}

const locked = <T>(file: string, task: () => Promise<T>) => enqueue(() => withFileLock(file, task));

/* ---------- Okuma / yazma ---------- */

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

/** Geçici dosyaya yazar, diske zorlar (fsync) ve atomik olarak yer değiştirir. */
async function writeJsonAtomic(file: string, data: unknown, { backup = false } = {}): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  const handle = await fs.open(tmp, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(data, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }

  if (backup) await fs.copyFile(file, `${file}.bak`).catch(() => undefined);

  // Windows'ta hedef dosya kısa süreli olarak başka bir okuyucu tarafından açık olabilir;
  // atomikliği bozmadan birkaç kez yeniden dene.
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt < 8 && (code === "EPERM" || code === "EBUSY" || code === "EACCES")) {
        await sleep(25 * (attempt + 1));
        continue;
      }
      await fs.rm(tmp, { force: true });
      throw error;
    }
  }
}

function pick<T extends object>(value: T | undefined, keys: string[]): Partial<T> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).filter(([k]) => keys.includes(k))) as Partial<T>;
}

/** Sonradan eklenen bölümler için varsayılanlar (eski veri dosyalarıyla geriye dönük uyum). */
const SECTION_DEFAULTS: Pick<CmsStore, "analytics" | "typography" | "footerCredit"> = {
  typography: { headingFont: "pacifico", bodyFont: "poppins", brandFont: "pacifico", headingWeight: 400, baseSize: "md" },
  footerCredit: {
    enabled: false,
    align: "left",
    linkColor: "",
    linkHoverColor: "",
    segments: [
      { id: "fc-1", type: "text", text: "© {year}", href: "", newTab: false, color: "", imageUrl: "", imageHeight: 20 },
      { id: "fc-2", type: "link", text: "LrWebs", href: "/", newTab: false, color: "", imageUrl: "", imageHeight: 20 },
      {
        id: "fc-3",
        type: "text",
        text: "Tüm hakları saklıdır.",
        href: "",
        newTab: false,
        color: "",
        imageUrl: "",
        imageHeight: 20,
      },
    ],
  },
  analytics: {
    enabled: false,
    respectDoNotTrack: true,
    excludeAdmins: true,
    retentionDays: 365,
    excludedPaths: [],
  },
};

export function withDefaults(store: CmsStore): CmsStore {
  // Nesne bölümlerinde eksik alanlar da doldurulur (ör. eski GA4 ayarları → dahili analitik).
  const analytics = { ...SECTION_DEFAULTS.analytics, ...pick(store.analytics, Object.keys(SECTION_DEFAULTS.analytics)) };
  const pricing = store.pricing && !Array.isArray(store.pricing.discounts) ? { ...store.pricing, discounts: [] } : store.pricing;
  return { ...SECTION_DEFAULTS, ...store, analytics, pricing };
}

async function readStore(): Promise<CmsStore> {
  try {
    return withDefaults(JSON.parse(await fs.readFile(STORE_FILE, "utf8")) as CmsStore);
  } catch (error) {
    // Ana dosya bozulmuşsa son sağlam yedekten devam et.
    if (error instanceof SyntaxError) {
      console.error("[cms] cms-store.json okunamadı, yedekten yükleniyor:", error.message);
      return withDefaults(JSON.parse(await fs.readFile(`${STORE_FILE}.bak`, "utf8")) as CmsStore);
    }
    throw error;
  }
}

/** Önbelleksiz, doğrudan diskten okuma (yedekleme gibi işlemler için). */
export const readCmsFresh = () => readStore();

/** İstek başına tekilleştirilmiş CMS okuması. */
export const getCms = cache(readStore);

export type CmsPatch = Partial<Pick<CmsStore, CmsSectionKey>>;

/**
 * Kilit altında, diskteki en güncel veriyle okuma-değiştirme-yazma yapar.
 * `mutate` fonksiyonu güncel veriyi alır ve uygulanacak bölümleri döndürür
 * (çakışma tespiti için hata da fırlatabilir).
 */
export async function mutateCms(mutate: (current: CmsStore) => CmsPatch | Promise<CmsPatch>): Promise<CmsStore> {
  const next = await locked(STORE_FILE, async () => {
    const current = await readStore();
    const patch = await mutate(current);
    const merged: CmsStore = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await writeJsonAtomic(STORE_FILE, merged, { backup: true });
    return merged;
  });
  revalidateSite();
  return next;
}

/** Belirtilen bölümleri günceller ve sitenin tamamını yeniden doğrular. */
export function updateCms(patch: CmsPatch): Promise<CmsStore> {
  return mutateCms(() => patch);
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
  await locked(MESSAGES_FILE, async () => {
    const list = await readJson<ContactMessage[]>(MESSAGES_FILE, []);
    list.push(message);
    // Dosyanın kontrolsüz büyümesini engellemek için son 1000 mesaj tutulur.
    await writeJsonAtomic(MESSAGES_FILE, list.slice(-1000));
  });
}

export async function updateMessages(mutate: (list: ContactMessage[]) => ContactMessage[]): Promise<void> {
  await locked(MESSAGES_FILE, async () => {
    const list = await readJson<ContactMessage[]>(MESSAGES_FILE, []);
    await writeJsonAtomic(MESSAGES_FILE, mutate(list));
  });
}
