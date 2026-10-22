import { NextResponse } from "next/server";
import { counties } from "@/lib/counties";
import { isInstitutionKind, isInstitutionResponse, isRequestStatus } from "@/lib/desk";
import { rejectCrossOrigin } from "@/lib/http";
import { isEmail, normalizeEmail } from "@/lib/mail/validate";
import {
  listEvents,
  listReplies,
  listRequests,
} from "@/lib/supabase/correspondence";
import {
  deleteInstitution,
  getInstitution,
  updateInstitution,
  type InstitutionWrite,
} from "@/lib/supabase/desk";

type Ctx = { params: Promise<{ id: string }> };

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    const item = await getInstitution(id);
    if (!item) return NextResponse.json({ error: "Nu există." }, { status: 404 });
    const [requests, replies, events] = await Promise.all([
      listRequests(id).catch(() => []),
      listReplies(id).catch(() => []),
      listEvents(id).catch(() => []),
    ]);
    return NextResponse.json({ ...item, requests, replies, events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut citi instituția.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request, context: Ctx) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const existing = await getInstitution(id);
    if (!existing) return NextResponse.json({ error: "Nu există." }, { status: 404 });

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Date invalide." }, { status: 400 });

    const patch: Partial<InstitutionWrite> = {};

    if ("name" in body) {
      const name = readString(body.name);
      if (!name) return NextResponse.json({ error: "Numele e obligatoriu." }, { status: 400 });
      patch.name = name;
    }
    if ("kind" in body) {
      if (!isInstitutionKind(body.kind)) {
        return NextResponse.json({ error: "Tip invalid." }, { status: 400 });
      }
      patch.kind = body.kind;
    }
    if ("responseStatus" in body) {
      if (!isInstitutionResponse(body.responseStatus)) {
        return NextResponse.json({ error: "Răspuns invalid." }, { status: 400 });
      }
      patch.responseStatus = body.responseStatus;
      if (body.responseStatus === "fara_raspuns") {
        patch.respondedAt = null;
      } else if (!existing.respondedAt) {
        patch.respondedAt = new Date().toISOString();
      }
    }
    if ("county" in body) {
      const county = readString(body.county);
      if (county && !(counties as readonly string[]).includes(county)) {
        return NextResponse.json({ error: "Județ necunoscut." }, { status: 400 });
      }
      patch.county = county || null;
    }
    if ("city" in body) patch.city = readString(body.city) || null;
    if ("requestStatus" in body) {
      if (!isRequestStatus(body.requestStatus)) {
        return NextResponse.json({ error: "Status de solicitare invalid." }, { status: 400 });
      }
      patch.requestStatus = body.requestStatus;
    }
    if ("email" in body) {
      const email = normalizeEmail(readString(body.email));
      if (email && !isEmail(email)) {
        return NextResponse.json({ error: "E-mail invalid." }, { status: 400 });
      }
      patch.email = email || null;
    }
    if ("website" in body) patch.website = readString(body.website) || null;
    if ("toiletsSummary" in body) patch.toiletsSummary = readString(body.toiletsSummary) || null;
    if ("notes" in body) patch.notes = readString(body.notes) || null;
    if ("mailed" in body || "lastEmailedAt" in body) {
      if (typeof body.mailed === "boolean") {
        patch.lastEmailedAt = body.mailed ? new Date().toISOString() : null;
      } else if (body.lastEmailedAt === null || body.lastEmailedAt === "") {
        patch.lastEmailedAt = null;
      } else if (typeof body.lastEmailedAt === "string") {
        patch.lastEmailedAt = body.lastEmailedAt;
      } else {
        return NextResponse.json({ error: "Marcaj de trimitere invalid." }, { status: 400 });
      }
      if (patch.lastEmailedAt && !existing.requestedAt) {
        patch.requestedAt = patch.lastEmailedAt;
      }
    }

    return NextResponse.json(await updateInstitution(id, patch));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut salva.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request, context: Ctx) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const removed = await deleteInstitution(id);
    if (!removed) return NextResponse.json({ error: "Nu există." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut șterge.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
