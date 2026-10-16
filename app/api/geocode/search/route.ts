import { NextResponse } from "next/server";
import { searchPlaces } from "@/lib/geocode";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ place: null, places: [] });
  }

  try {
    const places = await searchPlaces(query);
    return NextResponse.json({ place: places[0] ?? null, places });
  } catch {
    return NextResponse.json({ error: "Nu am putut căuta locul." }, { status: 502 });
  }
}
