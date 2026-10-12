import { NextResponse } from "next/server";
import { reversePlace } from "@/lib/geocode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Coordonate lipsă." }, { status: 400 });
  }

  try {
    const place = await reversePlace(lat, lng);
    if (!place) {
      return NextResponse.json({ error: "Locul e în afara României." }, { status: 400 });
    }
    return NextResponse.json(place);
  } catch {
    return NextResponse.json(
      { error: "Nu am putut citi adresa de pe OpenStreetMap." },
      { status: 502 },
    );
  }
}
