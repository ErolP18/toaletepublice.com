"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminHref } from "@/lib/admin-path";
import { counties } from "@/lib/counties";
import {
  institutionKindLabels,
  institutionKinds,
  institutionResponseLabels,
  institutionResponses,
  type Institution,
  type InstitutionKind,
  type InstitutionResponse,
} from "@/lib/desk";
import { readApi } from "@/lib/client-api";
import AdminNav from "./AdminNav";

const emptyForm = {
  name: "",
  kind: "primarie" as InstitutionKind,
  county: "",
  city: "",
  email: "",
  responseStatus: "fara_raspuns" as InstitutionResponse,
  toiletsSummary: "",
  notes: "",
};

type ImportResult = {
  added: number;
  updated: number;
  skipped: number;
  total: number;
};

export default function InstitutionDesk() {
  const router = useRouter();
  const [items, setItems] = useState<Institution[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [county, setCounty] = useState("");
  const [mailed, setMailed] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const data = await readApi<Institution[]>(await fetch("/api/admin/institutions"));
    setItems(Array.isArray(data) ? data : []);
    return Array.isArray(data) ? data : [];
  }

  useEffect(() => {
    load()
      .then(async (list) => {
        if (list.length > 0) return;
        const result = await readApi<ImportResult>(
          await fetch("/api/admin/institutions/import", { method: "POST" }),
        );
        await load();
        if (result.added) {
          setNotice(`Am adus ${result.added} primării din Arad și Timiș.`);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const countyOptions = useMemo(() => {
    const found = new Set(items.map((item) => item.county).filter(Boolean));
    return [...found].sort((a, b) => a.localeCompare(b, "ro"));
  }, [items]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ro");
    return items
      .filter((item) => {
        if (status && item.responseStatus !== status) return false;
        if (county && item.county !== county) return false;
        if (mailed === "sent" && !item.lastEmailedAt) return false;
        if (mailed === "unsent" && item.lastEmailedAt) return false;
        if (!needle) return true;
        return `${item.name} ${item.city} ${item.county} ${item.email} ${item.toiletsSummary}`
          .toLocaleLowerCase("ro")
          .includes(needle);
      })
      .sort((a, b) => {
        const sent = Number(Boolean(a.lastEmailedAt)) - Number(Boolean(b.lastEmailedAt));
        if (sent) return sent;
        return a.name.localeCompare(b.name, "ro");
      });
  }, [items, query, status, county, mailed]);

  function select(item: Institution) {
    setEditId(item.id);
    setForm({
      name: item.name,
      kind: item.kind,
      county: item.county,
      city: item.city,
      email: item.email,
      responseStatus: item.responseStatus,
      toiletsSummary: item.toiletsSummary,
      notes: item.notes,
    });
    setError("");
  }

  function reset() {
    setEditId(null);
    setForm(emptyForm);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (editId) {
        await readApi<Institution>(
          await fetch(`/api/admin/institutions/${editId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          }),
        );
        setNotice("Instituția e actualizată.");
      } else {
        await readApi<Institution>(
          await fetch("/api/admin/institutions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          }),
        );
        setNotice("Instituția e notată.");
      }
      await load();
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut salva.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Ștergi instituția din jurnal?")) return;
    setBusy(true);
    setError("");
    try {
      await readApi<{ ok: boolean }>(
        await fetch(`/api/admin/institutions/${id}`, { method: "DELETE" }),
      );
      await load();
      if (editId === id) reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut șterge.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleMailed(item: Institution) {
    const next = !item.lastEmailedAt;
    setItems((current) =>
      current.map((row) =>
        row.id === item.id
          ? { ...row, lastEmailedAt: next ? new Date().toISOString() : null }
          : row,
      ),
    );
    try {
      const saved = await readApi<Institution>(
        await fetch(`/api/admin/institutions/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mailed: next }),
        }),
      );
      setItems((current) => current.map((row) => (row.id === item.id ? saved : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut bifa trimiterea.");
      await load();
    }
  }

  async function importLists() {
    setBusy(true);
    setError("");
    try {
      const result = await readApi<ImportResult>(
        await fetch("/api/admin/institutions/import", { method: "POST" }),
      );
      await load();
      if (result.added || result.updated) {
        setNotice(
          `Liste Arad + Timiș: ${result.added} noi, ${result.updated} completate, ${result.skipped} deja acolo.`,
        );
      } else {
        setNotice(`Listele sunt deja în jurnal (${result.total} instituții).`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut importa listele.");
    } finally {
      setBusy(false);
    }
  }

  const counts = useMemo(() => {
    return {
      total: items.length,
      waiting: items.filter((item) => item.responseStatus === "fara_raspuns").length,
      yes: items.filter((item) => item.responseStatus === "administreaza").length,
      no: items.filter((item) => item.responseStatus === "nu_administreaza").length,
      sent: items.filter((item) => item.lastEmailedAt).length,
    };
  }, [items]);

  return (
    <div className="app-shell">
      <AdminNav current="institutions" />
      {notice ? <p className="banner">{notice}</p> : null}
      {error ? <p className="banner warn">{error}</p> : null}

      <div className="desk">
        <header className="desk-head">
          <div>
            <h1>Instituții</h1>
            <p className="hint">
              Jurnal intern pentru cererile 544/2001. Bifează Dat după ce ai trimis, inclusiv din
              Proton. Nu apare pe hartă.
            </p>
          </div>
          <div className="desk-head-actions">
            <p className="stats-line">
              {loading
                ? "Se încarcă…"
                : `${counts.total} notate · ${counts.sent} trimise · ${counts.waiting} fără răspuns`}
            </p>
            <button type="button" className="ghost" onClick={() => void importLists()} disabled={busy}>
              {busy ? "Import…" : "Liste Arad + Timiș"}
            </button>
          </div>
        </header>

        <form className="desk-form" onSubmit={(event) => void save(event)}>
          <label>
            Instituție
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Primăria Municipiului Cluj-Napoca"
            />
          </label>
          <div className="row">
            <label>
              Tip
              <select
                value={form.kind}
                onChange={(event) => setForm({ ...form, kind: event.target.value as InstitutionKind })}
              >
                {institutionKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {institutionKindLabels[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Răspuns
              <select
                value={form.responseStatus}
                onChange={(event) =>
                  setForm({ ...form, responseStatus: event.target.value as InstitutionResponse })
                }
              >
                {institutionResponses.map((value) => (
                  <option key={value} value={value}>
                    {institutionResponseLabels[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row">
            <label>
              Localitate
              <input
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
              />
            </label>
            <label>
              Județ
              <select
                value={form.county}
                onChange={(event) => setForm({ ...form, county: event.target.value })}
              >
                <option value="">—</option>
                {counties.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            E-mail oficial
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="registratura@…"
            />
          </label>
          {form.responseStatus === "administreaza" ? (
            <label>
              Toalete și detalii
              <textarea
                rows={4}
                value={form.toiletsSummary}
                onChange={(event) => setForm({ ...form, toiletsSummary: event.target.value })}
                placeholder="Adrese, program, gratuit/taxă, accesibilitate."
              />
            </label>
          ) : null}
          <label>
            Note interne
            <textarea
              rows={2}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="primary" disabled={busy}>
              {busy ? "Salvez…" : editId ? "Actualizează" : "Notează"}
            </button>
            {editId ? (
              <>
                <button type="button" className="ghost" onClick={reset} disabled={busy}>
                  Anulează
                </button>
                {form.email ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      router.push(
                        `${adminHref("/mail")}?to=${encodeURIComponent(form.email)}&institution=${editId}`,
                      )
                    }
                  >
                    Trimite cererea
                  </button>
                ) : null}
                <button
                  type="button"
                  className="danger"
                  onClick={() => void remove(editId)}
                  disabled={busy}
                >
                  Șterge
                </button>
              </>
            ) : null}
          </div>
        </form>

        <div className="admin-tools desk-filters">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrează"
            aria-label="Filtrează instituțiile"
          />
          <select
            value={county}
            onChange={(event) => setCounty(event.target.value)}
            aria-label="Județ"
          >
            <option value="">Toate județele</option>
            {countyOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Răspuns">
            <option value="">Toate răspunsurile</option>
            {institutionResponses.map((value) => (
              <option key={value} value={value}>
                {institutionResponseLabels[value]}
              </option>
            ))}
          </select>
          <select
            value={mailed}
            onChange={(event) => setMailed(event.target.value)}
            aria-label="Trimise"
          >
            <option value="">Toate trimiterile</option>
            <option value="unsent">Netrimise</option>
            <option value="sent">Trimise</option>
          </select>
        </div>

        {error || loading ? null : filtered.length === 0 ? (
          <p className="empty">
            Nicio instituție pe filtrul ăsta. Importă listele Arad și Timiș sau notează una.
          </p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th className="sent">Dat</th>
                <th>Instituție</th>
                <th>Răspuns</th>
                <th>Mail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className={editId === item.id ? "is-active" : undefined}
                  tabIndex={0}
                  onClick={() => select(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") select(item);
                  }}
                >
                  <td className="sent" onClick={(event) => event.stopPropagation()}>
                    <label className="sent-check">
                      <input
                        type="checkbox"
                        checked={Boolean(item.lastEmailedAt)}
                        onChange={() => void toggleMailed(item)}
                        aria-label={`Am dat mail la ${item.name}`}
                      />
                    </label>
                  </td>
                  <td>
                    <strong>{item.name}</strong>
                    <em>
                      {[institutionKindLabels[item.kind], item.city, item.county]
                        .filter(Boolean)
                        .join(" · ")}
                    </em>
                    {item.responseStatus === "administreaza" && item.toiletsSummary ? (
                      <em>{item.toiletsSummary}</em>
                    ) : null}
                  </td>
                  <td>
                    <span className="status" data-status={item.responseStatus}>
                      {institutionResponseLabels[item.responseStatus]}
                    </span>
                  </td>
                  <td>
                    <em>
                      {item.lastEmailedAt
                        ? `trimis ${new Date(item.lastEmailedAt).toLocaleDateString("ro-RO")}`
                        : item.email || "fără e-mail"}
                    </em>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
