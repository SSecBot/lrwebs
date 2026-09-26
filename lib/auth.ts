import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";

/**
 * Basit parola tabanlı yönetici oturumu.
 * - Parola: ADMIN_PASSCODE ortam değişkeni (varsayılan: admin123)
 * - Oturum çerezi HMAC-SHA256 ile imzalanır, httpOnly ve SameSite=Strict'tir.
 */

const COOKIE_NAME = "lrwebs_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 saat

function passcode(): string {
  return process.env.ADMIN_PASSCODE || "admin123";
}

// Ortam değişkeni tanımlı değilse rastgele bir anahtar üretilip data/.session-secret
// dosyasında saklanır; böylece tüm sunucu modülleri aynı anahtarı kullanır.
let cachedSecret: string | null = null;

function secret(): string {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  if (cachedSecret) return cachedSecret;
  const file = path.join(process.cwd(), "data", ".session-secret");
  try {
    cachedSecret = readFileSync(file, "utf8").trim();
  } catch {
    cachedSecret = randomBytes(32).toString("hex");
    try {
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, cachedSecret, { encoding: "utf8", flag: "wx" });
    } catch {
      // Başka bir süreç dosyayı aynı anda oluşturduysa onun değerini kullan.
      cachedSecret = readFileSync(file, "utf8").trim();
    }
  }
  return cachedSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function verifyPasscode(input: string): boolean {
  return safeEqual(input, passcode());
}

export async function createSession(): Promise<void> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `${expires}.${nonce}`;
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production" && process.env.ADMIN_INSECURE_COOKIE !== "1",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expires, nonce, signature] = parts;
  if (!safeEqual(signature, sign(`${expires}.${nonce}`))) return false;
  return Number(expires) > Math.floor(Date.now() / 1000);
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new Error("Yetkisiz işlem. Lütfen yeniden giriş yapın.");
  }
}

/* ---------- Basit hız sınırlayıcı (bellek içi) ---------- */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
