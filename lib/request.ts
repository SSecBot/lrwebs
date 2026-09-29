/** İsteğin geldiği ana makine adı (ters vekil arkasında X-Forwarded-Host). */
export function requestHost(request: Request): string | null {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host");
}

/** Aynı kökenden gelmeyen (CSRF) istekleri reddeder. Origin başlığı zorunludur. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = requestHost(request);
  if (!origin || !host) return false;
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
