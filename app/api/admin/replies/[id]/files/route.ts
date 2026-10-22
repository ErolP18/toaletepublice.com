import { NextResponse } from "next/server";
import { rejectCrossOrigin } from "@/lib/http";
import { saveReplyFile } from "@/lib/reply-files";
import { addReplyFile, getReply } from "@/lib/supabase/correspondence";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  const { id } = await context.params;
  const reply = await getReply(id);
  if (!reply) return NextResponse.json({ error: "Răspunsul nu există." }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Alege un PDF sau o imagine." }, { status: 400 });
  }

  try {
    const saved = await saveReplyFile(id, file);
    await addReplyFile(id, saved);
    return NextResponse.json(
      { id: saved.id, filename: saved.filename, mime: saved.mime, byteSize: saved.byteSize },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut salva fișierul.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
