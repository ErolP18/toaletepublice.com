import { NextResponse } from "next/server";
import { rejectCrossOrigin } from "@/lib/http";
import { renderTemplate, missingTemplateVars } from "@/lib/mail/template";
import { institutionVars } from "@/lib/mail/vars";
import { getInstitution, getTemplate } from "@/lib/supabase/desk";

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Date invalide." }, { status: 400 });

  const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "cerere-544";
  const institutionId = typeof body.institutionId === "string" ? body.institutionId.trim() : "";
  const to = typeof body.to === "string" ? body.to.trim() : "";

  try {
    const [template, institution] = await Promise.all([
      getTemplate(templateId),
      institutionId ? getInstitution(institutionId) : Promise.resolve(null),
    ]);
    if (!template) return NextResponse.json({ error: "Șablonul nu există." }, { status: 404 });

    const vars = institutionVars(institution, {
      to,
      sentAt: institution?.lastEmailedAt,
      registration: typeof body.registration === "string" ? body.registration : "",
    });
    const missing = missingTemplateVars(`${template.subject}\n${template.body}`, vars);

    return NextResponse.json({
      subject: renderTemplate(template.subject, vars),
      body: renderTemplate(template.body, vars),
      missing,
      previousSent: Boolean(institution?.lastEmailedAt),
      lastEmailedAt: institution?.lastEmailedAt ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut pregăti mesajul.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
