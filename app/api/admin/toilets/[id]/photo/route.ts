import { NextResponse } from "next/server";
import { getToilet, updateToilet } from "@/lib/db/toilets";
import { deleteToiletPhoto, saveToiletPhoto } from "@/lib/photo";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  const { id } = await context.params;
  const existing = await getToilet(id);
  if (!existing) return NextResponse.json({ error: "Nu există." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Alege o poză." }, { status: 400 });
  }

  try {
    const photo = await saveToiletPhoto(id, file, existing.photo);
    return NextResponse.json(await updateToilet(id, { photo }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut salva poza.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  const { id } = await context.params;
  const existing = await getToilet(id);
  if (!existing) return NextResponse.json({ error: "Nu există." }, { status: 404 });
  await deleteToiletPhoto(existing.photo);
  return NextResponse.json(await updateToilet(id, { photo: null }));
}
