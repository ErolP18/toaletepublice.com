import { NextResponse } from "next/server";
import { searchPlace } from "@/lib/geocode";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ place: null });
  }

  try {
    const place = await searchPlace(query);
    return NextResponse.json({ place });
  } catch {
    return NextResponse.json({ error: "Nu am putut căuta locul." }, { status: 502 });
  }
}
