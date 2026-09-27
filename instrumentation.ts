/**
 * Next.js sunucusu başlarken bir kez çalışır.
 * Üretimde, kalıcı diskteki güncel içeriğin derleme anındaki statik sayfaların
 * yerine geçmesi için açılış doğrulamasını planlar (bkz. lib/startup.ts).
 */
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { scheduleStartupRevalidation } = await import("./lib/startup");
    scheduleStartupRevalidation();
  }
}
