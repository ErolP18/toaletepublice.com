import type { Toilet } from "./types";

const STORAGE_KEY = "toaletepublice.propuneri";

export function readLocalToilets(): Toilet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Toilet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalToilets(toilets: Toilet[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toilets));
}

export function addLocalToilet(toilet: Toilet) {
  const next = [...readLocalToilets(), toilet];
  writeLocalToilets(next);
  return next;
}

export function removeLocalToilet(id: string) {
  const next = readLocalToilets().filter((toilet) => toilet.id !== id);
  writeLocalToilets(next);
  return next;
}
