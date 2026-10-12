import { NextResponse } from "next/server";
import { ensureDb } from "@/lib/db/ensure";
import { listPublicToilets } from "@/lib/db/toilets";

export async function GET() {
  await ensureDb();
  const toilets = await listPublicToilets();
  return NextResponse.json(toilets);
}
