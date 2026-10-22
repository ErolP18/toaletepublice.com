import { NextResponse } from "next/server";
import { counties } from "@/lib/counties";
import { createToilet, isToiletStatus, isToiletType, listAllToilets } from "@/lib/db/toilets";
import { rejectCrossOrigin } from "@/lib/http";
import { isInsideRomaniaEnvelope } from "@/lib/romania";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    return NextResponse.json(await listAllToilets());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut citi toaletele.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;
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

  try {
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
    institutionId: readString(body.institutionId) || null,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json(toilet, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut salva.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
