import { NextResponse } from "next/server";
import { requestHost } from "./origin";

export function clientIp(request: Request) {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 80);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.slice(0, 80);
  return "unknown";
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return request.headers.get("sec-fetch-site") === "same-origin";
  }
  try {
    return new URL(origin).host === requestHost(request);
  } catch {
    return false;
  }
}

export function rejectCrossOrigin(request: Request) {
  if (isSameOrigin(request)) return null;
  return NextResponse.json({ error: "Cerere invalidă." }, { status: 403 });
}
