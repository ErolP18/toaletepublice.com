import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminBasePath, isUnderPath } from "@/lib/admin-path";
import { sessionCookie, verifySessionToken } from "@/lib/auth";
import { updateSupabaseSession } from "@/lib/supabase/session";

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie.name, cookie.value);
  }
  return to;
}

function noIndex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

function notFound() {
  return noIndex(
    new NextResponse("Not Found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
  );
}

export async function proxy(request: NextRequest) {
  const baseResponse = await updateSupabaseSession(request);
  const { pathname } = request.nextUrl;
  const base = adminBasePath();

  if (base !== "/admin" && isUnderPath(pathname, "/admin")) {
    return notFound();
  }

  let internalPath = pathname;
  const onPublicAdmin = isUnderPath(pathname, base);
  if (onPublicAdmin) {
    internalPath = `/admin${pathname.slice(base.length)}` || "/admin";
    if (internalPath === "/admin/") internalPath = "/admin";
  }

  const isAdminUi = isUnderPath(internalPath, "/admin");
  const isAdminApi = pathname.startsWith("/api/admin/") || pathname === "/api/geocode/maps";
  if (!isAdminUi && !isAdminApi) return baseResponse;

  const isLogin =
    internalPath === "/admin/login" || pathname.startsWith("/api/admin/login");

  async function finish(response: NextResponse) {
    return noIndex(copyCookies(baseResponse, response));
  }

  if (isLogin) {
    if (onPublicAdmin && pathname !== internalPath) {
      const url = request.nextUrl.clone();
      url.pathname = internalPath;
      return finish(NextResponse.rewrite(url, { request }));
    }
    return noIndex(baseResponse);
  }

  const ok = await verifySessionToken(request.cookies.get(sessionCookie.name)?.value);
  if (ok) {
    if (onPublicAdmin && pathname !== internalPath) {
      const url = request.nextUrl.clone();
      url.pathname = internalPath;
      return finish(NextResponse.rewrite(url, { request }));
    }
    return noIndex(baseResponse);
  }

  if (pathname.startsWith("/api/")) {
    return noIndex(NextResponse.json({ error: "Neautorizat" }, { status: 401 }));
  }

  const login = new URL(request.url);
  login.pathname = `${base}/login`;
  login.search = "";
  login.searchParams.set("next", pathname);
  return finish(NextResponse.redirect(login));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mjs|css)$).*)",
  ],
};
