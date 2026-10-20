import { NextResponse } from "next/server";
import { createLoginCode, hashLoginCode, sessionJson } from "@/lib/auth";
import { clientIp, rejectCrossOrigin } from "@/lib/http";
import { adminMailbox, smtpConfigured } from "@/lib/mail/identity";
import { sendPlainMail } from "@/lib/mail/smtp";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { consumeMagicNonce, storeMagicNonce } from "@/lib/supabase/magic";

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const limited = rateLimit(`magic:${clientIp(request)}`, 5, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAt), { status: 429 });
  }

  const to = adminMailbox();
  if (!smtpConfigured() || !to) {
    return NextResponse.json(
      { error: "SMTP Proton nu e configurat. Pune SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM." },
      { status: 503 },
    );
  }

  try {
    const { code, hash, exp } = await createLoginCode();
    await storeMagicNonce(hash, exp);
    await sendPlainMail({
      to,
      subject: "Cod de admin — toaletepublice.com",
      text: `Codul tău: ${code}\n\nȚine 15 minute și se folosește o dată. Dacă nu l-ai cerut tu, ignoră mesajul.`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut trimite codul.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const limited = rateLimit(`magic-use:${clientIp(request)}`, 8, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAt), { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const hash = await hashLoginCode(body?.code ?? "");
  if (!hash) {
    return NextResponse.json({ error: "Introdu cele 6 cifre din mail." }, { status: 400 });
  }

  try {
    const used = await consumeMagicNonce(hash);
    if (!used) {
      return NextResponse.json({ error: "Cod greșit, expirat sau deja folosit." }, { status: 401 });
    }
    return sessionJson({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut deschide sesiunea.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
