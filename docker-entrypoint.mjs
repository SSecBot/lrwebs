// LrWebs konteyner giriş noktası.
// 1) Güvenli olmayan varsayılan parolayla yayına çıkmayı engeller.
// 2) Kalıcı disk (/app/data) boşsa imajdaki başlangıç içeriğini kopyalar.
// 3) Next.js bağımsız sunucusunu (server.js) başlatır.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const dataDir = path.join(root, "data");
const storeFile = path.join(dataDir, "cms-store.json");
const seedFile = path.join(root, "seed", "cms-store.json");
const uploadDir = process.env.LRWEBS_UPLOAD_DIR || path.join(dataDir, "uploads");

const passcode = process.env.ADMIN_PASSCODE ?? "";
if ((passcode.length < 12 || passcode === "admin123") && process.env.ALLOW_WEAK_PASSCODE !== "1") {
  console.error(
    "[lrwebs] ADMIN_PASSCODE en az 12 karakter olmalı ve varsayılan parola olmamalıdır.\n" +
      "         .env dosyanıza güçlü bir parola yazın (yalnızca yerel deneme için ALLOW_WEAK_PASSCODE=1).",
  );
  process.exit(1);
}
if (!process.env.ADMIN_SESSION_SECRET) {
  console.warn("[lrwebs] ADMIN_SESSION_SECRET tanımlı değil; kalıcı diskte rastgele bir anahtar üretilecek.");
}

mkdirSync(dataDir, { recursive: true });
mkdirSync(uploadDir, { recursive: true });

if (!existsSync(storeFile)) {
  copyFileSync(seedFile, storeFile);
  const siteUrl = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (siteUrl && /^https?:\/\/[^\s/]+$/i.test(siteUrl)) {
    const store = JSON.parse(readFileSync(storeFile, "utf8"));
    store.general.siteUrl = siteUrl;
    writeFileSync(storeFile, `${JSON.stringify(store, null, 2)}\n`);
  }
  console.log(`[lrwebs] Başlangıç içeriği kalıcı diske kopyalandı: ${storeFile}`);
} else {
  console.log("[lrwebs] Kalıcı diskteki mevcut içerik kullanılıyor.");
}

await import(pathToFileURL(path.join(root, "server.js")).href);
