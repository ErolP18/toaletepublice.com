export type MapsPoint = { lat: number; lng: number };

function hostnameOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isGoogleMapsUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return false;
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "maps.app.goo.gl") return true;
    if (host === "goo.gl") return url.pathname.startsWith("/maps");
    if (host === "maps.google.com" || host === "maps.google.ro") return true;
    if (host === "google.com" || host === "google.ro") {
      return url.pathname.startsWith("/maps");
    }
    return false;
  } catch {
    return false;
  }
}

export function googleMapsPlaceUrl(lat: number, lng: number, source?: string) {
  const original = source?.trim();
  if (original && isGoogleMapsUrl(original)) return original;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function parseLatLngPair(value: string): MapsPoint | null {
  const match = value
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  return finitePoint(Number(match[1]), Number(match[2]));
}

export function parseMapsCoords(value: string): MapsPoint | null {
  const raw = value.trim();
  if (!raw) return null;
  const pair = parseLatLngPair(raw);
  if (pair) return pair;

  const fromData = [...raw.matchAll(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/g)].at(-1);
  if (fromData) return finitePoint(Number(fromData[1]), Number(fromData[2]));

  const fromAt = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (fromAt) return finitePoint(Number(fromAt[1]), Number(fromAt[2]));

  if (!isGoogleMapsUrl(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  for (const key of ["q", "query", "destination", "ll", "cbll"]) {
    const param = url.searchParams.get(key);
    if (!param) continue;
    const point = parseLatLngPair(param);
    if (point) return point;
  }
  return null;
}

export function needsMapsResolve(value: string) {
  if (parseMapsCoords(value)) return false;
  const host = hostnameOf(value);
  return host === "maps.app.goo.gl" || host === "goo.gl";
}

function finitePoint(lat: number, lng: number): MapsPoint | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
