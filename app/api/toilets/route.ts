import { NextResponse } from "next/server";
import { listPublicToilets } from "@/lib/db/toilets";

export async function GET() {
  try {
    const toilets = await listPublicToilets();
    return NextResponse.json(toilets);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut citi toaletele.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
