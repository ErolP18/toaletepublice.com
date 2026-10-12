"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { counties, toiletStatusLabels, toiletTypeLabels } from "@/lib/counties";
import { fetchPlace } from "@/lib/geocode";
import { findCity, type MapStyleId } from "@/lib/romania";
import type { Toilet, ToiletDraft, ToiletStatus, ToiletType } from "@/lib/types";

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
  price: "",
  accessible: false,
  free: true,
  type: "strada",
  notes: "",
});

export default function AdminApp() {
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [query, setQuery] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [draft, setDraft] = useState<ToiletDraft | null>(null);
  const [edit, setEdit] = useState<Toilet | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [styleId] = useState<MapStyleId>("liberty");
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    null,
  );

  async function load() {
    const response = await fetch("/api/admin/toilets");
    if (!response.ok) throw new Error("Nu am putut citi toaletele.");
    const data = (await response.json()) as Toilet[];
    setToilets(data);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ro");
    return toilets.filter((toilet) => {
      if (status && toilet.status !== status) return false;
      if (!needle) return true;
      return [toilet.name, toilet.city, toilet.county, toilet.address ?? "", toilet.hours ?? ""]
        .join(" ")
        .toLocaleLowerCase("ro")
        .includes(needle);
    });
  }, [toilets, query, status]);

  async function reverseGeocode(lat: number, lng: number) {
    setGeocoding(true);
    try {
      const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      if (!response.ok) return {};
      return (await response.json()) as {
        address?: string;
        city?: string;
        county?: string;
      };
    } finally {
      setGeocoding(false);
    }
  }

  async function placeDraft(lat: number, lng: number) {
    setDraft((current) => ({ ...(current ?? emptyDraft(lat, lng)), lat, lng }));
    const data = await reverseGeocode(lat, lng);
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
  }

  async function goToQuery() {
    const needle = placeQuery.trim() || query.trim();
    if (!needle) return;
    const place = await fetchPlace(needle);
    if (place) {
      setFlyTo({ lat: place.lat, lng: place.lng, zoom: place.zoom });
      if (addMode) void placeDraft(place.lat, place.lng);
      return;
    }
    const city = findCity(needle);
    if (city) setFlyTo({ lat: city.lat, lng: city.lng, zoom: city.zoom });
  }

  function startAdd() {
    setAddMode(true);
    setSelectedId(null);
    setEdit(null);
    setDraft(null);
    setPhotoFile(null);
    setError("");
  }

  function cancelAdd() {
    setAddMode(false);
    setDraft(null);
    setPhotoFile(null);
  }

  function selectToilet(id: string) {
    const toilet = toilets.find((item) => item.id === id);
    setSelectedId(id);
    setAddMode(false);
    setDraft(null);
    setEdit(toilet ? { ...toilet } : null);
    setPhotoFile(null);
    if (toilet) setFlyTo({ lat: toilet.lat, lng: toilet.lng, zoom: 16 });
  }

  async function uploadPhoto(id: string, file: File) {
    const body = new FormData();
    body.append("photo", file);
    const response = await fetch(`/api/admin/toilets/${id}/photo`, {
      method: "POST",
      body,
    });
    const data = (await response.json()) as Toilet & { error?: string };
    if (!response.ok) throw new Error(data.error || "Nu am putut salva poza.");
    return data;
  }

  async function removePhoto(id: string) {
    if (!window.confirm("Scoți poza?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/toilets/${id}/photo`, { method: "DELETE" });
      const data = (await response.json()) as Toilet & { error?: string };
      if (!response.ok) throw new Error(data.error || "Nu am putut scoate poza.");
      await load();
      setPhotoFile(null);
      setEdit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut scoate poza.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNew() {
    if (!draft || !draft.name.trim() || !draft.city.trim() || !draft.county) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/toilets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, status: "propunere", source: "admin" }),
      });
      const data = (await response.json()) as Toilet & { error?: string };
      if (!response.ok) throw new Error(data.error || "Nu am putut salva.");
      const saved = photoFile ? await uploadPhoto(data.id, photoFile) : data;
      await load();
      setAddMode(false);
      setDraft(null);
      setPhotoFile(null);
      setSelectedId(saved.id);
      setEdit(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut salva.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!edit) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/toilets/${edit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      const data = (await response.json()) as Toilet & { error?: string };
      if (!response.ok) throw new Error(data.error || "Nu am putut salva.");
      const saved = photoFile ? await uploadPhoto(edit.id, photoFile) : data;
      await load();
      setPhotoFile(null);
      setEdit(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut salva.");
    } finally {
      setBusy(false);
    }
  }

  async function removeToilet(id: string) {
    if (!window.confirm("Ștergi toaleta din bază?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/toilets/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Nu am putut șterge.");
      }
      await load();
      if (selectedId === id) {
        setSelectedId(null);
        setEdit(null);
        setPhotoFile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut șterge.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <nav className="page-nav">
          <Link href="/">Hartă</Link>
          <span className="admin-flag">Admin</span>
        </nav>
        <div className="topbar-actions">
          <form
            className="search"
            onSubmit={(event) => {
              event.preventDefault();
              void goToQuery();
            }}
          >
            <input
              value={placeQuery}
              onChange={(event) => setPlaceQuery(event.target.value)}
              placeholder="Comună, stradă"
              aria-label="Caută comună sau stradă"
            />
          </form>
          <button type="button" className="ghost" onClick={startAdd} disabled={addMode}>
            Adaugă
          </button>
          <button type="button" className="ghost" onClick={() => void logout()}>
            Ieșire
          </button>
        </div>
      </header>

      {addMode ? (
        <p className="banner">Caută strada sau apasă pe hartă, oriunde în țară.</p>
      ) : null}
      {error ? <p className="banner warn">{error}</p> : null}

      <div className="workspace admin-workspace">
        <aside className="panel admin-panel">
          <div className="admin-tools">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filtrează lista"
              aria-label="Filtrează toaletele"
            />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Toate</option>
              {Object.entries(toiletStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <p className="stats-line">
            {filtered.length} {filtered.length === 1 ? "toaletă" : "toalete"}
          </p>

          {addMode ? (
            <AdminForm
              draft={draft}
              geocoding={geocoding}
              busy={busy}
              photoFile={photoFile}
              onPhoto={setPhotoFile}
              onChange={setDraft}
              onSave={() => void saveNew()}
              onCancel={cancelAdd}
            />
          ) : edit ? (
            <EditForm
              toilet={edit}
              busy={busy}
              photoFile={photoFile}
              onPhoto={setPhotoFile}
              onChange={setEdit}
              onSave={() => void saveEdit()}
              onCancel={() => {
                setEdit(null);
                setSelectedId(null);
                setPhotoFile(null);
              }}
              onDelete={() => void removeToilet(edit.id)}
              onRemovePhoto={() => void removePhoto(edit.id)}
            />
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nume</th>
                  <th>Localitate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((toilet) => (
                  <tr
                    key={toilet.id}
                    className={selectedId === toilet.id ? "is-active" : undefined}
                    onClick={() => selectToilet(toilet.id)}
                  >
                    <td>{toilet.name}</td>
                    <td>{toilet.city}</td>
                    <td>{toiletStatusLabels[toilet.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </aside>

        <section className="map-wrap">
          <MapView
            toilets={filtered}
            selectedId={selectedId}
            addMode={addMode}
            draftPoint={draft ? { lat: draft.lat, lng: draft.lng } : null}
            styleId={styleId}
            flyTo={flyTo}
            onSelect={selectToilet}
            onMapClick={(lat, lng) => {
              if (addMode) void placeDraft(lat, lng);
            }}
            onFlyComplete={() => setFlyTo(null)}
          />
        </section>
      </div>
    </div>
  );
}

function AdminForm({
  draft,
  geocoding,
  busy,
  photoFile,
  onPhoto,
  onChange,
  onSave,
  onCancel,
}: {
  draft: ToiletDraft | null;
  geocoding: boolean;
  busy: boolean;
  photoFile: File | null;
  onPhoto: (file: File | null) => void;
  onChange: (draft: ToiletDraft | null) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!draft) {
    return (
      <div className="add-empty">
        <p>Caută o stradă sus, sau click pe hartă.</p>
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
      <Fields
        name={draft.name}
        address={draft.address}
        city={draft.city}
        county={draft.county}
        type={draft.type}
        hours={draft.hours}
        price={draft.price}
        accessible={draft.accessible}
        free={draft.free}
        notes={draft.notes}
        photoFile={photoFile}
        onPhoto={onPhoto}
        onChange={update}
      />
      <div className="form-actions">
        <button type="submit" className="primary" disabled={!ready || busy}>
          Salvează
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Anulează
        </button>
      </div>
    </form>
  );
}

function EditForm({
  toilet,
  busy,
  photoFile,
  onPhoto,
  onChange,
  onSave,
  onCancel,
  onDelete,
  onRemovePhoto,
}: {
  toilet: Toilet;
  busy: boolean;
  photoFile: File | null;
  onPhoto: (file: File | null) => void;
  onChange: (toilet: Toilet) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onRemovePhoto: () => void;
}) {
  const update = (patch: Partial<Toilet>) => onChange({ ...toilet, ...patch });

  return (
    <form
      className="add-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <button type="button" className="back" onClick={onCancel}>
        ← Listă
      </button>
      <p className="coords">
        {toilet.lat.toFixed(6)}, {toilet.lng.toFixed(6)}
      </p>
      <Fields
        name={toilet.name}
        address={toilet.address ?? ""}
        city={toilet.city}
        county={toilet.county}
        type={toilet.type}
        hours={toilet.hours ?? ""}
        price={toilet.price ?? ""}
        accessible={toilet.accessible}
        free={toilet.free}
        notes={toilet.notes ?? ""}
        photo={toilet.photo}
        photoFile={photoFile}
        onPhoto={onPhoto}
        onRemovePhoto={onRemovePhoto}
        onChange={update}
      />
      <label>
        Status
        <select
          value={toilet.status}
          onChange={(event) => update({ status: event.target.value as ToiletStatus })}
        >
          {Object.entries(toiletStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sursă
        <input
          value={toilet.source ?? ""}
          onChange={(event) => update({ source: event.target.value })}
        />
      </label>
      <div className="form-actions">
        <button type="submit" className="primary" disabled={busy}>
          Salvează
        </button>
        <button type="button" className="danger" onClick={onDelete} disabled={busy}>
          Șterge
        </button>
      </div>
    </form>
  );
}

function Fields({
  name,
  address,
  city,
  county,
  type,
  hours,
  price,
  accessible,
  free,
  notes,
  photo,
  photoFile,
  onPhoto,
  onRemovePhoto,
  onChange,
}: {
  name: string;
  address: string;
  city: string;
  county: string;
  type: ToiletType;
  hours: string;
  price: string;
  accessible: boolean;
  free: boolean;
  notes: string;
  photo?: string;
  photoFile?: File | null;
  onPhoto?: (file: File | null) => void;
  onRemovePhoto?: () => void;
  onChange: (patch: Partial<ToiletDraft>) => void;
}) {
  return (
    <>
      <label>
        Nume
        <input required value={name} onChange={(event) => onChange({ name: event.target.value })} />
      </label>
      <label>
        Stradă / adresă
        <input value={address} onChange={(event) => onChange({ address: event.target.value })} />
      </label>
      <div className="row">
        <label>
          Localitate
          <input
            required
            value={city}
            onChange={(event) => onChange({ city: event.target.value })}
            placeholder="Oraș sau comună"
          />
        </label>
        <label>
          Județ
          <select
            required
            value={county}
            onChange={(event) => onChange({ county: event.target.value })}
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
      <label>
        Tip
        <select
          value={type}
          onChange={(event) => onChange({ type: event.target.value as ToiletType })}
        >
          {Object.entries(toiletTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Regim de funcționare
        <textarea
          rows={2}
          value={hours}
          onChange={(event) => onChange({ hours: event.target.value })}
          placeholder="L–V 08:00–20:00, sâmbătă 10:00–16:00, duminică închis"
        />
      </label>
      {onPhoto ? (
        <div className="photo-field">
          {photo ? <img src={photo} alt="" className="photo-preview" /> : null}
          <label>
            Poză
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => onPhoto(event.target.files?.[0] ?? null)}
            />
          </label>
          {photoFile ? <p className="hint">{photoFile.name}</p> : null}
          {photo && onRemovePhoto ? (
            <button type="button" className="ghost" onClick={onRemovePhoto}>
              Scoate poza
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="checks">
        <label className="check">
          <input
            type="checkbox"
            checked={accessible}
            onChange={(event) => onChange({ accessible: event.target.checked })}
          />
          Accesibil
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={free}
            onChange={(event) =>
              onChange({ free: event.target.checked, price: event.target.checked ? "" : price })
            }
          />
          Gratuit
        </label>
      </div>
      {free ? null : (
        <label>
          Preț
          <input
            value={price}
            onChange={(event) => onChange({ price: event.target.value, free: false })}
            placeholder="ex. 2 lei, dacă există"
          />
        </label>
      )}
      <label>
        Note
        <textarea rows={3} value={notes} onChange={(event) => onChange({ notes: event.target.value })} />
      </label>
    </>
  );
}
