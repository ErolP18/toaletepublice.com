import { NextResponse } from "next/server";
import { counties } from "@/lib/counties";
import {
  isInstitutionKind,
  isInstitutionResponse,
  isRequestStatus,
} from "@/lib/desk";
import { rejectCrossOrigin } from "@/lib/http";
import { isEmail, normalizeEmail } from "@/lib/mail/validate";
import { createInstitution, listInstitutions } from "@/lib/supabase/desk";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    return NextResponse.json(await listInstitutions());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut citi instituțiile.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Date invalide." }, { status: 400 });

  const name = readString(body.name);
  if (!name) return NextResponse.json({ error: "Numele instituției e obligatoriu." }, { status: 400 });

  const kind = body.kind ?? "primarie";
  const responseStatus = body.responseStatus ?? "fara_raspuns";
  if (!isInstitutionKind(kind) || !isInstitutionResponse(responseStatus)) {
    return NextResponse.json({ error: "Tip sau răspuns invalid." }, { status: 400 });
  }

  const county = readString(body.county);
  if (county && !(counties as readonly string[]).includes(county)) {
    return NextResponse.json({ error: "Județ necunoscut." }, { status: 400 });
  }

  const email = normalizeEmail(readString(body.email));
  if (email && !isEmail(email)) {
    return NextResponse.json({ error: "E-mail invalid." }, { status: 400 });
  }

  const now = new Date().toISOString();
  try {
    const saved = await createInstitution({
      id: crypto.randomUUID(),
      name,
      kind,
      county: county || null,
      city: readString(body.city) || null,
      email: email || null,
      website: readString(body.website) || null,
      responseStatus,
      requestStatus: isRequestStatus(body.requestStatus) ? body.requestStatus : "netrimisa",
      toiletsSummary: readString(body.toiletsSummary) || null,
      notes: readString(body.notes) || null,
      requestedAt: responseStatus === "fara_raspuns" ? now : readString(body.requestedAt) || now,
      respondedAt: responseStatus === "fara_raspuns" ? null : now,
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut salva.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
