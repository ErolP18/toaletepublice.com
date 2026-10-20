import { NextResponse } from "next/server";
import { suggestPlaces } from "@/lib/geocode";
import { clientIp } from "@/lib/http";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = rateLimit(`geo:${clientIp(request)}`, 80, 60_000);
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAt), { status: 429 });
  }
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
