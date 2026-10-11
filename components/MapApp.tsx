"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  Check,
  Crosshair,
  List,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import officialToilets from "@/data/toilets.json";
import { counties, toiletStatusLabels, toiletTypeLabels } from "@/lib/counties";
import {
  MAP_STYLES,
  findCity,
  isInsideRomaniaEnvelope,
  type MapStyleId,
} from "@/lib/romania";
import { addLocalToilet, readLocalToilets, removeLocalToilet } from "@/lib/storage";
import { matchesToilet, sortToilets } from "@/lib/toilets";
import type { Toilet, ToiletDraft, ToiletType } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="map-canvas map-skeleton" />,
});

const emptyDraft = (lat: number, lng: number): ToiletDraft => ({
  lat,
  lng,
  name: "",
  city: "",
  county: "",
  address: "",
  hours: "",
  accessible: false,
  free: true,
  type: "strada",
  notes: "",
});

export default function MapApp() {
  const [localToilets, setLocalToilets] = useState<Toilet[]>([]);
  const [query, setQuery] = useState("");
  const [county, setCounty] = useState("");
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [draft, setDraft] = useState<ToiletDraft | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [locateError, setLocateError] = useState("");
  const [styleId, setStyleId] = useState<MapStyleId>("liberty");
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    null,
  );

  useEffect(() => {
    setLocalToilets(readLocalToilets());
  }, []);

  const toilets = useMemo(
    () => sortToilets([...(officialToilets as Toilet[]), ...localToilets]),
    [localToilets],
  );

  const visible = useMemo(() => {
    return toilets.filter((toilet) => {
      if (county && toilet.county !== county) return false;
      if (accessibleOnly && !toilet.accessible) return false;
      return matchesToilet(toilet, query);
    });
  }, [toilets, county, accessibleOnly, query]);

  const selected = toilets.find((toilet) => toilet.id === selectedId) ?? null;

  async function placeDraft(lat: number, lng: number) {
    if (!addMode) return;
    setDraft((current) => ({ ...(current ?? emptyDraft(lat, lng)), lat, lng }));
    setGeocoding(true);
    try {
      const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      if (!response.ok) return;
      const data = (await response.json()) as {
        address?: string;
        city?: string;
        county?: string;
      };
      setDraft((current) =>
        current
          ? {
              ...current,
              address: current.address || data.address || "",
              city: current.city || data.city || "",
              county: current.county || data.county || "",
            }
          : current,
      );
    } finally {
      setGeocoding(false);
    }
  }

  function handleMapClick(lat: number, lng: number) {
    if (addMode) {
      void placeDraft(lat, lng);
      return;
    }
    setSelectedId(null);
  }

  function startAdd() {
    setAddMode(true);
    setSelectedId(null);
    setListOpen(true);
    setDraft(null);
    setLocateError("");
  }

  function cancelAdd() {
    setAddMode(false);
    setDraft(null);
  }

  function saveDraft() {
    if (!draft || !draft.name.trim() || !draft.city.trim() || !draft.county) return;
    const toilet: Toilet = {
      id: `prop-${Date.now()}`,
      name: draft.name.trim(),
      lat: draft.lat,
      lng: draft.lng,
      city: draft.city.trim(),
      county: draft.county,
      address: draft.address.trim() || undefined,
      hours: draft.hours.trim() || undefined,
      accessible: draft.accessible,
      free: draft.free,
      type: draft.type,
      status: "propunere",
      notes: draft.notes.trim() || undefined,
      source: "local",
    };
    setLocalToilets(addLocalToilet(toilet));
    setSelectedId(toilet.id);
    setAddMode(false);
    setDraft(null);
    setFlyTo({ lat: toilet.lat, lng: toilet.lng, zoom: 17 });
  }

  function deleteLocal(id: string) {
    setLocalToilets(removeLocalToilet(id));
    if (selectedId === id) setSelectedId(null);
  }

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

  function goToQuery() {
    const city = findCity(query);
    if (city) setFlyTo({ lat: city.lat, lng: city.lng, zoom: city.zoom });
  }

  function selectToilet(id: string) {
    const toilet = toilets.find((item) => item.id === id);
    setSelectedId(id);
    setAddMode(false);
    setDraft(null);
    if (toilet) setFlyTo({ lat: toilet.lat, lng: toilet.lng, zoom: 16 });
    if (window.innerWidth < 900) setListOpen(true);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            WC
          </span>
          <span className="brand-copy">
            <strong>toaletepublice.com</strong>
            <em>Harta toaletelor din România</em>
          </span>
        </Link>

        <form
          className="search"
          onSubmit={(event) => {
            event.preventDefault();
            goToQuery();
          }}
        >
          <Search size={16} strokeWidth={2.2} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută oraș, stradă sau toaletă"
            aria-label="Caută"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Șterge căutarea">
              <X size={14} />
            </button>
          ) : null}
        </form>

        <div className="topbar-actions">
          <button type="button" className="ghost" onClick={locateMe} title="Lângă mine">
            <Crosshair size={16} />
            <span>Lângă mine</span>
          </button>
          <button
            type="button"
            className={addMode ? "primary is-on" : "primary"}
            onClick={addMode ? cancelAdd : startAdd}
          >
            {addMode ? <X size={16} /> : <Plus size={16} />}
            <span>{addMode ? "Anulează" : "Adaugă"}</span>
          </button>
          <Link href="/despre" className="ghost about-link">
            Despre
          </Link>
          <button
            type="button"
            className="ghost list-toggle"
            onClick={() => setListOpen((open) => !open)}
          >
            <List size={16} />
            <span>Listă</span>
          </button>
        </div>
      </header>

      {locateError ? <p className="banner warn">{locateError}</p> : null}
      {addMode ? (
        <p className="banner">
          Apasă pe hartă exact unde este toaleta. Vom completa adresa din OpenStreetMap.
        </p>
      ) : null}

      <div className="workspace">
        <aside className={`panel ${listOpen || addMode ? "is-open" : ""}`}>
          <div className="panel-head">
            <div>
              <p className="kicker">
                {visible.length} {visible.length === 1 ? "toaletă" : "toalete"}
              </p>
              <h1>România</h1>
            </div>
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
            <label>
              Hartă
              <select
                value={styleId}
                onChange={(event) => setStyleId(event.target.value as MapStyleId)}
              >
                {Object.values(MAP_STYLES).map((style) => (
                  <option key={style.id} value={style.id}>
                    {style.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {addMode ? (
            <AddForm
              draft={draft}
              geocoding={geocoding}
              onChange={setDraft}
              onSave={saveDraft}
              onCancel={cancelAdd}
            />
          ) : selected ? (
            <ToiletDetails
              toilet={selected}
              onBack={() => setSelectedId(null)}
              onDelete={
                selected.status === "propunere" ? () => deleteLocal(selected.id) : undefined
              }
            />
          ) : (
            <ul className="toilet-list">
              {visible.length === 0 ? (
                <li className="empty">Nicio toaletă pentru filtrul ăsta.</li>
              ) : (
                visible.map((toilet) => (
                  <li key={toilet.id}>
                    <button type="button" onClick={() => selectToilet(toilet.id)}>
                      <span className="pin-mini" data-status={toilet.status} />
                      <span>
                        <strong>{toilet.name}</strong>
                        <em>
                          {toilet.city}, {toilet.county}
                          {toilet.address ? ` · ${toilet.address}` : ""}
                        </em>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </aside>

        <section className="map-wrap">
          <MapView
            toilets={visible}
            selectedId={selectedId}
            addMode={addMode}
            draftPoint={draft ? { lat: draft.lat, lng: draft.lng } : null}
            styleId={styleId}
            flyTo={flyTo}
            onSelect={selectToilet}
            onMapClick={handleMapClick}
            onFlyComplete={() => setFlyTo(null)}
          />
        </section>
      </div>
    </div>
  );
}

function AddForm({
  draft,
  geocoding,
  onChange,
  onSave,
  onCancel,
}: {
  draft: ToiletDraft | null;
  geocoding: boolean;
  onChange: (draft: ToiletDraft | null) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!draft) {
    return (
      <div className="add-empty">
        <MapPin size={22} />
        <p>Alege punctul pe hartă. Poți mări până la nivelul străzii.</p>
        <button type="button" className="ghost" onClick={onCancel}>
          Anulează
        </button>
      </div>
    );
  }

  const update = (patch: Partial<ToiletDraft>) => onChange({ ...draft, ...patch });
  const ready = draft.name.trim() && draft.city.trim() && draft.county;

  return (
    <form
      className="add-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <p className="coords">
        {draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}
        {geocoding ? " · citesc adresa…" : ""}
      </p>
      <label>
        Nume
        <input
          required
          value={draft.name}
          onChange={(event) => update({ name: event.target.value })}
          placeholder="ex. Toaletă Parcul Central"
        />
      </label>
      <label>
        Adresă
        <input
          value={draft.address}
          onChange={(event) => update({ address: event.target.value })}
          placeholder="Stradă, număr"
        />
      </label>
      <div className="row">
        <label>
          Oraș
          <input
            required
            value={draft.city}
            onChange={(event) => update({ city: event.target.value })}
          />
        </label>
        <label>
          Județ
          <select
            required
            value={draft.county}
            onChange={(event) => update({ county: event.target.value })}
          >
            <option value="">Alege</option>
            {counties.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="row">
        <label>
          Tip
          <select
            value={draft.type}
            onChange={(event) => update({ type: event.target.value as ToiletType })}
          >
            {Object.entries(toiletTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Program
          <input
            value={draft.hours}
            onChange={(event) => update({ hours: event.target.value })}
            placeholder="ex. 08:00–20:00"
          />
        </label>
      </div>
      <div className="checks">
        <label className="check">
          <input
            type="checkbox"
            checked={draft.accessible}
            onChange={(event) => update({ accessible: event.target.checked })}
          />
          Accesibil
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.free}
            onChange={(event) => update({ free: event.target.checked })}
          />
          Gratuit
        </label>
      </div>
      <label>
        Note
        <textarea
          rows={3}
          value={draft.notes}
          onChange={(event) => update({ notes: event.target.value })}
          placeholder="Sursă, stare, program de iarnă…"
        />
      </label>
      <div className="form-actions">
        <button type="submit" className="primary" disabled={!ready}>
          <Check size={16} />
          Salvează propunerea
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Anulează
        </button>
      </div>
      <p className="hint">
        Salvarea e locală, pe dispozitivul tău. Datele oficiale vor veni de la primării.
      </p>
    </form>
  );
}

function ToiletDetails({
  toilet,
  onBack,
  onDelete,
}: {
  toilet: Toilet;
  onBack: () => void;
  onDelete?: () => void;
}) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${toilet.lat},${toilet.lng}`;

  return (
    <article className="details">
      <button type="button" className="back" onClick={onBack}>
        ← Toate toaletele
      </button>
      <p className="status" data-status={toilet.status}>
        {toiletStatusLabels[toilet.status]}
      </p>
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
          <dt>Program</dt>
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
          <dd>{toilet.free ? "Gratuit" : "Cu plată / necunoscut"}</dd>
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
      {onDelete ? (
        <button type="button" className="danger" onClick={onDelete}>
          <Trash2 size={15} />
          Șterge propunerea de pe acest dispozitiv
        </button>
      ) : null}
    </article>
  );
}
