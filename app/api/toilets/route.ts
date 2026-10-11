import { NextResponse } from "next/server";
import toilets from "@/data/toilets.json";
import type { Toilet } from "@/lib/types";

export async function GET() {
  return NextResponse.json(toilets as Toilet[]);
}
