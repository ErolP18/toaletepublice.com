import { NextResponse } from "next/server";
import { clientIp } from "@/lib/http";
import { isInsideRomaniaEnvelope } from "@/lib/romania";
import { isGoogleMapsUrl, parseMapsCoords } from "@/lib/maps";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = rateLimit(`maps:${clientIp(request)}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAt), { status: 429 });
  }

  const raw = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  if (!raw || raw.length > 2000 || !isGoogleMapsUrl(raw)) {
    return NextResponse.json({ error: "Lipește un link din Google Maps." }, { status: 400 });
  }

  const direct = parseMapsCoords(raw);
  if (direct) return pointResponse(direct);

  try {
    const resolved = await resolveMapsUrl(raw);
    if (!resolved) {
      return NextResponse.json(
        { error: "Nu am găsit coordonatele. Deschide linkul și copiază adresa lungă din bară." },
        { status: 422 },
      );
    }
    return pointResponse(resolved);
  } catch {
    return NextResponse.json({ error: "Nu am putut citi linkul din Google Maps." }, { status: 502 });
  }
}

function pointResponse(point: { lat: number; lng: number }) {
  if (!isInsideRomaniaEnvelope(point.lat, point.lng)) {
    return NextResponse.json({ error: "Locul pare în afara României." }, { status: 422 });
  }
  return NextResponse.json(point);
}

async function resolveMapsUrl(raw: string) {
  let current = raw;
  for (let hop = 0; hop < 4; hop += 1) {
    if (!isGoogleMapsUrl(current)) return null;
    const parsed = parseMapsCoords(current);
    if (parsed) return parsed;

    const response = await fetch(current, {
      redirect: "manual",
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });

    const location = response.headers.get("location");
    if (location && [301, 302, 303, 307, 308].includes(response.status)) {
      current = new URL(location, current).toString();
      continue;
    }

    const finalUrl = response.url || current;
    if (!isGoogleMapsUrl(finalUrl)) return null;
    const fromFinal = parseMapsCoords(finalUrl);
    if (fromFinal) return fromFinal;
    if (!response.ok) return null;
    const body = await response.text();
    return parseMapsCoords(body.slice(0, 40_000));
  }
  return parseMapsCoords(current);
}
