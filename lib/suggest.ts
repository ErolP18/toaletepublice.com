import { counties } from "./counties";
import type { Place } from "./geocode";
import { cities } from "./romania";
import { normalizeQuery } from "./toilets";
import type { Toilet } from "./types";

export type SuggestionKind = "county" | "city" | "toilet" | "street" | "place";

export type SearchSuggestion = {
  id: string;
  kind: SuggestionKind;
  title: string;
  subtitle: string;
  query: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  toiletId?: string;
};

export const suggestionKindLabels: Record<SuggestionKind, string> = {
  county: "Județ",
  city: "Localitate",
  toilet: "Toaletă",
  street: "Stradă",
  place: "Loc",
};

function folded(value: string) {
  return normalizeQuery(value.replace(/^județul\s+/i, "").replace(/^jud\.?\s+/i, ""));
}

function matchScore(value: string, query: string) {
  const haystack = folded(value);
  const needle = folded(query);
  if (!needle || !haystack.includes(needle)) return 99;
  if (haystack === needle) return 0;
  if (haystack.startsWith(needle)) return 1;
  return 2 + haystack.indexOf(needle) / 100;
}

export function placeToSuggestion(place: Place): SearchSuggestion | null {
  const countyLine =
    place.county && place.county !== "București" ? `județul ${place.county}` : place.county;
  const street = place.kind === "street" && place.address !== place.label ? place.address : "";

  if (place.kind === "county" || (!place.city && place.county && place.zoom <= 9)) {
    if (!place.county.trim()) return null;
    const title = place.county === "București" ? "București" : `județul ${place.county}`;
    return {
      id: `osm-${place.lat.toFixed(4)}-${place.lng.toFixed(4)}`,
      kind: "county",
      title,
      subtitle: "",
      query: place.county,
      lat: place.lat,
      lng: place.lng,
      zoom: 9,
    };
  }

  if (street) {
    if (!street.trim()) return null;
    return {
      id: `osm-${place.lat.toFixed(4)}-${place.lng.toFixed(4)}`,
      kind: "street",
      title: street,
      subtitle: [place.city, countyLine].filter(Boolean).join(", "),
      query: [street, place.city].filter(Boolean).join(", "),
      lat: place.lat,
      lng: place.lng,
      zoom: place.zoom,
    };
  }

  const title = (place.city || place.label.split(",")[0] || place.label).trim();
  if (!title) return null;
  return {
    id: `osm-${place.lat.toFixed(4)}-${place.lng.toFixed(4)}`,
    kind: place.kind === "locality" ? "city" : "place",
    title,
    subtitle: countyLine && title !== place.county ? countyLine : "",
    query: title,
    lat: place.lat,
    lng: place.lng,
    zoom: place.zoom,
  };
}

export function localSuggestions(query: string, toilets: Toilet[]): SearchSuggestion[] {
  const needle = folded(query);
  if (needle.length < 2) return [];

  const ranked: Array<SearchSuggestion & { score: number }> = [];

  for (const county of counties) {
    const score = Math.min(matchScore(county, query), matchScore(`județul ${county}`, query));
    if (score >= 99) continue;
    ranked.push({
      id: `county-${county}`,
      kind: "county",
      title: county === "București" ? "București" : `județul ${county}`,
      subtitle: "",
      query: county,
      score,
    });
  }

  for (const city of cities) {
    const score = Math.min(matchScore(city.name, query), matchScore(city.county, query));
    if (score >= 99) continue;
    ranked.push({
      id: `city-${city.name}-${city.county}`,
      kind: "city",
      title: city.name,
      subtitle: city.county === "București" ? "București" : `județul ${city.county}`,
      query: city.name,
      lat: city.lat,
      lng: city.lng,
      zoom: city.zoom,
      score,
    });
  }

  const localities = new Set<string>();
  for (const toilet of toilets) {
    const locKey = `${toilet.city}|${toilet.county}`;
    if (!localities.has(locKey)) {
      localities.add(locKey);
      const score = Math.min(matchScore(toilet.city, query), matchScore(toilet.county, query));
      if (score < 99) {
        ranked.push({
          id: `loc-${locKey}`,
          kind: "city",
          title: toilet.city,
          subtitle: toilet.county === "București" ? "București" : `județul ${toilet.county}`,
          query: toilet.city,
          lat: toilet.lat,
          lng: toilet.lng,
          zoom: 14,
          score,
        });
      }
    }

    const toiletScore = Math.min(
      matchScore(toilet.name, query),
      matchScore(toilet.address ?? "", query),
    );
    if (toiletScore >= 99) continue;
    ranked.push({
      id: `toilet-${toilet.id}`,
      kind: "toilet",
      title: toilet.name,
      subtitle: [toilet.address || toilet.city, `județul ${toilet.county}`]
        .filter(Boolean)
        .join(", "),
      query: toilet.name,
      lat: toilet.lat,
      lng: toilet.lng,
      zoom: 17,
      toiletId: toilet.id,
      score: toiletScore,
    });
  }

  ranked.sort((a, b) => a.score - b.score || a.title.localeCompare(b.title, "ro"));

  const seen = new Set<string>();
  const unique: SearchSuggestion[] = [];
  for (const item of ranked) {
    const key = folded(`${item.kind}|${item.title}|${item.subtitle}`);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 8) break;
  }
  return unique;
}

export function mergeSuggestions(
  local: SearchSuggestion[],
  remote: SearchSuggestion[],
): SearchSuggestion[] {
  const seen = new Set(local.map((item) => folded(`${item.title}|${item.subtitle}`)));
  const merged = [...local];
  for (const item of remote) {
    const key = folded(`${item.title}|${item.subtitle}`);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= 8) break;
  }
  return merged;
}
