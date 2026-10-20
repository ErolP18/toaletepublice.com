import { NextResponse } from "next/server";
import { adminPasswordConfigured, passwordMatches, sessionJson } from "@/lib/auth";
import { clientIp, rejectCrossOrigin } from "@/lib/http";
import { adminMailbox, smtpConfigured } from "@/lib/mail/identity";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET() {
  return NextResponse.json({
    password: adminPasswordConfigured(),
    magic: smtpConfigured() && Boolean(adminMailbox()),
  });
}

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const limited = rateLimit(`login:${clientIp(request)}`, 8, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAt), { status: 429 });
  }

  if (!adminPasswordConfigured()) {
    return NextResponse.json(
      { error: "Parola e oprită. Folosește codul din mail." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  if (!(await passwordMatches(body?.password ?? ""))) {
    return NextResponse.json({ error: "Parolă greșită." }, { status: 401 });
  }

  return sessionJson({ ok: true });
}
