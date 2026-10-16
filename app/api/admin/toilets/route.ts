import { NextResponse } from "next/server";
import { isInsideRomaniaEnvelope } from "@/lib/romania";
import { createToilet, isToiletStatus, isToiletType, listAllToilets } from "@/lib/db/toilets";
import { counties } from "@/lib/counties";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  return NextResponse.json(await listAllToilets());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Date invalide." }, { status: 400 });

  const name = readString(body.name);
  const city = readString(body.city);
  const county = readString(body.county);
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!name || !city || !county) {
    return NextResponse.json({ error: "Nume, localitate și județ sunt obligatorii." }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInsideRomaniaEnvelope(lat, lng)) {
    return NextResponse.json({ error: "Coordonatele trebuie să fie în România." }, { status: 400 });
  }
  if (!(counties as readonly string[]).includes(county)) {
    return NextResponse.json({ error: "Județ necunoscut." }, { status: 400 });
  }
  if (!isToiletType(body.type) || !isToiletStatus(body.status ?? "confirmat")) {
    return NextResponse.json({ error: "Tip sau status invalid." }, { status: 400 });
  }

  const now = new Date();
  const toilet = await createToilet({
    id: crypto.randomUUID(),
    name,
    lat,
    lng,
    city,
    county,
    address: readString(body.address) || null,
    hours: readString(body.hours) || null,
    price: body.free === false ? readString(body.price) || null : null,
    accessible: Boolean(body.accessible),
    free: body.free !== false,
    type: body.type,
    status: (body.status as string) || "confirmat",
    notes: readString(body.notes) || null,
    source: readString(body.source) || "admin",
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json(toilet, { status: 201 });
}
