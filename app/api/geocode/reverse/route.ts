import { NextResponse } from "next/server";
import { reversePlace } from "@/lib/geocode";
import { clientIp } from "@/lib/http";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = rateLimit(`geo:${clientIp(request)}`, 80, 60_000);
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAt), { status: 429 });
  }
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
