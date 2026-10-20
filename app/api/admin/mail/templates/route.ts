import { NextResponse } from "next/server";
import { rejectCrossOrigin } from "@/lib/http";
import { cleanBody, cleanHeader } from "@/lib/mail/validate";
import { listTemplates, updateTemplate } from "@/lib/supabase/desk";

export async function GET() {
  try {
    return NextResponse.json(await listTemplates());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut citi șabloanele.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Date invalide." }, { status: 400 });

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Șablonul lipsește." }, { status: 400 });

  const name = typeof body.name === "string" ? cleanHeader(body.name, 80) : undefined;
  const subject = typeof body.subject === "string" ? cleanHeader(body.subject, 180) : undefined;
  const text = typeof body.body === "string" ? cleanBody(body.body) : undefined;
  if (subject !== undefined && !subject) {
    return NextResponse.json({ error: "Subiectul e gol." }, { status: 400 });
  }
  if (text !== undefined && !text) {
    return NextResponse.json({ error: "Textul e gol." }, { status: 400 });
  }

  try {
    const saved = await updateTemplate(id, { name, subject, body: text });
    if (!saved) return NextResponse.json({ error: "Șablonul nu există." }, { status: 404 });
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut salva șablonul.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
