"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Accessibility, Crosshair, List, Search, X } from "lucide-react";
import { counties, toiletStatusLabels, toiletTypeLabels } from "@/lib/counties";
import { fetchPlace } from "@/lib/geocode";
import { findCity, isInsideRomaniaEnvelope, type MapStyleId } from "@/lib/romania";
import {
  groupToiletsByLocality,
  matchesToilet,
  sortToilets,
  toiletCostLabel,
} from "@/lib/toilets";
import type { Toilet } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="map-canvas map-skeleton" />,
});

export default function MapApp({ initialToilets = [] }: { initialToilets?: Toilet[] }) {
  const [toilets] = useState<Toilet[]>(() => sortToilets(initialToilets));
  const [query, setQuery] = useState("");
  const [county, setCounty] = useState("");
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [locateError, setLocateError] = useState("");
  const [styleId] = useState<MapStyleId>("liberty");
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    null,
  );

  const visible = useMemo(() => {
    return toilets.filter((toilet) => {
      if (county && toilet.county !== county) return false;
      if (accessibleOnly && !toilet.accessible) return false;
      return matchesToilet(toilet, query);
    });
  }, [toilets, county, accessibleOnly, query]);

  const localities = useMemo(() => groupToiletsByLocality(visible), [visible]);
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
    const place = await fetchPlace(needle);
    if (place) {
      setFlyTo({ lat: place.lat, lng: place.lng, zoom: place.zoom });
      return;
    }
    const city = findCity(needle);
    if (city) {
      setFlyTo({ lat: city.lat, lng: city.lng, zoom: city.zoom });
      return;
    }
    const first = visible[0];
    if (first) setFlyTo({ lat: first.lat, lng: first.lng, zoom: 16 });
  }

  function selectToilet(id: string) {
    const toilet = toilets.find((item) => item.id === id);
    setSelectedId(id);
    setSelectedCity(toilet ? `${toilet.city}|${toilet.county}` : null);
    if (toilet) setFlyTo({ lat: toilet.lat, lng: toilet.lng, zoom: 17 });
    if (window.innerWidth < 900) setListOpen(true);
  }

  function selectLocality(city: string, countyName: string, lat: number, lng: number) {
    setSelectedId(null);
    setSelectedCity(`${city}|${countyName}`);
    setFlyTo({ lat, lng, zoom: 14 });
    if (window.innerWidth < 900) setListOpen(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <nav className="page-nav">
          <Link href="/despre">Despre</Link>
          <Link href="/suport">Suport</Link>
        </nav>

        <div className="topbar-actions">
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
              placeholder="Comună, oraș, stradă"
              aria-label="Caută comună, oraș sau stradă"
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
          <button
            type="button"
            className="icon-btn list-toggle"
            onClick={() => setListOpen((open) => !open)}
            aria-label="Toalete"
          >
            <List size={16} />
          </button>
        </div>
      </header>

      {locateError ? <p className="banner warn">{locateError}</p> : null}

      <div className="workspace">
        <aside className={`panel ${listOpen ? "is-open" : ""}`}>
          <div className="panel-head">
            <p className="stats-line">
              {visible.length} {visible.length === 1 ? "toaletă" : "toalete"}
              {localities.length
                ? ` · ${localities.length} ${localities.length === 1 ? "localitate" : "localități"}`
                : ""}
            </p>
            <button
              type="button"
              className="icon-btn close-panel"
              onClick={() => setListOpen(false)}
              aria-label="Închide lista"
            >
              <X size={16} />
            </button>
          </div>

          <div className="filters">
            <label>
              Județ
              <select value={county} onChange={(event) => setCounty(event.target.value)}>
                <option value="">Toată țara</option>
                {counties.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={accessibleOnly}
                onChange={(event) => setAccessibleOnly(event.target.checked)}
              />
              Accesibil
            </label>
          </div>

          {selected && visible.some((item) => item.id === selected.id) ? (
            <ToiletDetails toilet={selected} onBack={() => setSelectedId(null)} />
          ) : (
            <ul className="place-list">
              {localities.length === 0 ? (
                <li className="empty">Nicio toaletă pentru filtrul ăsta.</li>
              ) : (
                localities.map((group) => {
                  const key = `${group.city}|${group.county}`;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className={`locality${selectedCity === key ? " is-active" : ""}`}
                        onClick={() =>
                          selectLocality(group.city, group.county, group.lat, group.lng)
                        }
                      >
                        <span>
                          <strong>{group.city}</strong>
                          <em>{group.county}</em>
                        </span>
                        <b>
                          {group.count} {group.count === 1 ? "toaletă" : "toalete"}
                        </b>
                      </button>
                      <ul>
                        {group.toilets.map((toilet) => (
                          <li key={toilet.id}>
                            <button
                              type="button"
                              className={`toilet-row${selectedId === toilet.id ? " is-active" : ""}`}
                              onClick={() => selectToilet(toilet.id)}
                            >
                              <span>
                                <strong>{toilet.name}</strong>
                                <em>{toilet.address || toilet.city}</em>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })
              )}
            </ul>
          )}
        </aside>

        <section className="map-wrap">
          <MapView
            toilets={visible}
            selectedId={selectedId}
            addMode={false}
            draftPoint={null}
            styleId={styleId}
            flyTo={flyTo}
            onSelect={selectToilet}
            onMapClick={() => setSelectedId(null)}
            onFlyComplete={() => setFlyTo(null)}
          />
        </section>
      </div>
    </div>
  );
}

function ToiletDetails({ toilet, onBack }: { toilet: Toilet; onBack: () => void }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${toilet.lat},${toilet.lng}`;

  return (
    <article className="details">
      <button type="button" className="back" onClick={onBack}>
        ← Listă
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
        <div>
          <dt>Coordonate</dt>
          <dd>
            {toilet.lat.toFixed(5)}, {toilet.lng.toFixed(5)}
          </dd>
        </div>
      </dl>
      {toilet.notes ? <p className="notes">{toilet.notes}</p> : null}
      <a className="primary block" href={mapsUrl} target="_blank" rel="noreferrer">
        Navighează
      </a>
    </article>
  );
}
