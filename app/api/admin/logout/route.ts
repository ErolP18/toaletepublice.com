import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";

export async function POST() {
  const store = await cookies();
  store.delete(sessionCookie.name);
  return NextResponse.json({ ok: true });
}
