import { NextResponse } from "next/server";
import { clientIp, rejectCrossOrigin } from "@/lib/http";
import { smtpConfigured } from "@/lib/mail/identity";
import { dispatchOfficialMail } from "@/lib/mail/send";
import { isEmail } from "@/lib/mail/validate";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getInstitution } from "@/lib/supabase/desk";

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const hourLimit = Number(process.env.SMTP_HOUR_LIMIT || "80");
  const limited = rateLimit(
    `mail-batch:${clientIp(request)}`,
    Number.isFinite(hourLimit) ? hourLimit : 80,
    60 * 60 * 1000,
  );
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAt), { status: 429 });
  }

  if (!smtpConfigured()) {
    return NextResponse.json({ error: "SMTP nu e configurat. Pune datele Proton în .env.local." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  if (body.confirm !== true) {
    return NextResponse.json({ error: "Confirmă trimiterea individuală către fiecare instituție." }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
  if (!ids.length || ids.length > 12) {
    return NextResponse.json({ error: "Trimite cel mult 12 mesaje odată, fiecare separat." }, { status: 400 });
  }

  const templateId = typeof body.templateId === "string" ? body.templateId : "cerere-544";
  const results: Array<{ id: string; ok: boolean; to?: string; error?: string; previousSent?: boolean }> = [];

  for (const id of ids) {
    const institution = await getInstitution(id);
    if (!institution) {
      results.push({ id, ok: false, error: "Nu există." });
      continue;
    }
    if (!isEmail(institution.email)) {
      results.push({ id, ok: false, error: "Fără e-mail valid." });
      continue;
    }
    try {
      if (results.length) await new Promise((resolve) => setTimeout(resolve, 350));
      const sent = await dispatchOfficialMail({
        to: institution.email,
        institutionId: institution.id,
        templateId,
      });
      results.push({
        id,
        ok: true,
        to: sent.to,
        previousSent: Boolean(institution.lastEmailedAt),
      });
    } catch (error) {
      results.push({
        id,
        ok: false,
        error: error instanceof Error ? error.message : "Eroare la trimitere.",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    results,
    note: "Fiecare mesaj a plecat separat. Acceptarea SMTP nu înseamnă că a fost citit.",
  });
}
