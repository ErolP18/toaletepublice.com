import type { Map as MapLibreMap } from "maplibre-gl";
import outline from "@/data/romania-outline.json";

type Position = [number, number];
type Ring = Position[];

const OUTER: Ring = [
  [10, 38],
  [40, 38],
  [40, 55],
  [10, 55],
  [10, 38],
];

function reverseRing(ring: Ring): Ring {
  return [...ring].reverse();
}

export const romaniaOutline = outline;

export const romaniaMask = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "Polygon" as const,
    coordinates: [OUTER, reverseRing(outline.geometry.coordinates[0] as Ring)],
  },
};

export function applyRomaniaMask(map: MapLibreMap) {
  if (map.getSource("romania-mask")) return;

  map.addSource("romania-mask", {
    type: "geojson",
    data: romaniaMask,
  });
  map.addSource("romania-outline", {
    type: "geojson",
    data: outline,
  });

  map.addLayer({
    id: "romania-mask-fill",
    type: "fill",
    source: "romania-mask",
    paint: {
      "fill-color": "#f4efe4",
      "fill-opacity": 1,
    },
  });
  map.addLayer({
    id: "romania-outline",
    type: "line",
    source: "romania-outline",
    paint: {
      "line-color": "#1b4d46",
      "line-opacity": 0.45,
      "line-width": 1.25,
    },
  });
}

export function isClickOutsideRomania(map: MapLibreMap, point: { x: number; y: number }) {
  if (!map.getLayer("romania-mask-fill")) return false;
  return map.queryRenderedFeatures(point, { layers: ["romania-mask-fill"] }).length > 0;
}
