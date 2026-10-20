const FORBIDDEN = new Set(["", "/", "/api", "/uploads", "/maplibre"]);

export function adminBasePath() {
  const raw = (process.env.NEXT_PUBLIC_ADMIN_PATH ?? "/admin").trim();
  let path = raw.startsWith("/") ? raw : `/${raw}`;
  path = path.replace(/\/+$/, "") || "/admin";
  const head = `/${path.slice(1).split("/")[0] ?? ""}`;
  if (
    FORBIDDEN.has(path) ||
    FORBIDDEN.has(head) ||
    path.startsWith("/api/") ||
    path.startsWith("/_next")
  ) {
    return "/admin";
  }
  return path;
}

export function adminHref(sub = "") {
  const base = adminBasePath();
  if (!sub || sub === "/") return base;
  return `${base}${sub.startsWith("/") ? sub : `/${sub}`}`;
}

export function isUnderPath(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}
