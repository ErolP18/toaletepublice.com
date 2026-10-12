export const ROMANIA_CENTER: [number, number] = [24.97, 45.94];

/** Official envelope: Beba Veche → Delta → Zimnicea → Horodiștea. */
export const ROMANIA_BOUNDS: [[number, number], [number, number]] = [
  [20.26, 43.62],
  [30.05, 48.27],
];

/** Tight pad around the country so the paper mask stays in frame. */
export const ROMANIA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [19.55, 43.05],
  [30.75, 48.85],
];

export const MAP_STYLES = {
  liberty: {
    id: "liberty",
    label: "Străzi",
    url: "https://tiles.openfreemap.org/styles/liberty",
  },
  bright: {
    id: "bright",
    label: "Clar",
    url: "https://tiles.openfreemap.org/styles/bright",
  },
  positron: {
    id: "positron",
    label: "Minimal",
    url: "https://tiles.openfreemap.org/styles/positron",
  },
} as const;

export type MapStyleId = keyof typeof MAP_STYLES;

export const cities: { name: string; county: string; lat: number; lng: number; zoom: number }[] = [
  { name: "București", county: "București", lat: 44.4268, lng: 26.1025, zoom: 12 },
  { name: "Cluj-Napoca", county: "Cluj", lat: 46.7712, lng: 23.6236, zoom: 13 },
  { name: "Timișoara", county: "Timiș", lat: 45.7489, lng: 21.2087, zoom: 13 },
  { name: "Iași", county: "Iași", lat: 47.1585, lng: 27.6014, zoom: 13 },
  { name: "Constanța", county: "Constanța", lat: 44.1598, lng: 28.6348, zoom: 13 },
  { name: "Brașov", county: "Brașov", lat: 45.6427, lng: 25.5887, zoom: 13 },
  { name: "Craiova", county: "Dolj", lat: 44.3302, lng: 23.7949, zoom: 13 },
  { name: "Galați", county: "Galați", lat: 45.4353, lng: 28.008, zoom: 13 },
  { name: "Ploiești", county: "Prahova", lat: 44.9416, lng: 26.0225, zoom: 13 },
  { name: "Oradea", county: "Bihor", lat: 47.0465, lng: 21.9189, zoom: 13 },
  { name: "Brăila", county: "Brăila", lat: 45.2692, lng: 27.9575, zoom: 13 },
  { name: "Arad", county: "Arad", lat: 46.1866, lng: 21.3123, zoom: 13 },
  { name: "Pitești", county: "Argeș", lat: 44.8565, lng: 24.8692, zoom: 13 },
  { name: "Sibiu", county: "Sibiu", lat: 45.7983, lng: 24.1256, zoom: 13 },
  { name: "Bacău", county: "Bacău", lat: 46.567, lng: 26.914, zoom: 13 },
  { name: "Târgu Mureș", county: "Mureș", lat: 46.5386, lng: 24.5515, zoom: 13 },
  { name: "Baia Mare", county: "Maramureș", lat: 47.6531, lng: 23.5795, zoom: 13 },
  { name: "Buzău", county: "Buzău", lat: 45.15, lng: 26.8333, zoom: 13 },
  { name: "Botoșani", county: "Botoșani", lat: 47.748, lng: 26.669, zoom: 13 },
  { name: "Satu Mare", county: "Satu Mare", lat: 47.792, lng: 22.885, zoom: 13 },
  { name: "Râmnicu Vâlcea", county: "Vâlcea", lat: 45.0997, lng: 24.3693, zoom: 13 },
  { name: "Suceava", county: "Suceava", lat: 47.6514, lng: 26.2556, zoom: 13 },
  { name: "Piatra Neamț", county: "Neamț", lat: 46.927, lng: 26.3705, zoom: 13 },
  { name: "Drobeta-Turnu Severin", county: "Mehedinți", lat: 44.6316, lng: 22.656, zoom: 13 },
  { name: "Focșani", county: "Vrancea", lat: 45.6967, lng: 27.1827, zoom: 13 },
  { name: "Târgoviște", county: "Dâmbovița", lat: 44.9254, lng: 25.456, zoom: 13 },
  { name: "Tulcea", county: "Tulcea", lat: 45.178, lng: 28.805, zoom: 13 },
  { name: "Târgu Jiu", county: "Gorj", lat: 45.0386, lng: 23.274, zoom: 13 },
  { name: "Reșița", county: "Caraș-Severin", lat: 45.3, lng: 21.889, zoom: 13 },
  { name: "Slatina", county: "Olt", lat: 44.43, lng: 24.364, zoom: 13 },
  { name: "Bistrița", county: "Bistrița-Năsăud", lat: 47.1333, lng: 24.5, zoom: 13 },
  { name: "Alba Iulia", county: "Alba", lat: 46.0667, lng: 23.57, zoom: 13 },
  { name: "Deva", county: "Hunedoara", lat: 45.8833, lng: 22.9, zoom: 13 },
  { name: "Zalău", county: "Sălaj", lat: 47.1844, lng: 23.057, zoom: 13 },
  { name: "Sfântu Gheorghe", county: "Covasna", lat: 45.8636, lng: 25.7875, zoom: 13 },
  { name: "Vaslui", county: "Vaslui", lat: 46.6407, lng: 27.7276, zoom: 13 },
  { name: "Giurgiu", county: "Giurgiu", lat: 43.9037, lng: 25.9699, zoom: 13 },
  { name: "Slobozia", county: "Ialomița", lat: 44.5647, lng: 27.3636, zoom: 13 },
  { name: "Călărași", county: "Călărași", lat: 44.2048, lng: 27.331, zoom: 13 },
  { name: "Alexandria", county: "Teleorman", lat: 43.9686, lng: 25.3333, zoom: 13 },
  { name: "Miercurea Ciuc", county: "Harghita", lat: 46.3598, lng: 25.8036, zoom: 13 },
];

export function isInsideRomaniaEnvelope(lat: number, lng: number) {
  const [[minLng, minLat], [maxLng, maxLat]] = ROMANIA_BOUNDS;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

export function findCity(query: string) {
  const q = query.trim().toLocaleLowerCase("ro");
  if (!q) return undefined;
  return cities.find(
    (city) =>
      city.name.toLocaleLowerCase("ro") === q ||
      city.name.toLocaleLowerCase("ro").includes(q),
  );
}
