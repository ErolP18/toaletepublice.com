import { NextResponse } from "next/server";
import { isRequestStatus, isSendChannel } from "@/lib/desk";
import { rejectCrossOrigin } from "@/lib/http";
import { recordDispatch, updateRequest, getRequest } from "@/lib/supabase/correspondence";
import { logMail } from "@/lib/supabase/desk";

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  if (body.confirm !== true) {
    return NextResponse.json({ error: "Confirmă înregistrarea trimiterii." }, { status: 400 });
  }

  const institutionId = typeof body.institutionId === "string" ? body.institutionId.trim() : "";
  if (!institutionId) return NextResponse.json({ error: "Instituția lipsește." }, { status: 400 });

  const channel = isSendChannel(body.channel) ? body.channel : "proton_manual";
  const sentAt =
    typeof body.sentAt === "string" && body.sentAt
      ? new Date(body.sentAt).toISOString()
      : new Date().toISOString();
  if (Number.isNaN(Date.parse(sentAt))) {
    return NextResponse.json({ error: "Data trimiterii e invalidă." }, { status: 400 });
  }

  try {
    const outboxId = crypto.randomUUID();
    const subject = typeof body.subject === "string" ? body.subject : "";
    const text = typeof body.body === "string" ? body.body : "";
    const toEmail = typeof body.toEmail === "string" ? body.toEmail : "";
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const saved = await recordDispatch({
      institutionId,
      channel,
      templateId,
      subject,
      body: text,
      toEmail,
      status: "in_asteptare",
      sentAt,
      outboxId,
      notes: typeof body.notes === "string" ? body.notes : "",
    });
    await logMail({
      id: outboxId,
      institutionId,
      toEmail,
      subject,
      templateId: templateId || null,
      status: "manual",
      channel,
      requestId: saved?.id,
      bodyPreview: text,
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut nota trimiterea.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.id !== "string") {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }
  const existing = await getRequest(body.id);
  if (!existing) return NextResponse.json({ error: "Nu există." }, { status: 404 });
  try {
    const saved = await updateRequest(body.id, {
      status: isRequestStatus(body.status) ? body.status : existing.status,
      registrationNumber: typeof body.registrationNumber === "string" ? body.registrationNumber : existing.registrationNumber,
      notes: typeof body.notes === "string" ? body.notes : existing.notes,
      extendedUntil: typeof body.extendedUntil === "string" ? body.extendedUntil : existing.extendedUntil,
    });
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut actualiza solicitarea.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
