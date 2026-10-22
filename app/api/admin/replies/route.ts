import { NextResponse } from "next/server";
import { isInstitutionResponse, isReplyProcessing } from "@/lib/desk";
import { rejectCrossOrigin } from "@/lib/http";
import {
  createReply,
  getReply,
  listReplies,
  logEvent,
  updateReply,
  updateRequest,
} from "@/lib/supabase/correspondence";
import { updateInstitution } from "@/lib/supabase/desk";

export async function GET() {
  try {
    return NextResponse.json(await listReplies());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut citi răspunsurile.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Date invalide." }, { status: 400 });

  const institutionId = typeof body.institutionId === "string" ? body.institutionId.trim() : "";
  if (!institutionId) return NextResponse.json({ error: "Instituția lipsește." }, { status: 400 });
  const responseType = body.responseType ?? "fara_raspuns";
  if (!isInstitutionResponse(responseType)) {
    return NextResponse.json({ error: "Tip de răspuns invalid." }, { status: 400 });
  }

  try {
    const saved = await createReply({
      institutionId,
      requestId: typeof body.requestId === "string" ? body.requestId : null,
      receivedAt: typeof body.receivedAt === "string" ? body.receivedAt : null,
      registrationNumber: typeof body.registrationNumber === "string" ? body.registrationNumber : "",
      responseType,
      summary: typeof body.summary === "string" ? body.summary : "",
      notes: typeof body.notes === "string" ? body.notes : "",
      processing: isReplyProcessing(body.processing) ? body.processing : "neprocesat",
    });
    const now = new Date().toISOString();
    await updateInstitution(institutionId, {
      responseStatus: responseType,
      respondedAt: now,
      requestStatus: responseType === "incomplet" ? "necesita_revenire" : "raspuns_primit",
    });
    if (typeof body.requestId === "string" && body.requestId) {
      await updateRequest(body.requestId, {
        status: responseType === "incomplet" ? "necesita_revenire" : "raspuns_primit",
        registrationNumber: typeof body.registrationNumber === "string" ? body.registrationNumber : "",
      });
    }
    await logEvent({
      institutionId,
      requestId: typeof body.requestId === "string" ? body.requestId : null,
      kind: "raspuns",
      detail: responseType,
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut nota răspunsul.";
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
  const existing = await getReply(body.id);
  if (!existing) return NextResponse.json({ error: "Nu există." }, { status: 404 });
  try {
    const saved = await updateReply(body.id, {
      processing: isReplyProcessing(body.processing) ? body.processing : existing.processing,
      summary: typeof body.summary === "string" ? body.summary : existing.summary,
      notes: typeof body.notes === "string" ? body.notes : existing.notes,
      responseType: isInstitutionResponse(body.responseType) ? body.responseType : existing.responseType,
    });
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut actualiza răspunsul.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
