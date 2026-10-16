import { NextResponse } from "next/server";
import { suggestPlaces } from "@/lib/geocode";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ places: [] });
  }

  try {
    const places = await suggestPlaces(query);
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ error: "Nu am putut căuta locul." }, { status: 502 });
  }
}
