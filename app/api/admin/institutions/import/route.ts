import { NextResponse } from "next/server";
import { rejectCrossOrigin } from "@/lib/http";
import { primariiSeed } from "@/lib/primarii";
import { importInstitutions } from "@/lib/supabase/desk";

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;

  try {
    return NextResponse.json(await importInstitutions(primariiSeed()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut importa listele.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
