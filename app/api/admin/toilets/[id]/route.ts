import { NextResponse } from "next/server";
import { counties } from "@/lib/counties";
import { ensureDb } from "@/lib/db/ensure";
import { deleteToilet, getToilet, isToiletStatus, isToiletType, updateToilet } from "@/lib/db/toilets";
import { deleteToiletPhoto } from "@/lib/photo";
import { isInsideRomaniaEnvelope } from "@/lib/romania";
import type { ToiletInsert } from "@/lib/db/schema";

type Ctx = { params: Promise<{ id: string }> };

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, context: Ctx) {
  await ensureDb();
  const { id } = await context.params;
  const existing = await getToilet(id);
  if (!existing) return NextResponse.json({ error: "Nu există." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Date invalide." }, { status: 400 });

  const patch: Partial<ToiletInsert> = {};

  if ("name" in body) {
    const name = readString(body.name);
    if (!name) return NextResponse.json({ error: "Numele e obligatoriu." }, { status: 400 });
    patch.name = name;
  }
  if ("city" in body) {
    const city = readString(body.city);
    if (!city) return NextResponse.json({ error: "Localitatea e obligatorie." }, { status: 400 });
    patch.city = city;
  }
  if ("county" in body) {
    const county = readString(body.county);
    if (!(counties as readonly string[]).includes(county)) {
      return NextResponse.json({ error: "Județ necunoscut." }, { status: 400 });
    }
    patch.county = county;
  }
  if ("lat" in body || "lng" in body) {
    const lat = "lat" in body ? Number(body.lat) : existing.lat;
    const lng = "lng" in body ? Number(body.lng) : existing.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInsideRomaniaEnvelope(lat, lng)) {
      return NextResponse.json({ error: "Coordonatele trebuie să fie în România." }, { status: 400 });
    }
    patch.lat = lat;
    patch.lng = lng;
  }
  if ("address" in body) patch.address = readString(body.address) || null;
  if ("hours" in body) patch.hours = readString(body.hours) || null;
  if ("free" in body) patch.free = Boolean(body.free);
  if ("price" in body || "free" in body) {
    const free = "free" in body ? Boolean(body.free) : existing.free;
    patch.price = free ? null : readString(body.price ?? existing.price) || null;
  }
  if ("notes" in body) patch.notes = readString(body.notes) || null;
  if ("source" in body) patch.source = readString(body.source) || null;
  if ("accessible" in body) patch.accessible = Boolean(body.accessible);
  if ("type" in body) {
    if (!isToiletType(body.type)) return NextResponse.json({ error: "Tip invalid." }, { status: 400 });
    patch.type = body.type;
  }
  if ("status" in body) {
    if (!isToiletStatus(body.status)) {
      return NextResponse.json({ error: "Status invalid." }, { status: 400 });
    }
    patch.status = body.status;
  }

  return NextResponse.json(await updateToilet(id, patch));
}

export async function DELETE(_request: Request, context: Ctx) {
  await ensureDb();
  const { id } = await context.params;
  const removed = await deleteToilet(id);
  if (!removed) return NextResponse.json({ error: "Nu există." }, { status: 404 });
  await deleteToiletPhoto(removed.photo);
  return NextResponse.json({ ok: true });
}
