"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Accessibility, Crosshair, Search, X } from "lucide-react";
import { counties, toiletStatusLabels, toiletTypeLabels } from "@/lib/counties";
import { fetchPlace } from "@/lib/geocode";
import { findCity, isInsideRomaniaEnvelope, type MapStyleId } from "@/lib/romania";
import { normalizeQuery, sortToilets, toiletCostLabel } from "@/lib/toilets";
import type { Toilet } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="map-canvas map-skeleton" />,
});

export default function MapApp({ initialToilets = [] }: { initialToilets?: Toilet[] }) {
  const [toilets] = useState<Toilet[]>(() => sortToilets(initialToilets));
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locateError, setLocateError] = useState("");
  const [styleId] = useState<MapStyleId>("liberty");
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    null,
  );

  const selected = toilets.find((toilet) => toilet.id === selectedId) ?? null;

  function locateMe() {
    setLocateError("");
    if (!navigator.geolocation) {
      setLocateError("Geolocalizarea nu este disponibilă în browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!isInsideRomaniaEnvelope(latitude, longitude)) {
          setLocateError("Locația ta pare în afara României.");
          return;
        }
        setFlyTo({ lat: latitude, lng: longitude, zoom: 15 });
      },
      () => setLocateError("Nu am putut citi locația. Verifică permisiunile."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function goToQuery() {
    const needle = query.trim();
    if (!needle) return;

    const q = normalizeQuery(needle);
    const named = toilets.filter(
      (toilet) =>
        normalizeQuery(toilet.name) === q ||
        normalizeQuery(toilet.city) === q ||
        normalizeQuery(toilet.address ?? "") === q,
    );
    if (named.length === 1) {
      selectToilet(named[0].id);
      return;
    }
    if (named.length > 1) {
      setFlyTo({ lat: named[0].lat, lng: named[0].lng, zoom: 13 });
      setSelectedId(null);
      return;
    }

    const county = counties.find((item) => normalizeQuery(item) === q);
    const place = await fetchPlace(county ? `județul ${county} România` : needle);
    if (place) {
      setFlyTo({
        lat: place.lat,
        lng: place.lng,
        zoom: county ? 9 : place.zoom,
      });
      setSelectedId(null);
      return;
    }

    const city = findCity(needle);
    if (city) {
      setFlyTo({ lat: city.lat, lng: city.lng, zoom: city.zoom });
      setSelectedId(null);
    }
  }

  function selectToilet(id: string) {
    const toilet = toilets.find((item) => item.id === id);
    setSelectedId(id);
    if (toilet) setFlyTo({ lat: toilet.lat, lng: toilet.lng, zoom: 17 });
  }

  return (
    <div className="app-shell">
      <header className="topbar map-topbar">
        <form
          className="search"
          onSubmit={(event) => {
            event.preventDefault();
            void goToQuery();
          }}
        >
          <Search size={15} strokeWidth={2.2} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Stradă, comună, județ"
            aria-label="Caută stradă, comună sau județ"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Șterge căutarea">
              <X size={14} />
            </button>
          ) : null}
        </form>
        <button type="button" className="icon-btn" onClick={locateMe} title="Lângă mine">
          <Crosshair size={16} />
        </button>
      </header>

      {locateError ? <p className="banner warn">{locateError}</p> : null}

      <section className="map-wrap map-full">
        <MapView
          toilets={toilets}
          selectedId={selectedId}
          addMode={false}
          draftPoint={null}
          styleId={styleId}
          flyTo={flyTo}
          onSelect={selectToilet}
          onMapClick={() => setSelectedId(null)}
          onFlyComplete={() => setFlyTo(null)}
        />
        {selected ? (
          <ToiletCard toilet={selected} onClose={() => setSelectedId(null)} />
        ) : null}
      </section>
    </div>
  );
}

function ToiletCard({ toilet, onClose }: { toilet: Toilet; onClose: () => void }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${toilet.lat},${toilet.lng}`;

  return (
    <article className="pin-card">
      <button type="button" className="icon-btn pin-card-close" onClick={onClose} aria-label="Închide">
        <X size={14} />
      </button>
      <p className="status" data-status={toilet.status}>
        {toiletStatusLabels[toilet.status]}
      </p>
      {toilet.photo ? <img src={toilet.photo} alt="" className="details-photo" /> : null}
      <h2>{toilet.name}</h2>
      <p className="place">
        {toilet.address ? `${toilet.address}, ` : ""}
        {toilet.city}, județul {toilet.county}
      </p>
      <dl>
        <div>
          <dt>Tip</dt>
          <dd>{toiletTypeLabels[toilet.type]}</dd>
        </div>
        <div>
          <dt>Regim de funcționare</dt>
          <dd>{toilet.hours || "Necunoscut"}</dd>
        </div>
        <div>
          <dt>Acces</dt>
          <dd>
            {toilet.accessible ? (
              <span className="inline-ok">
                <Accessibility size={14} /> Accesibil
              </span>
            ) : (
              "Nespecificat"
            )}
          </dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>{toiletCostLabel(toilet)}</dd>
        </div>
      </dl>
      {toilet.notes ? <p className="notes">{toilet.notes}</p> : null}
      <a className="primary block" href={mapsUrl} target="_blank" rel="noreferrer">
        Navighează
      </a>
    </article>
  );
}
