import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";
import { rejectCrossOrigin } from "@/lib/http";

export async function POST(request: Request) {
  const denied = rejectCrossOrigin(request);
  if (denied) return denied;
  const store = await cookies();
  store.delete(sessionCookie.name);
  return NextResponse.json({ ok: true });
}
