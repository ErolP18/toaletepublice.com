import { NextResponse } from "next/server";
import {
  adminPasswordConfigured,
  createSessionToken,
  passwordMatches,
  sessionCookie,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!adminPasswordConfigured()) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD nu e încărcat. Oprește și pornește din nou npm run dev." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!passwordMatches(body?.password ?? "")) {
    return NextResponse.json({ error: "Parolă greșită." }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie.name, token, sessionCookie.options);
  return response;
}
