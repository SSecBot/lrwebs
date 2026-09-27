import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cookies, headers } from "next/headers";

/**
 * Parola tabanlı yönetici oturumu.
 * - Parola: ADMIN_PASSCODE ortam değişkeni (varsayılan: admin123 — yalnızca geliştirme için)
 * - Çerez: HMAC-SHA256 ile imzalı, httpOnly, SameSite=Strict, üretimde Secure.
 * - İmza parolanın parmak izini de kapsar: parola değişince tüm oturumlar geçersizleşir.
 * - Çıkış yapılan oturumun kimliği sunucuda iptal listesine yazılır; çalınmış bir çerez
 *   çıkıştan sonra tekrar kullanılamaz.
 */

const COOKIE_NAME = "lrwebs_admin";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 saat
const DATA_DIR = path.join(process.cwd(), "data");
const REVOKED_FILE = path.join(DATA_DIR, ".revoked-sessions.json");

let warnedDefaultPasscode = false;

function passcode(): string {
  const value = process.env.ADMIN_PASSCODE;
  if (!value && process.env.NODE_ENV === "production" && !warnedDefaultPasscode) {
    warnedDefaultPasscode = true;
    console.warn("[auth] ADMIN_PASSCODE tanımlı değil; varsayılan parola kullanılıyor. Üretimde mutlaka değiştirin.");
  }
  return value || "admin123";
}

// Ortam değişkeni tanımlı değilse rastgele bir anahtar üretilip data/.session-secret
// dosyasında (yalnızca sahibinin okuyabileceği izinlerle) saklanır.
let cachedSecret: string | null = null;

function secret(): string {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  if (cachedSecret) return cachedSecret;
  const file = path.join(DATA_DIR, ".session-secret");
  try {
    cachedSecret = readFileSync(file, "utf8").trim();
  } catch {
    cachedSecret = randomBytes(32).toString("hex");
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(file, cachedSecret, { encoding: "utf8", flag: "wx", mode: 0o600 });
    } catch {
      // Başka bir süreç dosyayı aynı anda oluşturduysa onun değerini kullan.
      cachedSecret = readFileSync(file, "utf8").trim();
    }
  }
  return cachedSecret;
}

function sign(payload: string): string {
  const passcodeFingerprint = createHash("sha256").update(passcode()).digest("hex").slice(0, 16);
  return createHmac("sha256", secret()).update(`${payload}|${passcodeFingerprint}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function verifyPasscode(input: string): boolean {
  return safeEqual(input, passcode());
}

/* ---------- İptal edilen oturumlar ---------- */

type RevokedMap = Record<string, number>; // nonce -> son geçerlilik (unix sn)

function readRevoked(): RevokedMap {
  try {
    const parsed = JSON.parse(readFileSync(REVOKED_FILE, "utf8")) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as RevokedMap) : {};
  } catch {
    return {};
  }
}

function revoke(nonce: string, expires: number) {
  const now = Math.floor(Date.now() / 1000);
  const map = Object.fromEntries(Object.entries(readRevoked()).filter(([, exp]) => exp > now));
  map[nonce] = expires;
  mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${REVOKED_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(map), { encoding: "utf8", mode: 0o600 });
  try {
    renameSync(tmp, REVOKED_FILE);
  } catch {
    // Windows'ta hedef kısa süreli kilitliyse doğrudan yaz; iptal kaydı kaybolmamalı.
    writeFileSync(REVOKED_FILE, JSON.stringify(map), { encoding: "utf8", mode: 0o600 });
  }
}

/* ---------- Oturum ---------- */

interface Session {
  expires: number;
  nonce: string;
}

function parseToken(token: string | undefined): Session | null {
  if (!token || token.length > 200) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [expires, nonce, signature] = parts;
  if (!/^\d{10}$/.test(expires) || !/^[a-f0-9]{32}$/.test(nonce)) return null;
  if (!safeEqual(signature, sign(`${expires}.${nonce}`))) return null;
  const exp = Number(expires);
  if (exp <= Math.floor(Date.now() / 1000)) return null;
  if (readRevoked()[nonce]) return null;
  return { expires: exp, nonce };
}

export async function createSession(): Promise<void> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${expires}.${nonce}`;
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production" && process.env.ADMIN_INSECURE_COOKIE !== "1",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    priority: "high",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const session = parseToken(store.get(COOKIE_NAME)?.value);
  if (session) revoke(session.nonce, session.expires);
  store.delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return parseToken(store.get(COOKIE_NAME)?.value) !== null;
}

/**
 * Tüm veri değiştiren sunucu eylemleri ve API uçları bu kontrolü sunucu tarafında
 * çağırır; istemci tarafındaki sayfa korumasına güvenilmez.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new Error("Yetkisiz işlem. Lütfen yeniden giriş yapın.");
  }
}

/* ---------- İstemci IP'si ---------- */

/**
 * X-Forwarded-For istemci tarafından serbestçe yazılabildiğinden yalnızca
 * TRUST_PROXY=1 olduğunda (uygulama güvenilir bir ters vekilin arkasındaysa) dikkate alınır.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  if (process.env.TRUST_PROXY === "1") {
    const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
    if (forwarded && /^[0-9a-fA-F:.]{2,45}$/.test(forwarded)) return forwarded;
  }
  return "direct";
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
