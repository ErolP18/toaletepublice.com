import { counties } from "./counties";
import { isInsideRomaniaEnvelope } from "./romania";

const USER_AGENT =
  "toaletepublice.com/0.1 (https://github.com/ErolP18/toaletepublice.com)";

type NominatimAddress = {
  road?: string;
  pedestrian?: string;
  footway?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  house_number?: string;
};

export type PlaceKind = "street" | "locality" | "county" | "place";

export type Place = {
  lat: number;
  lng: number;
  zoom: number;
  address: string;
  city: string;
  county: string;
  label: string;
  kind: PlaceKind;
};

export function matchCounty(value?: string, city?: string) {
  const haystack = `${value ?? ""} ${city ?? ""}`.toLocaleLowerCase("ro");
  if (haystack.includes("bucurești") || haystack.includes("bucuresti")) {
    return "București";
  }
  if (!value) return "";
  const cleaned = value.replace(/^județul\s+/i, "").replace(/^municipiul\s+/i, "").trim();
  const found = counties.find(
    (county) => county.toLocaleLowerCase("ro") === cleaned.toLocaleLowerCase("ro"),
  );
  return found ?? cleaned;
}

export function localityFromAddress(address: NominatimAddress) {
  return (
    address.city ||
    address.town ||
    address.municipality ||
    address.village ||
    address.suburb ||
    ""
  );
}

export function streetFromAddress(address: NominatimAddress) {
  const street = address.road || address.pedestrian || address.footway || "";
  const house = address.house_number ? ` ${address.house_number}` : "";
  return street ? `${street}${house}` : "";
}

function kindFor(addresstype?: string): PlaceKind {
  switch (addresstype) {
    case "road":
    case "residential":
    case "pedestrian":
    case "path":
    case "building":
      return "street";
    case "county":
    case "state":
      return "county";
    case "city":
    case "town":
    case "village":
    case "municipality":
    case "hamlet":
    case "suburb":
    case "neighbourhood":
      return "locality";
    default:
      return "place";
  }
}

function zoomFor(addresstype?: string) {
  switch (kindFor(addresstype)) {
    case "street":
      return 18;
    case "locality":
      return addresstype === "village" || addresstype === "hamlet" || addresstype === "suburb"
        ? 15
        : 13;
    case "county":
      return 9;
    default:
      return 16;
  }
}

async function nominatim(url: URL) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("OpenStreetMap nu a răspuns.");
  }
  return response.json();
}

function toPlace(
  lat: number,
  lng: number,
  address: NominatimAddress,
  displayName: string,
  addresstype?: string,
): Place | null {
  if (!isInsideRomaniaEnvelope(lat, lng)) return null;
  const city = localityFromAddress(address);
  const street = streetFromAddress(address);
  return {
    lat,
    lng,
    zoom: zoomFor(addresstype),
    address: street || displayName,
    city,
    county: matchCounty(address.county ?? address.state, city),
    label: displayName,
    kind: street ? "street" : kindFor(addresstype),
  };
}

const searchCache = new Map<string, { expires: number; places: Place[] }>();
const SEARCH_CACHE_MS = 10 * 60 * 1000;

export async function reversePlace(lat: number, lng: number): Promise<Place | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "ro");

  const data = (await nominatim(url)) as {
    lat?: string;
    lon?: string;
    addresstype?: string;
    display_name?: string;
    address?: NominatimAddress;
  };

  return toPlace(
    Number(data.lat ?? lat),
    Number(data.lon ?? lng),
    data.address ?? {},
    data.display_name ?? "",
    data.addresstype,
  );
}

export async function searchPlaces(query: string): Promise<Place[]> {
  const key = query.trim().toLocaleLowerCase("ro");
  const cached = searchCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.places;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "ro");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");
  url.searchParams.set("accept-language", "ro");
  url.searchParams.set("viewbox", "20.26,48.27,30.05,43.62");

  const results = (await nominatim(url)) as Array<{
    lat: string;
    lon: string;
    addresstype?: string;
    display_name?: string;
    address?: NominatimAddress;
  }>;

  const seen = new Set<string>();
  const places: Place[] = [];
  for (const item of results) {
    const place = toPlace(
      Number(item.lat),
      Number(item.lon),
      item.address ?? {},
      item.display_name ?? query,
      item.addresstype,
    );
    if (!place) continue;
    const dedupe = `${place.kind}|${place.city}|${place.county}|${place.lat.toFixed(3)}|${place.lng.toFixed(3)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    places.push(place);
  }

  searchCache.set(key, { expires: Date.now() + SEARCH_CACHE_MS, places });
  return places;
}

export async function searchPlace(query: string): Promise<Place | null> {
  return (await searchPlaces(query))[0] ?? null;
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    osm_key?: string;
    osm_value?: string;
  };
};

function photonKind(osmKey?: string, osmValue?: string): PlaceKind {
  if (osmKey === "highway") return "street";
  if (osmValue === "county" || osmValue === "state") return "county";
  if (
    osmValue === "city" ||
    osmValue === "town" ||
    osmValue === "village" ||
    osmValue === "municipality" ||
    osmValue === "hamlet" ||
    osmValue === "suburb" ||
    osmValue === "neighbourhood"
  ) {
    return "locality";
  }
  return "place";
}

function photonToPlace(feature: PhotonFeature): Place | null {
  const coords = feature.geometry?.coordinates;
  const props = feature.properties ?? {};
  if (!coords || coords.length < 2) return null;
  const lng = coords[0];
  const lat = coords[1];
  if (!isInsideRomaniaEnvelope(lat, lng)) return null;
  const country = (props.country ?? "").toLocaleLowerCase("ro");
  if (country && country !== "românia" && country !== "romania") return null;
  if (!props.name && !props.city && !props.street && !props.county) return null;

  const kind = photonKind(props.osm_key, props.osm_value);
  const name = props.name?.trim() ?? "";
  const parentCity = (props.city || props.district || "").trim();
  const city = kind === "locality" ? name || parentCity : parentCity || name;
  const county = matchCounty(props.county ?? props.state, city || name);
  const streetName = props.street || (kind === "street" ? name : "");
  const street = streetName
    ? `${streetName}${props.housenumber ? ` ${props.housenumber}` : ""}`
    : "";
  const label = [street || props.name, city, county].filter(Boolean).join(", ");

  return {
    lat,
    lng,
    zoom: kind === "street" ? 18 : kind === "county" ? 9 : city && kind === "locality" ? 14 : 16,
    address: street || label,
    city: city || (kind === "locality" ? props.name ?? "" : ""),
    county,
    label,
    kind: street ? "street" : kind,
  };
}

export async function suggestPlaces(query: string): Promise<Place[]> {
  const key = `sug:${query.trim().toLocaleLowerCase("ro")}`;
  const cached = searchCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.places;

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "default");
  url.searchParams.set("bbox", "20.26,43.62,30.05,48.27");

  const data = (await nominatim(url)) as { features?: PhotonFeature[] };
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const feature of data.features ?? []) {
    const place = photonToPlace(feature);
    if (!place) continue;
    const dedupe = `${place.kind}|${place.city}|${place.county}|${place.lat.toFixed(3)}|${place.lng.toFixed(3)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    places.push(place);
  }

  searchCache.set(key, { expires: Date.now() + SEARCH_CACHE_MS, places });
  return places;
}

export async function fetchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const response = await fetch(`/api/geocode/suggest?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) return [];
  const data = (await response.json()) as { places?: Place[] };
  return data.places ?? [];
}

export async function fetchPlace(query: string): Promise<Place | null> {
  const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) return null;
  const data = (await response.json()) as { place?: Place | null };
  return data.place ?? null;
}
