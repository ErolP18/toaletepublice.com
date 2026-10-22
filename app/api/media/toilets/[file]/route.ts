import { NextResponse } from "next/server";
import { readToiletPhoto } from "@/lib/photo";

type Ctx = { params: Promise<{ file: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { file } = await context.params;
  const photo = await readToiletPhoto(file);
  if (!photo) return new NextResponse(null, { status: 404 });
  return new NextResponse(photo.bytes, {
    headers: {
      "content-type": photo.mime,
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}
