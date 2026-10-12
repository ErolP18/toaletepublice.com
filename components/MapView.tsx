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

function pinElement(kind: "toilet" | "draft" | "active") {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `map-pin map-pin-${kind}`;
  el.innerHTML =
    kind === "draft"
      ? `<span class="map-pin-dot"></span>`
      : `<svg viewBox="0 0 28 36" aria-hidden="true"><path fill="currentColor" d="M14 1.4c5.8 0 10.5 4.6 10.5 10.4 0 8.6-10.5 23-10.5 23S3.5 20.4 3.5 11.8C3.5 6 8.2 1.4 14 1.4z"/><circle cx="14" cy="12" r="4.2" fill="#f4efe4"/></svg>`;
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

  onSelectRef.current = onSelect;
  onMapClickRef.current = onMapClick;
  onFlyCompleteRef.current = onFlyComplete;
  addModeRef.current = addMode;

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
    map.addControl(new ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution:
          '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>',
      }),
      "bottom-right",
    );

    map.on("style.load", () => {
      applyRomaniaMask(map);
    });
    map.once("load", () => {
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
      return new Marker({ element: el, anchor: "bottom" })
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
    draftRef.current = new Marker({ element: el, anchor: "bottom" })
      .setLngLat([draftPoint.lng, draftPoint.lat])
      .addTo(map);
  }, [draftPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
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
