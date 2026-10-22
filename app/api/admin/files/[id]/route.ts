import { NextResponse } from "next/server";
import { getStoredFile } from "@/lib/supabase/correspondence";
import { readReplyFile } from "@/lib/reply-files";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  const file = await getStoredFile(id);
  if (!file) return NextResponse.json({ error: "Nu există." }, { status: 404 });
  try {
    const bytes = await readReplyFile(file.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": file.mime,
        "content-disposition": `attachment; filename="${file.filename.replace(/"/g, "")}"`,
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fișierul nu mai e pe disc." }, { status: 404 });
  }
}
