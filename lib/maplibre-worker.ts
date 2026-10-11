import { setWorkerUrl } from "maplibre-gl";

let configured = false;

export function ensureMapLibreWorker() {
  if (configured || typeof window === "undefined") return;
  setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
  configured = true;
}
