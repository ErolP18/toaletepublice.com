import type { Toilet } from "./types";

export function normalizeQuery(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ro")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
