import { NextResponse } from "next/server";
import { rejectCrossOrigin } from "@/lib/http";
import { mailIdentity } from "@/lib/mail/identity";
import { renderTemplate, todayRo } from "@/lib/mail/template";
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

    const identity = mailIdentity();
    const vars = {
      institutie: institution?.name || to || "…",
      solicitant_nume: identity.name || "…",
      solicitant_adresa: identity.address || "…",
      solicitant_email: identity.email || "…",
      solicitant_telefon: identity.phone ? `, telefon ${identity.phone}` : "",
      data: todayRo(),
    };

    return NextResponse.json({
      subject: renderTemplate(template.subject, vars),
      body: renderTemplate(template.body, vars),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut pregăti mesajul.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
