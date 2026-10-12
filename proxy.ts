import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionCookie, verifySessionToken } from "@/lib/auth";
import { updateSupabaseSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  const response = await updateSupabaseSession(request);
  const { pathname } = request.nextUrl;
  const isAdminPath =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin/");

  if (!isAdminPath) return response;
  if (pathname === "/admin/login" || pathname === "/api/admin/login") return response;

  const ok = await verifySessionToken(request.cookies.get(sessionCookie.name)?.value);
  if (ok) return response;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", pathname);
  const redirect = NextResponse.redirect(login);
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie.name, cookie.value);
  }
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mjs|css)$).*)",
  ],
};
