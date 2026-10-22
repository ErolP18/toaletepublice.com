import { foiaDueAt } from "@/lib/foia";
import { sendPlainMail } from "@/lib/mail/smtp";
import { renderTemplate } from "@/lib/mail/template";
import { institutionVars } from "@/lib/mail/vars";
import { cleanBody, cleanHeader, isEmail, normalizeEmail } from "@/lib/mail/validate";
import { recordDispatch } from "@/lib/supabase/correspondence";
import { getInstitution, getTemplate, logMail, updateInstitution } from "@/lib/supabase/desk";

export async function dispatchOfficialMail(input: {
  to: string;
  institutionId?: string;
  templateId?: string;
  subject?: string;
  body?: string;
  channel?: "smtp";
}) {
  const to = normalizeEmail(input.to);
  if (!isEmail(to)) throw new Error("Bagă un e-mail valid.");

  const templateId = input.templateId?.trim() || "cerere-544";
  const institutionId = input.institutionId?.trim() || "";
  const [template, institution] = await Promise.all([
    getTemplate(templateId),
    institutionId ? getInstitution(institutionId) : Promise.resolve(null),
  ]);
  if (!template) throw new Error("Șablonul nu există.");
  if (institutionId && !institution) throw new Error("Instituția nu există.");

  const vars = institutionVars(institution, { to });
  const subject = cleanHeader(
    input.subject?.trim() ? input.subject : renderTemplate(template.subject, vars),
    180,
  );
  const text = cleanBody(input.body?.trim() ? input.body : renderTemplate(template.body, vars));
  if (!subject || !text) throw new Error("Subiectul sau mesajul e gol.");

  const outboxId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await sendPlainMail({ to, subject, text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut trimite.";
    await logMail({
      id: outboxId,
      institutionId: institution?.id,
      toEmail: to,
      subject,
      templateId: template.id,
      status: "error",
      error: message,
      channel: "smtp",
      bodyPreview: text,
    });
    if (institution) {
      await updateInstitution(institution.id, { requestStatus: "eroare" });
    }
    throw error;
  }

  let requestId: string | null = null;
  if (institution) {
    const request = await recordDispatch({
      institutionId: institution.id,
      channel: "smtp",
      templateId: template.id,
      subject,
      body: text,
      toEmail: to,
      status: "in_asteptare",
      sentAt: now,
      outboxId,
    });
    requestId = request?.id ?? null;
  }

  await logMail({
    id: outboxId,
    institutionId: institution?.id,
    toEmail: to,
    subject,
    templateId: template.id,
    status: "accepted",
    channel: "smtp",
    requestId,
    bodyPreview: text,
  });

  return { to, subject, text, outboxId, requestId, dueAt: foiaDueAt(now).toISOString() };
}
