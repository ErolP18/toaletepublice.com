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

export type Place = {
  lat: number;
  lng: number;
  zoom: number;
  address: string;
  city: string;
  county: string;
  label: string;
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

function zoomFor(addresstype?: string) {
  switch (addresstype) {
    case "road":
    case "residential":
    case "pedestrian":
    case "path":
    case "building":
      return 18;
    case "neighbourhood":
    case "suburb":
    case "hamlet":
    case "village":
      return 15;
    case "town":
    case "city":
    case "municipality":
    case "administrative":
    case "county":
      return 13;
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
  return {
    lat,
    lng,
    zoom: zoomFor(addresstype),
    address: streetFromAddress(address) || displayName,
    city,
    county: matchCounty(address.county ?? address.state, city),
    label: displayName,
  };
}

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

export async function searchPlace(query: string): Promise<Place | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "ro");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("accept-language", "ro");
  url.searchParams.set("viewbox", "20.26,48.27,30.05,43.62");

  const results = (await nominatim(url)) as Array<{
    lat: string;
    lon: string;
    addresstype?: string;
    display_name?: string;
    address?: NominatimAddress;
  }>;

  for (const item of results) {
    const place = toPlace(
      Number(item.lat),
      Number(item.lon),
      item.address ?? {},
      item.display_name ?? query,
      item.addresstype,
    );
    if (place) return place;
  }
  return null;
}

export async function fetchPlace(query: string): Promise<Place | null> {
  const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) return null;
  const data = (await response.json()) as { place?: Place | null };
  return data.place ?? null;
}
