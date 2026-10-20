export function requestHost(request: Request) {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const host = request.headers.get("host")?.trim();
  if (host) return host;
  return new URL(request.url).host;
}

export function requestOrigin(request: Request) {
  const configured = process.env.APP_ORIGIN?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    new URL(request.url).protocol.replace(":", "");
  return `${proto}://${requestHost(request)}`;
}
