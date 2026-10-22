"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Accessibility, Crosshair, List, X } from "lucide-react";
import { counties, toiletStatusLabels, toiletTypeLabels } from "@/lib/counties";
import { fetchPlace } from "@/lib/geocode";
import { findCity, isInsideRomaniaEnvelope, type MapStyleId } from "@/lib/romania";
import type { SearchSuggestion } from "@/lib/suggest";
import { parseToiletPath, toiletPath } from "@/lib/toilet-url";
import {
  groupToiletsByLocality,
  matchesToilet,
  normalizeQuery,
  sortToilets,
  toiletCostLabel,
} from "@/lib/toilets";
import { googleMapsPlaceUrl } from "@/lib/maps";
import type { Toilet } from "@/lib/types";
import SearchBox from "@/components/SearchBox";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="map-canvas map-skeleton" />,
});

export default function MapApp({
  initialToilets = [],
  initialSelectedId = null,
}: {
  initialToilets?: Toilet[];
  initialSelectedId?: string | null;
}) {
  const [toilets] = useState<Toilet[]>(() => sortToilets(initialToilets));
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (initialSelectedId && initialToilets.some((toilet) => toilet.id === initialSelectedId)) {
      return initialSelectedId;
    }
    return null;
  });
  const [listOpen, setListOpen] = useState(() => Boolean(initialSelectedId));
  const [locateError, setLocateError] = useState("");
  const [styleId] = useState<MapStyleId>("liberty");
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(() => {
    const toilet = initialToilets.find((item) => item.id === initialSelectedId);
    return toilet ? { lat: toilet.lat, lng: toilet.lng, zoom: 17 } : null;
  });

  const visible = useMemo(
    () => toilets.filter((toilet) => matchesToilet(toilet, query)),
    [toilets, query],
  );
  const localities = useMemo(() => groupToiletsByLocality(visible), [visible]);
  const selected = toilets.find((toilet) => toilet.id === selectedId) ?? null;
  const selectedVisible = Boolean(selected && visible.some((item) => item.id === selected.id));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setListOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const path = window.location.pathname;
    if (path !== "/" && !parseToiletPath(path)) return;
    const next = selectedId ? toiletPath(selectedId) : "/";
    if (path === next) return;
    window.history.replaceState(window.history.state, "", next);
  }, [selectedId]);

  useEffect(() => {
    function onPopState() {
      const id = parseToiletPath(window.location.pathname);
      const toilet = id ? toilets.find((item) => item.id === id) : undefined;
      if (!toilet) {
        setSelectedId(null);
        return;
      }
      setSelectedId(toilet.id);
      setFlyTo({ lat: toilet.lat, lng: toilet.lng, zoom: 17 });
      setListOpen(true);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [toilets]);

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

  async function goToQuery(nextQuery = query) {
    const needle = nextQuery.trim();
    if (!needle) return;

    const q = normalizeQuery(needle);
    const named = visible.filter(
      (toilet) =>
        normalizeQuery(toilet.name) === q ||
        normalizeQuery(toilet.city) === q ||
        normalizeQuery(toilet.address ?? "") === q,
    );
    if (named.length === 1) {
      selectToilet(named[0].id);
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
      if (named[0]) setSelectedId(null);
      return;
    }

    const city = findCity(needle);
    if (city) {
      setFlyTo({ lat: city.lat, lng: city.lng, zoom: city.zoom });
      setSelectedId(null);
      return;
    }

    if (named[0]) setFlyTo({ lat: named[0].lat, lng: named[0].lng, zoom: 13 });
  }

  function selectToilet(id: string) {
    const toilet = toilets.find((item) => item.id === id);
    setSelectedId(id);
    if (toilet) setFlyTo({ lat: toilet.lat, lng: toilet.lng, zoom: 17 });
    setListOpen(true);
  }

  function applySuggestion(suggestion: SearchSuggestion) {
    setQuery(suggestion.query);
    if (suggestion.toiletId) {
      selectToilet(suggestion.toiletId);
      return;
    }
    if (suggestion.lat != null && suggestion.lng != null) {
      setSelectedId(null);
      setFlyTo({
        lat: suggestion.lat,
        lng: suggestion.lng,
        zoom: suggestion.zoom ?? 14,
      });
      return;
    }
    void goToQuery(suggestion.query);
  }

  function selectLocality(lat: number, lng: number) {
    setSelectedId(null);
    setFlyTo({ lat, lng, zoom: 14 });
    if (window.matchMedia("(max-width: 900px)").matches) {
      setListOpen(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <SearchBox
          value={query}
          toilets={toilets}
          placeholder="Stradă, comună, județ"
          ariaLabel="Caută stradă, comună sau județ"
          onChange={setQuery}
          onSubmit={() => void goToQuery()}
          onPick={applySuggestion}
        />
        <div className="topbar-actions">
          <button type="button" className="icon-btn" onClick={locateMe} title="Lângă mine">
            <Crosshair size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn list-toggle${listOpen ? " is-on" : ""}`}
            onClick={() => setListOpen((open) => !open)}
            aria-label={listOpen ? "Închide lista" : "Deschide lista"}
            aria-expanded={listOpen}
          >
            {listOpen ? <X size={16} /> : <List size={16} />}
          </button>
        </div>
      </header>

      {locateError ? <p className="banner warn">{locateError}</p> : null}

      <div className={`workspace${listOpen ? " is-list-open" : ""}`}>
        <aside className={`panel${listOpen ? " is-open" : ""}`} aria-hidden={!listOpen}>
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

          {selected && selectedVisible ? (
            <ToiletDetails toilet={selected} onBack={() => setSelectedId(null)} />
          ) : (
            <ul className="place-list">
              {localities.length === 0 ? (
                <li className="empty">Nicio toaletă pentru căutarea asta.</li>
              ) : (
                localities.map((group) => {
                  const key = `${group.city}|${group.county}`;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className="locality"
                        onClick={() =>
                          selectLocality(group.lat, group.lng)
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
          {listOpen ? (
            <button
              type="button"
              className="panel-scrim"
              onClick={() => setListOpen(false)}
              aria-label="Închide lista"
            />
          ) : null}
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
      </dl>
      {toilet.notes ? <p className="notes">{toilet.notes}</p> : null}
      <ShareLink toilet={toilet} />
      <a
        className="primary block"
        href={googleMapsPlaceUrl(toilet.lat, toilet.lng, toilet.source)}
        target="_blank"
        rel="noreferrer"
      >
        Deschide în Google Maps
      </a>
    </article>
  );
}

function ShareLink({ toilet }: { toilet: Toilet }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [display, setDisplay] = useState(`toaletepublice.com${toiletPath(toilet.id)}`);
  const timer = useRef(0);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
    setDisplay(`${window.location.host}${toiletPath(toilet.id)}`);
    return () => window.clearTimeout(timer.current);
  }, [toilet.id]);

  function shareUrl() {
    return `${window.location.origin}${toiletPath(toilet.id)}`;
  }

  async function copyLink() {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement("textarea");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(field);
      if (!ok) return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareLink() {
    const url = shareUrl();
    const title = `${toilet.name}, ${toilet.city}`;
    try {
      await navigator.share({ title, text: title, url });
    } catch {
      // anulat de utilizator
    }
  }

  return (
    <div className="share-box">
      <input
        className="share-url"
        readOnly
        value={display}
        aria-label="Link către această toaletă"
        onFocus={(event) => event.currentTarget.select()}
      />
      <div className="row">
        <button type="button" className="ghost" onClick={() => void copyLink()}>
          {copied ? "Copiat" : "Copiază linkul"}
        </button>
        {canShare ? (
          <button type="button" className="ghost" onClick={() => void shareLink()}>
            Trimite
          </button>
        ) : null}
      </div>
    </div>
  );
}
