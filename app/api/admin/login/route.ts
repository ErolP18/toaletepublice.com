import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, passwordMatches, sessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!passwordMatches(body?.password ?? "")) {
    return NextResponse.json({ error: "Parolă greșită." }, { status: 401 });
  }

  const token = await createSessionToken();
  const store = await cookies();
  store.set(sessionCookie.name, token, sessionCookie.options);
  return NextResponse.json({ ok: true });
}
