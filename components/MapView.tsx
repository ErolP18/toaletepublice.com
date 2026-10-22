"use client";

import { useEffect, useRef } from "react";
import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
} from "maplibre-gl";
import {
  MAP_STYLES,
  ROMANIA_BOUNDS,
  ROMANIA_CENTER,
  ROMANIA_MAX_BOUNDS,
  type MapStyleId,
} from "@/lib/romania";
import { applyRomaniaMask, isClickOutsideRomania } from "@/lib/romania-mask";
import { ensureMapLibreWorker } from "@/lib/maplibre-worker";
import type { Toilet } from "@/lib/types";

type FlyTo = { lat: number; lng: number; zoom?: number };

type MapViewProps = {
  toilets: Toilet[];
  selectedId: string | null;
  addMode: boolean;
  draftPoint: { lat: number; lng: number } | null;
  styleId: MapStyleId;
  flyTo: FlyTo | null;
  onSelect: (id: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  onFlyComplete: () => void;
};

function collapseAttribution(map: MapLibreMap) {
  if (map.getCanvasContainer().offsetWidth > 640) return;
  const el = map.getContainer().querySelector(".maplibregl-ctrl-attrib");
  if (!(el instanceof HTMLElement)) return;
  el.classList.remove("maplibregl-compact-show");
  el.removeAttribute("open");
}

function pinElement(kind: "toilet" | "draft" | "active") {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `map-pin map-pin-${kind}`;
  const size = kind === "active" ? 32 : kind === "draft" ? 22 : 28;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.innerHTML = `<svg class="map-pin-mark" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.1" fill="currentColor"/>
      <circle cx="12" cy="12" r="10.1" fill="none" stroke="#f4efe4" stroke-width="1.7"/>
      <text x="12" y="15.7" text-anchor="middle" fill="#f4efe4" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="8.6" font-weight="700" letter-spacing="-0.08em">WC</text>
    </svg>`;
  return el;
}

export default function MapView({
  toilets,
  selectedId,
  addMode,
  draftPoint,
  styleId,
  flyTo,
  onSelect,
  onMapClick,
  onFlyComplete,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const draftRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const onMapClickRef = useRef(onMapClick);
  const onFlyCompleteRef = useRef(onFlyComplete);
  const addModeRef = useRef(addMode);
  const flyToRef = useRef(flyTo);

  onSelectRef.current = onSelect;
  onMapClickRef.current = onMapClick;
  onFlyCompleteRef.current = onFlyComplete;
  addModeRef.current = addMode;
  flyToRef.current = flyTo;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    ensureMapLibreWorker();
    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLES[styleId].url,
      center: ROMANIA_CENTER,
      zoom: 6.2,
      minZoom: 5.5,
      maxZoom: 19,
      maxBounds: ROMANIA_MAX_BOUNDS,
      attributionControl: false,
      cooperativeGestures: false,
    });

    map.addControl(
      new NavigationControl({ visualizePitch: false, showCompass: false }),
      "bottom-right",
    );
    map.addControl(new ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");
    map.addControl(new AttributionControl({ compact: undefined }), "bottom-left");
    collapseAttribution(map);

    map.on("style.load", () => {
      applyRomaniaMask(map);
      requestAnimationFrame(() => collapseAttribution(map));
    });
    map.once("load", () => {
      collapseAttribution(map);
      const target = flyToRef.current;
      if (target) {
        map.jumpTo({
          center: [target.lng, target.lat],
          zoom: target.zoom ?? 16,
        });
        onFlyCompleteRef.current();
        return;
      }
      map.fitBounds(ROMANIA_BOUNDS, {
        padding: { top: 36, bottom: 40, left: 28, right: 28 },
        duration: 0,
      });
    });
    map.on("click", (event) => {
      if (addModeRef.current && isClickOutsideRomania(map, event.point)) return;
      onMapClickRef.current(event.lngLat.lat, event.lngLat.lng);
    });

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);

    mapRef.current = map;

    return () => {
      observer.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      draftRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
    // Map is created once; style changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(MAP_STYLES[styleId].url);
  }, [styleId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = toilets.map((toilet) => {
      const kind = toilet.id === selectedId ? "active" : "toilet";
      const el = pinElement(kind);
      el.setAttribute("aria-label", toilet.name);
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(toilet.id);
      });
      return new Marker({ element: el, anchor: "center" })
        .setLngLat([toilet.lng, toilet.lat])
        .addTo(map);
    });
  }, [toilets, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    draftRef.current?.remove();
    draftRef.current = null;
    if (!draftPoint) return;
    const el = pinElement("draft");
    draftRef.current = new Marker({ element: el, anchor: "center" })
      .setLngLat([draftPoint.lng, draftPoint.lat])
      .addTo(map);
  }, [draftPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo || !map.loaded()) return;
    map.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: flyTo.zoom ?? 16,
      essential: true,
      speed: 1.15,
    });
    const done = () => onFlyCompleteRef.current();
    map.once("moveend", done);
  }, [flyTo]);

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = addMode ? "crosshair" : "";
  }, [addMode]);

  return <div ref={containerRef} className="map-canvas" />;
}
