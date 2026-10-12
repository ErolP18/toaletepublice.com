import { findCity } from "./romania";
import type { Toilet } from "./types";

export type LocalityGroup = {
  city: string;
  county: string;
  count: number;
  lat: number;
  lng: number;
  toilets: Toilet[];
};

export function groupToiletsByLocality(toilets: Toilet[]): LocalityGroup[] {
  const groups = new Map<string, LocalityGroup>();
  for (const toilet of toilets) {
    const key = `${toilet.city}|${toilet.county}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.toilets.push(toilet);
      continue;
    }
    const known = findCity(toilet.city);
    groups.set(key, {
      city: toilet.city,
      county: toilet.county,
      count: 1,
      lat: known?.lat ?? toilet.lat,
      lng: known?.lng ?? toilet.lng,
      toilets: [toilet],
    });
  }
  return [...groups.values()].sort((a, b) => a.city.localeCompare(b.city, "ro"));
}

export function toiletCostLabel(toilet: Toilet) {
  if (toilet.free) return "Gratuit";
  if (toilet.price?.trim()) return toilet.price.trim();
  return "Cu plată";
}

export function normalizeQuery(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ro")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchesCity(city: string, county: string, query: string) {
  const q = normalizeQuery(query);
  if (!q) return true;
  return normalizeQuery(city).includes(q) || normalizeQuery(county).includes(q);
}

export function matchesToilet(toilet: Toilet, query: string) {
  const q = normalizeQuery(query);
  if (!q) return true;
  const haystack = [
    toilet.name,
    toilet.city,
    toilet.county,
    toilet.address ?? "",
    toilet.notes ?? "",
    toilet.hours ?? "",
    toilet.price ?? "",
  ]
    .map(normalizeQuery)
    .join(" ");
  return haystack.includes(q);
}

export function sortToilets(toilets: Toilet[]) {
  return [...toilets].sort((a, b) => {
    const county = a.county.localeCompare(b.county, "ro");
    if (county !== 0) return county;
    const city = a.city.localeCompare(b.city, "ro");
    if (city !== 0) return city;
    return a.name.localeCompare(b.name, "ro");
  });
}
