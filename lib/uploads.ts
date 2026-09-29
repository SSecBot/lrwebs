import "server-only";

import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Yükleme kuralları (tek doğruluk kaynağı)
 * ----------------------------------------
 * - Kullanıcının gönderdiği dosya adı ASLA kullanılmaz; sunucu rastgele bir ad üretir.
 * - Uzantı, bildirilen MIME türü ve dosya imzası (magic bytes) birlikte doğrulanır.
 * - SVG dosyaları betik, olay özniteliği, harici referans ve DOCTYPE/ENTITY içeremez.
 * - Dosyalar yalnızca public/uploads altına yazılır ve /api/uploads/[file] üzerinden,
 *   sıkı başlıklarla (nosniff, SVG için sandbox CSP) sunulur.
 */

export type UploadKind = "privacy" | "kvkk" | "favicon";
export type UploadExt = "pdf" | "png" | "ico" | "svg";

/**
 * Varsayılan: public/uploads. Docker/PaaS kurulumlarında tek bir kalıcı diskte toplamak için
 * LRWEBS_UPLOAD_DIR ile değiştirilebilir (ör. /app/data/uploads). Dosyalar her durumda yalnızca
 * /api/uploads/[file] üzerinden sunulur.
 */
// Çalışma zamanı verisi: derleme izlemesine (standalone çıktısı) dahil edilmez.
export const UPLOAD_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.LRWEBS_UPLOAD_DIR ||
    path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads"),
);

/** Sunucunun ürettiği dosya adlarının tek biçimi. Yol ayırıcı, "..", boşluk veya null bayt içeremez. */
export const UPLOAD_NAME = /^(privacy|kvkk|favicon)-\d{10,16}-[a-f0-9]{8}\.(pdf|png|ico|svg)$/;
export const UPLOAD_URL = /^\/api\/uploads\/((privacy|kvkk|favicon)-\d{10,16}-[a-f0-9]{8}\.(pdf|png|ico|svg))$/;

export const CONTENT_TYPES: Record<UploadExt, string> = {
  pdf: "application/pdf",
  png: "image/png",
  ico: "image/x-icon",
  svg: "image/svg+xml",
};

const RULES: Record<UploadKind, { exts: UploadExt[]; maxBytes: number; label: string }> = {
  privacy: { exts: ["pdf"], maxBytes: 10 * 1024 * 1024, label: "PDF" },
  kvkk: { exts: ["pdf"], maxBytes: 10 * 1024 * 1024, label: "PDF" },
  favicon: { exts: ["png", "ico", "svg"], maxBytes: 512 * 1024, label: ".ico, .png veya .svg" },
};

const MIME_BY_EXT: Record<UploadExt, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  ico: ["image/x-icon", "image/vnd.microsoft.icon", "image/ico", "image/icon"],
  svg: ["image/svg+xml"],
};

export function isUploadKind(value: unknown): value is UploadKind {
  return value === "privacy" || value === "kvkk" || value === "favicon";
}

export function maxBytesFor(kind: UploadKind): number {
  return RULES[kind].maxBytes;
}

/** SVG içeriğinde çalıştırılabilir veya dış kaynağa erişen yapıları reddeder. */
function svgProblem(text: string): string | null {
  const head = text.slice(0, 2048).replace(/^﻿/, "").trimStart();
  if (!/^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(head)) return "Dosya geçerli bir SVG değil.";
  const forbidden: [RegExp, string][] = [
    [/<!DOCTYPE|<!ENTITY/i, "DOCTYPE/ENTITY tanımları"],
    [
      /<\s*(script|foreignObject|iframe|embed|object|audio|video|use|image|animate|set|handler|listener)\b/i,
      "betik veya gömülü içerik",
    ],
    [/\son[a-z]+\s*=/i, "olay öznitelikleri (on*)"],
    [/(java|vb)script\s*:|data\s*:\s*text\/html/i, "tehlikeli protokoller"],
    [/(xlink:)?href\s*=\s*["']?\s*(https?:|\/\/)/i, "harici bağlantılar"],
    [/url\(\s*["']?\s*(https?:|\/\/)|@import/i, "harici stil kaynakları"],
  ];
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) return `SVG dosyası güvenlik nedeniyle reddedildi: ${label} içeremez.`;
  }
  return null;
}

function signatureMatches(ext: UploadExt, buffer: Buffer): boolean {
  switch (ext) {
    case "pdf":
      return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
    case "png":
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "ico":
      // ICONDIR: ayrılmış=0, tür=1 (ikon), görüntü sayısı>0
      return buffer.length >= 6 && buffer.readUInt16LE(0) === 0 && buffer.readUInt16LE(2) === 1 && buffer.readUInt16LE(4) > 0;
    case "svg":
      return true; // metin tabanlı; svgProblem ile ayrıca doğrulanır
  }
}

export type ValidatedUpload = { ok: true; ext: UploadExt; buffer: Buffer } | { ok: false; message: string; status: number };

/** Dosyayı tür, boyut, uzantı, MIME ve imza açısından doğrular. */
export async function validateUpload(kind: UploadKind, file: File): Promise<ValidatedUpload> {
  const rule = RULES[kind];
  if (file.size === 0) return { ok: false, message: "Dosya boş görünüyor.", status: 400 };
  if (file.size > rule.maxBytes) {
    return { ok: false, message: `Dosya boyutu en fazla ${Math.round(rule.maxBytes / 1024)} KB olabilir.`, status: 413 };
  }

  // Yalnızca son uzantıya bakılır; "dosya.pdf.exe" gibi çift uzantılar reddedilir.
  const originalName = String(file.name ?? "").replace(/\0/g, "");
  const ext = originalName.toLowerCase().split(".").pop() as UploadExt;
  if (!rule.exts.includes(ext)) return { ok: false, message: `Yalnızca ${rule.label} dosyaları yüklenebilir.`, status: 415 };
  if (!MIME_BY_EXT[ext].includes(file.type)) {
    return { ok: false, message: "Dosya türü (MIME) uzantıyla uyuşmuyor.", status: 415 };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!signatureMatches(ext, buffer)) return { ok: false, message: "Dosya içeriği bildirilen türle uyuşmuyor.", status: 415 };
  if (ext === "svg") {
    const problem = svgProblem(buffer.toString("utf8"));
    if (problem) return { ok: false, message: problem, status: 415 };
  }
  return { ok: true, ext, buffer };
}

/** Doğrulanmış dosyayı sunucunun ürettiği adla kaydeder ve herkese açık URL'yi döndürür. */
export async function storeUpload(kind: UploadKind, ext: UploadExt, buffer: Buffer): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${kind}-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const target = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name);
  // Savunma amaçlı: hedef yol her koşulda UPLOAD_DIR içinde kalmalıdır.
  if (path.dirname(target) !== UPLOAD_DIR || !UPLOAD_NAME.test(name)) throw new Error("Geçersiz dosya yolu.");
  await fs.writeFile(target, buffer, { flag: "wx", mode: 0o644 });
  return `/api/uploads/${name}`;
}

/** Yalnızca sunucunun ürettiği yükleme URL'lerine karşılık gelen dosyaları siler. */
export async function deleteUpload(publicUrl: string): Promise<void> {
  const match = UPLOAD_URL.exec(publicUrl);
  if (!match) return;
  await fs.rm(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, match[1]), { force: true });
}

/** /api/uploads/[file] için güvenli okuma; geçersiz adlarda null döner. */
export async function readUpload(name: string): Promise<{ data: Buffer; ext: UploadExt } | null> {
  if (!UPLOAD_NAME.test(name)) return null;
  const target = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name);
  if (path.dirname(target) !== UPLOAD_DIR) return null;
  try {
    const data = await fs.readFile(target);
    return { data, ext: name.split(".").pop() as UploadExt };
  } catch {
    return null;
  }
}

/* ---------- Yedekleme / geri yükleme ---------- */

/** Yükleme klasöründeki, sunucunun ürettiği adlara uyan tüm dosyalar. */
export async function listUploads(): Promise<{ name: string; data: Buffer }[]> {
  let names: string[] = [];
  try {
    names = (await fs.readdir(UPLOAD_DIR)).filter((n) => UPLOAD_NAME.test(n));
  } catch {
    return [];
  }
  const files = await Promise.all(
    names.map(async (name) => ({ name, data: await fs.readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name)) })),
  );
  return files;
}

/** Yedekten gelen dosyayı ad biçimi, boyut, imza ve (SVG için) içerik güvenliği açısından doğrular. */
export function isTrustedUploadContent(name: string, data: Buffer): boolean {
  if (!UPLOAD_NAME.test(name)) return false;
  const [kind] = name.split("-") as [UploadKind];
  const ext = name.split(".").pop() as UploadExt;
  if (!RULES[kind].exts.includes(ext) || data.length === 0 || data.length > RULES[kind].maxBytes) return false;
  if (!signatureMatches(ext, data)) return false;
  return ext !== "svg" || svgProblem(data.toString("utf8")) === null;
}

/** Doğrulanmış yedek dosyasını aynı adla yazar (var olanın üzerine). */
export async function writeRestoredUpload(name: string, data: Buffer): Promise<void> {
  if (!UPLOAD_NAME.test(name)) throw new Error("Geçersiz dosya adı.");
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const target = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name);
  if (path.dirname(target) !== UPLOAD_DIR) throw new Error("Geçersiz dosya yolu.");
  await fs.writeFile(target, data, { mode: 0o644 });
}
