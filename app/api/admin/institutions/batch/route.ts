import { NextResponse } from "next/server";
import { isInstitutionResponse, isRequestStatus } from "@/lib/desk";
import { rejectCrossOrigin } from "@/lib/http";
import { logEvent } from "@/lib/supabase/correspondence";
import { updateInstitution, type InstitutionWrite } from "@/lib/supabase/desk";

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  if (body.confirm !== true) {
    return NextResponse.json({ error: "Confirmă acțiunea în lot." }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
  if (!ids.length || ids.length > 200) {
    return NextResponse.json({ error: "Selectează între 1 și 200 de instituții." }, { status: 400 });
  }

  const patch: Partial<InstitutionWrite> = {};
  if (isRequestStatus(body.requestStatus)) patch.requestStatus = body.requestStatus;
  if (isInstitutionResponse(body.responseStatus)) patch.responseStatus = body.responseStatus;
  if (!patch.requestStatus && !patch.responseStatus) {
    return NextResponse.json({ error: "Alege un status." }, { status: 400 });
  }

  try {
    let updated = 0;
    for (const id of ids) {
      const saved = await updateInstitution(id, patch);
      if (saved) {
        updated += 1;
        await logEvent({
          institutionId: id,
          kind: "lot",
          detail: `Status lot: ${patch.requestStatus ?? ""} ${patch.responseStatus ?? ""}`.trim(),
        });
      }
    }
    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut actualiza lotul.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
