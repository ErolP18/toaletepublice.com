import { NextResponse } from "next/server";
import { clientIp, rejectCrossOrigin } from "@/lib/http";
import { mailIdentity, mailIdentityReady, smtpConfigured } from "@/lib/mail/identity";
import { sendPlainMail } from "@/lib/mail/smtp";
import { renderTemplate, todayRo } from "@/lib/mail/template";
import { cleanBody, cleanHeader, isEmail, normalizeEmail } from "@/lib/mail/validate";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  getInstitution,
  getTemplate,
  listOutbox,
  listTemplates,
  logMail,
  updateInstitution,
} from "@/lib/supabase/desk";

export async function GET() {
  try {
    const [templates, outbox] = await Promise.all([listTemplates(), listOutbox()]);
    const identity = mailIdentity();
    return NextResponse.json({
      configured: smtpConfigured(),
      identityReady: mailIdentityReady(),
      from: identity.email,
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

  const limited = rateLimit(`mail:${clientIp(request)}`, 20, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAt), { status: 429 });
  }

  if (!smtpConfigured()) {
    return NextResponse.json(
      { error: "SMTP nu e configurat. Pune datele Proton în .env.local." },
      { status: 503 },
    );
  }
  if (!mailIdentityReady()) {
    return NextResponse.json(
      {
        error:
          "Pentru Legea 544/2001 trebuie identitatea ta: MAIL_SENDER_NAME și MAIL_SENDER_EMAIL.",
      },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Date invalide." }, { status: 400 });

  const to = normalizeEmail(typeof body.to === "string" ? body.to : "");
  if (!isEmail(to)) {
    return NextResponse.json({ error: "Bagă un e-mail valid." }, { status: 400 });
  }

  const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "cerere-544";
  const institutionId = typeof body.institutionId === "string" ? body.institutionId.trim() : "";

  try {
    const [template, institution] = await Promise.all([
      getTemplate(templateId),
      institutionId ? getInstitution(institutionId) : Promise.resolve(null),
    ]);
    if (!template) return NextResponse.json({ error: "Șablonul nu există." }, { status: 404 });
    if (institutionId && !institution) {
      return NextResponse.json({ error: "Instituția nu există." }, { status: 404 });
    }

    const identity = mailIdentity();
    const vars = {
      institutie: institution?.name || to,
      solicitant_nume: identity.name,
      solicitant_adresa: identity.address,
      solicitant_email: identity.email,
      solicitant_telefon: identity.phone ? `, telefon ${identity.phone}` : "",
      data: todayRo(),
    };

    const subject = cleanHeader(
      typeof body.subject === "string" && body.subject.trim()
        ? body.subject
        : renderTemplate(template.subject, vars),
      180,
    );
    const text = cleanBody(
      typeof body.body === "string" && body.body.trim()
        ? body.body
        : renderTemplate(template.body, vars),
    );

    await sendPlainMail({ to, subject, text });

    const now = new Date().toISOString();
    await logMail({
      id: crypto.randomUUID(),
      institutionId: institution?.id ?? null,
      toEmail: to,
      subject,
      templateId: template.id,
    });

    if (institution) {
      await updateInstitution(institution.id, {
        lastEmailedAt: now,
        requestedAt: institution.requestedAt || now,
        email: institution.email || to,
      });
    }

    return NextResponse.json({ ok: true, to, subject });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut trimite.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
