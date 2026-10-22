import { NextResponse } from "next/server";
import { clientIp, rejectCrossOrigin } from "@/lib/http";
import { mailIdentity, smtpConfigured, smtpFromAddress } from "@/lib/mail/identity";
import { dispatchOfficialMail } from "@/lib/mail/send";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { listOutbox, listTemplates } from "@/lib/supabase/desk";

export async function GET() {
  try {
    const [templates, outbox] = await Promise.all([listTemplates(), listOutbox()]);
    const identity = mailIdentity();
    return NextResponse.json({
      configured: smtpConfigured(),
      from: smtpFromAddress() || identity.email,
      senderName: identity.name,
      templates,
      outbox,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut citi mailul.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const hourLimit = Number(process.env.SMTP_HOUR_LIMIT || "80");
  const limited = rateLimit(`mail:${clientIp(request)}`, Number.isFinite(hourLimit) ? hourLimit : 80, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAt), { status: 429 });
  }

  if (!smtpConfigured()) {
    return NextResponse.json(
      { error: "SMTP nu e configurat. Pune datele Proton în .env.local." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  if (body.confirm !== true) {
    return NextResponse.json({ error: "Confirmă trimiterea." }, { status: 400 });
  }

  try {
    const result = await dispatchOfficialMail({
      to: typeof body.to === "string" ? body.to : "",
      institutionId: typeof body.institutionId === "string" ? body.institutionId : "",
      templateId: typeof body.templateId === "string" ? body.templateId : "",
      subject: typeof body.subject === "string" ? body.subject : "",
      body: typeof body.body === "string" ? body.body : "",
    });
    return NextResponse.json({
      ok: true,
      ...result,
      note: "SMTP a acceptat mesajul. Asta nu înseamnă că destinatarul l-a citit.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut trimite.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
