"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { counties, toiletStatusLabels, toiletTypeLabels } from "@/lib/counties";
import { fetchPlace } from "@/lib/geocode";
import { googleMapsPlaceUrl, needsMapsResolve, parseMapsCoords } from "@/lib/maps";
import { findCity, isInsideRomaniaEnvelope, type MapStyleId } from "@/lib/romania";
import type { SearchSuggestion } from "@/lib/suggest";
import { matchesToilet, sortToilets } from "@/lib/toilets";
import type { Toilet, ToiletDraft, ToiletStatus, ToiletType } from "@/lib/types";
import AdminNav from "@/components/AdminNav";
import SearchBox from "@/components/SearchBox";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="map-canvas map-skeleton" />,
});

async function readApi<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Răspuns invalid de la server.");
    }
  }
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof (data as { error?: string }).error === "string"
        ? (data as { error: string }).error
        : "Nu am putut vorbi cu serverul.";
    throw new Error(message);
  }
  if (data == null) throw new Error("Răspuns gol de la server.");
  return data as T;
}

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
  status: "confirmat",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [institutions, setInstitutions] = useState<Array<{ id: string; name: string }>>([]);
  const [styleId] = useState<MapStyleId>("liberty");
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    null,
  );
  const editRef = useRef(edit);
  editRef.current = edit;

  async function load() {
    const data = await readApi<Toilet[]>(await fetch("/api/admin/toilets"));
    setToilets(sortToilets(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
    fetch("/api/admin/institutions")
      .then((response) => response.json())
      .then((data: Array<{ id: string; name: string }>) => {
        if (Array.isArray(data)) setInstitutions(data.map((item) => ({ id: item.id, name: item.name })));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || busy) return;
      if (addMode) {
        setAddMode(false);
        setDraft(null);
        setPhotoFile(null);
        return;
      }
      if (selectedId) {
        setEdit(null);
        setSelectedId(null);
        setPhotoFile(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addMode, selectedId, busy]);

  const browsingList = !addMode && !edit;

  const filtered = useMemo(() => {
    return toilets.filter((toilet) => {
      if (status && toilet.status !== status) return false;
      return matchesToilet(toilet, query);
    });
  }, [toilets, query, status]);

  const mapToilets = useMemo(() => {
    if (!edit) return filtered;
    return filtered.map((toilet) =>
      toilet.id === edit.id ? { ...toilet, lat: edit.lat, lng: edit.lng } : toilet,
    );
  }, [filtered, edit]);

  const hiddenCount = toilets.filter((toilet) => toilet.status === "propunere").length;

  async function reverseGeocode(lat: number, lng: number) {
    setGeocoding(true);
    try {
      const response = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
      if (!response.ok) return {};
      return await readApi<{
        address?: string;
        city?: string;
        county?: string;
      }>(response);
    } catch {
      return {};
    } finally {
      setGeocoding(false);
    }
  }

  function applyPlace(
    current: { address: string; city: string; county: string },
    data: { address?: string; city?: string; county?: string },
  ) {
    return {
      address: current.address || data.address || "",
      city: current.city || data.city || "",
      county: current.county || data.county || "",
    };
  }

  async function placeDraft(lat: number, lng: number) {
    setDraft((current) => ({ ...(current ?? emptyDraft(lat, lng)), lat, lng }));
    const data = await reverseGeocode(lat, lng);
    setDraft((current) => (current ? { ...current, ...applyPlace(current, data) } : current));
  }

  async function moveEdit(lat: number, lng: number) {
    setEdit((current) => (current ? { ...current, lat, lng } : current));
    const data = await reverseGeocode(lat, lng);
    setEdit((current) =>
      current
        ? {
            ...current,
            lat,
            lng,
            address: current.address || data.address || "",
            city: current.city || data.city || "",
            county: current.county || data.county || "",
          }
        : current,
    );
  }

  async function goToQuery(nextQuery = placeQuery) {
    const needle = nextQuery.trim() || query.trim();
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

  function applyPlaceSuggestion(suggestion: SearchSuggestion) {
    setPlaceQuery(suggestion.query);
    if (suggestion.lat != null && suggestion.lng != null) {
      setFlyTo({
        lat: suggestion.lat,
        lng: suggestion.lng,
        zoom: suggestion.zoom ?? 14,
      });
      if (addMode) void placeDraft(suggestion.lat, suggestion.lng);
      return;
    }
    void goToQuery(suggestion.query);
  }

  function startAdd() {
    setAddMode(true);
    setSelectedId(null);
    setEdit(null);
    setDraft(null);
    setPhotoFile(null);
    setNotice("");
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
    setNotice("");
    if (toilet) setFlyTo({ lat: toilet.lat, lng: toilet.lng, zoom: 16 });
  }

  async function uploadPhoto(id: string, file: File) {
    const body = new FormData();
    body.append("photo", file);
    const response = await fetch(`/api/admin/toilets/${id}/photo`, {
      method: "POST",
      body,
    });
    return await readApi<Toilet>(response);
  }

  async function applyPhoto(file: File) {
    const ready = namedImage(file);
    if (!ready) {
      setError("Folosește JPG, PNG sau WebP.");
      return;
    }
    setError("");
    const current = editRef.current;
    if (!current) {
      setPhotoFile(ready);
      return;
    }
    setBusy(true);
    try {
      const saved = await uploadPhoto(current.id, ready);
      await load();
      setPhotoFile(null);
      setEdit(saved);
      setNotice("Poza e salvată.");
    } catch (err) {
      setPhotoFile(ready);
      setError(err instanceof Error ? err.message : "Nu am putut salva poza.");
    } finally {
      setBusy(false);
    }
  }

  const applyPhotoRef = useRef(applyPhoto);
  applyPhotoRef.current = applyPhoto;

  useEffect(() => {
    if (!addMode && !edit) return;
    function onPaste(event: ClipboardEvent) {
      const file = fileFromClipboard(event.clipboardData);
      if (!file) return;
      event.preventDefault();
      void applyPhotoRef.current(file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addMode, edit]);

  async function removePhoto(id: string) {
    if (!window.confirm("Scoți poza?")) return;
    setBusy(true);
    setError("");
    try {
      const data = await readApi<Toilet>(
        await fetch(`/api/admin/toilets/${id}/photo`, { method: "DELETE" }),
      );
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
      const data = await readApi<Toilet>(
        await fetch("/api/admin/toilets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, source: "admin" }),
        }),
      );
      const saved = photoFile ? await uploadPhoto(data.id, photoFile) : data;
      await load();
      setAddMode(false);
      setDraft(null);
      setPhotoFile(null);
      setSelectedId(saved.id);
      setEdit(saved);
      setNotice(
        saved.status === "propunere"
          ? "Salvat ca propunere. Nu apare pe harta publică."
          : "Salvat. Apare pe harta publică.",
      );
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
      const data = await readApi<Toilet>(
        await fetch(`/api/admin/toilets/${edit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(edit),
        }),
      );
      const saved = photoFile ? await uploadPhoto(edit.id, photoFile) : data;
      await load();
      setPhotoFile(null);
      setEdit(saved);
      setNotice("Modificările sunt salvate.");
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
      await readApi<{ ok: boolean }>(
        await fetch(`/api/admin/toilets/${id}`, { method: "DELETE" }),
      );
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

  return (
    <div className="app-shell">
      <AdminNav
        current="toilets"
        actions={
          <button type="button" className="ghost" onClick={startAdd} aria-pressed={addMode}>
            Adaugă
          </button>
        }
      >
        <SearchBox
          value={placeQuery}
          toilets={toilets}
          placeholder="Comună, stradă"
          ariaLabel="Caută comună sau stradă"
          onChange={setPlaceQuery}
          onSubmit={() => void goToQuery()}
          onPick={applyPlaceSuggestion}
        />
      </AdminNav>

      {notice ? <p className="banner">{notice}</p> : null}
      {error ? (
        <p className="banner warn">
          {error}{" "}
          <button
            type="button"
            className="back"
            onClick={() => {
              setError("");
              setLoading(true);
              load()
                .catch((err: Error) => setError(err.message))
                .finally(() => setLoading(false));
            }}
          >
            Reîncearcă
          </button>
        </p>
      ) : null}

      <div className={`workspace admin-workspace${browsingList ? "" : " is-editing"}`}>
        <aside className="admin-sidebar">
          {browsingList ? (
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
          ) : null}
          <p className="stats-line">
            {loading
              ? "Se încarcă…"
              : `${filtered.length} ${filtered.length === 1 ? "toaletă" : "toalete"}`}
            {!loading && hiddenCount > 0 ? ` · ${hiddenCount} doar în admin` : ""}
          </p>

          {addMode ? (
            <AdminForm
              draft={draft}
              geocoding={geocoding}
              busy={busy}
              photoFile={photoFile}
              onPhoto={(file) => void applyPhoto(file)}
              onChange={setDraft}
              onPlace={(lat, lng) => {
                setFlyTo({ lat, lng, zoom: 18 });
                void placeDraft(lat, lng);
              }}
              onSave={() => void saveNew()}
              onCancel={cancelAdd}
            />
          ) : edit ? (
            <EditForm
              toilet={edit}
              institutions={institutions}
              geocoding={geocoding}
              busy={busy}
              photoFile={photoFile}
              onPhoto={(file) => void applyPhoto(file)}
              onChange={setEdit}
              onPlace={(lat, lng) => {
                setFlyTo({ lat, lng, zoom: 18 });
                void moveEdit(lat, lng);
              }}
              onSave={() => void saveEdit()}
              onCancel={() => {
                setEdit(null);
                setSelectedId(null);
                setPhotoFile(null);
              }}
              onDelete={() => void removeToilet(edit.id)}
              onRemovePhoto={() => void removePhoto(edit.id)}
            />
          ) : loading ? (
            <p className="add-empty">Se încarcă lista…</p>
          ) : filtered.length === 0 ? (
            <div className="add-empty">
              <p>
                {error
                  ? error
                  : toilets.length === 0
                    ? "Nicio toaletă în bază. Adaugă prima de pe hartă."
                    : "Nimic nu se potrivește cu filtrul."}
              </p>
            </div>
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
                    tabIndex={0}
                    onClick={() => selectToilet(toilet.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectToilet(toilet.id);
                      }
                    }}
                  >
                    <td>{toilet.name}</td>
                    <td>
                      {toilet.city}
                      {toilet.county && toilet.county !== toilet.city ? `, ${toilet.county}` : ""}
                    </td>
                    <td>
                      <span className="status" data-status={toilet.status}>
                        {toiletStatusLabels[toilet.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </aside>

        <section className="map-wrap">
          <MapView
            toilets={mapToilets}
            selectedId={selectedId}
            addMode={addMode || Boolean(edit)}
            draftPoint={draft ? { lat: draft.lat, lng: draft.lng } : null}
            styleId={styleId}
            flyTo={flyTo}
            onSelect={selectToilet}
            onMapClick={(lat, lng) => {
              if (addMode) void placeDraft(lat, lng);
              else if (edit) void moveEdit(lat, lng);
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
  onPlace,
  onSave,
  onCancel,
}: {
  draft: ToiletDraft | null;
  geocoding: boolean;
  busy: boolean;
  photoFile: File | null;
  onPhoto: (file: File) => void;
  onChange: (draft: ToiletDraft | null) => void;
  onPlace: (lat: number, lng: number) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!draft) {
    return (
      <div className="add-empty">
        <p>Caută o stradă sus, apasă pe hartă sau lipește un link din Google Maps.</p>
        <MapsPasteField onPlace={onPlace} />
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
        {geocoding ? " · citesc adresa…" : ""}{" "}
        <a href={googleMapsPlaceUrl(draft.lat, draft.lng)} target="_blank" rel="noreferrer">
          Google Maps
        </a>
      </p>
      <MapsPasteField onPlace={onPlace} />
      <Fields
        name={draft.name}
        address={draft.address}
        city={draft.city}
        county={draft.county}
        type={draft.type}
        status={draft.status}
        hours={draft.hours}
        price={draft.price}
        accessible={draft.accessible}
        free={draft.free}
        notes={draft.notes}
        photoFile={photoFile}
        photoBusy={busy}
        onPhoto={onPhoto}
        onChange={update}
        focusName
      />
      <div className="form-actions">
        <button type="submit" className="primary" disabled={!ready || busy}>
          {busy ? "Salvez…" : "Salvează"}
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
  institutions,
  geocoding,
  busy,
  photoFile,
  onPhoto,
  onChange,
  onPlace,
  onSave,
  onCancel,
  onDelete,
  onRemovePhoto,
}: {
  toilet: Toilet;
  institutions: Array<{ id: string; name: string }>;
  geocoding: boolean;
  busy: boolean;
  photoFile: File | null;
  onPhoto: (file: File) => void;
  onChange: (toilet: Toilet) => void;
  onPlace: (lat: number, lng: number) => void;
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
        {geocoding ? " · citesc adresa…" : ""}{" "}
        <a href={googleMapsPlaceUrl(toilet.lat, toilet.lng)} target="_blank" rel="noreferrer">
          Google Maps
        </a>
      </p>
      <MapsPasteField onPlace={onPlace} />
      <Fields
        name={toilet.name}
        address={toilet.address ?? ""}
        city={toilet.city}
        county={toilet.county}
        type={toilet.type}
        status={toilet.status}
        hours={toilet.hours ?? ""}
        price={toilet.price ?? ""}
        accessible={toilet.accessible}
        free={toilet.free}
        notes={toilet.notes ?? ""}
        photo={toilet.photo}
        photoFile={photoFile}
        photoBusy={busy}
        photoImmediate
        onPhoto={onPhoto}
        onRemovePhoto={onRemovePhoto}
        onChange={update}
      />
      <label>
        Sursă
        <input
          value={toilet.source ?? ""}
          onChange={(event) => update({ source: event.target.value })}
        />
      </label>
      <label>
        Instituție sursă (doar intern)
        <select
          value={toilet.institutionId ?? ""}
          onChange={(event) => update({ institutionId: event.target.value || undefined })}
        >
          <option value="">—</option>
          {institutions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {toilet.sourceRespondedAt ? (
        <p className="hint">
          Informații din răspuns: {new Date(toilet.sourceRespondedAt).toLocaleDateString("ro-RO")}
          {toilet.sourceRequestId ? ` · cerere ${toilet.sourceRequestId.slice(0, 8)}` : ""}
        </p>
      ) : null}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Salvez…" : "Salvează"}
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
  status,
  hours,
  price,
  accessible,
  free,
  notes,
  photo,
  photoFile,
  photoBusy,
  photoImmediate,
  onPhoto,
  onRemovePhoto,
  onChange,
  focusName,
}: {
  name: string;
  address: string;
  city: string;
  county: string;
  type: ToiletType;
  status?: ToiletStatus;
  hours: string;
  price: string;
  accessible: boolean;
  free: boolean;
  notes: string;
  photo?: string;
  photoFile?: File | null;
  photoBusy?: boolean;
  photoImmediate?: boolean;
  onPhoto?: (file: File) => void;
  onRemovePhoto?: () => void;
  onChange: (patch: Partial<ToiletDraft>) => void;
  focusName?: boolean;
}) {
  return (
    <>
      <label>
        Nume
        <input
          required
          autoFocus={focusName}
          value={name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
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
      <div className="row">
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
        {status ? (
          <label>
            Status
            <select
              value={status}
              onChange={(event) => onChange({ status: event.target.value as ToiletStatus })}
            >
              {Object.entries(toiletStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {status === "propunere" ? (
        <p className="hint">Propunerile rămân doar în admin, nu apar pe harta publică.</p>
      ) : null}
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
        <PhotoField
          photo={photo}
          photoFile={photoFile}
          busy={photoBusy}
          immediate={photoImmediate}
          onPhoto={onPhoto}
          onRemovePhoto={onRemovePhoto}
        />
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

function MapsPasteField({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply(raw: string) {
    const text = raw.trim();
    if (!text) return;
    setError("");
    const local = parseMapsCoords(text);
    if (local) {
      if (!isInsideRomaniaEnvelope(local.lat, local.lng)) {
        setError("Locul pare în afara României.");
        return;
      }
      onPlace(local.lat, local.lng);
      setValue("");
      return;
    }
    if (!needsMapsResolve(text) && !/^https?:\/\//i.test(text)) {
      setError("Lipește un link din Google Maps sau coordonate.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/geocode/maps?url=${encodeURIComponent(text)}`);
      const data = (await response.json()) as { lat?: number; lng?: number; error?: string };
      if (!response.ok || data.lat == null || data.lng == null) {
        setError(data.error || "Nu am găsit coordonatele.");
        return;
      }
      onPlace(data.lat, data.lng);
      setValue("");
    } catch {
      setError("Nu am putut citi linkul.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="maps-paste">
      Link Google Maps
      <input
        type="text"
        inputMode="url"
        value={value}
        placeholder="https://maps.app.goo.gl/…"
        disabled={busy}
        onChange={(event) => setValue(event.target.value)}
        onPaste={(event) => {
          const text = event.clipboardData.getData("text");
          if (!text.trim()) return;
          event.preventDefault();
          setValue(text);
          void apply(text);
        }}
        onBlur={() => void apply(value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void apply(value);
          }
        }}
      />
      {busy ? <p className="hint">Citesc linkul…</p> : null}
      {error ? <p className="hint">{error}</p> : null}
    </label>
  );
}

const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function namedImage(file: File) {
  const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
  const ext = PHOTO_TYPES[type];
  if (!ext) return null;
  const name = file.name && file.name.includes(".") ? file.name : `poza.${ext}`;
  return new File([file], name, { type: type === "image/jpg" ? "image/jpeg" : type });
}

function fileFromClipboard(data: DataTransfer | null) {
  if (!data) return null;
  for (const item of data.items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  for (const file of data.files) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

function PhotoField({
  photo,
  photoFile,
  busy,
  immediate,
  onPhoto,
  onRemovePhoto,
}: {
  photo?: string;
  photoFile?: File | null;
  busy?: boolean;
  immediate?: boolean;
  onPhoto: (file: File) => void;
  onRemovePhoto?: () => void;
}) {
  const preview = useObjectUrl(photoFile);
  const shown = preview || photo;
  const [over, setOver] = useState(false);

  return (
    <div
      className={`photo-field${over ? " is-over" : ""}`}
      onDragOver={(event) => {
        if (![...event.dataTransfer.items].some((item) => item.type.startsWith("image/"))) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = fileFromClipboard(event.dataTransfer);
        if (file) onPhoto(file);
      }}
    >
      {shown ? <img src={shown} alt="" className="photo-preview" /> : null}
      <label>
        Poză
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onPhoto(file);
          }}
        />
      </label>
      <p className="hint">
        {immediate
          ? "Lipește o poză sau alege un fișier. Se salvează imediat."
          : "Lipește o poză sau alege un fișier. Se salvează odată cu toaleta."}
      </p>
      {photo && onRemovePhoto ? (
        <button type="button" className="ghost" onClick={onRemovePhoto} disabled={busy}>
          Scoate poza
        </button>
      ) : null}
    </div>
  );
}

function useObjectUrl(file: File | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}
