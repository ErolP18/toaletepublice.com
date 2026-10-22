"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminHref } from "@/lib/admin-path";
import { counties } from "@/lib/counties";
import {
  deriveRequestStatus,
  institutionKindLabels,
  institutionKinds,
  institutionResponseLabels,
  institutionResponses,
  requestStatusLabels,
  requestStatuses,
  replyProcessingLabels,
  type CorrespondenceEvent,
  type CorrespondenceReply,
  type CorrespondenceRequest,
  type Institution,
  type InstitutionKind,
  type InstitutionResponse,
  type ReplyProcessing,
  type RequestStatus,
} from "@/lib/desk";
import { foiaDueAt, foiaTracking } from "@/lib/foia";
import { readApi } from "@/lib/client-api";
import AdminNav from "./AdminNav";

const emptyForm = {
  name: "",
  kind: "primarie" as InstitutionKind,
  county: "",
  city: "",
  email: "",
  website: "",
  responseStatus: "fara_raspuns" as InstitutionResponse,
  requestStatus: "netrimisa" as RequestStatus,
  toiletsSummary: "",
  notes: "",
};

type Detail = Institution & {
  requests: CorrespondenceRequest[];
  replies: CorrespondenceReply[];
  events: CorrespondenceEvent[];
};

type ImportResult = { added: number; updated: number; skipped: number; total: number };

const PAGE = 50;

export default function InstitutionDesk() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Institution[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(searchParams.get("selected"));
  const [detail, setDetail] = useState<Detail | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("response") ?? "");
  const [request, setRequest] = useState(searchParams.get("request") ?? "");
  const [county, setCounty] = useState(searchParams.get("county") ?? "");
  const [emailFilter, setEmailFilter] = useState(searchParams.get("email") ?? "");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "unsent");
  const [page, setPage] = useState(Number(searchParams.get("page") || "1") || 1);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [replySummary, setReplySummary] = useState("");
  const [replyType, setReplyType] = useState<InstitutionResponse>("administreaza");
  const [prepare, setPrepare] = useState<{ subject: string; body: string } | null>(null);
  const [sentDate, setSentDate] = useState("");
  const [replyDate, setReplyDate] = useState("");
  const [replyNumber, setReplyNumber] = useState("");
  const [unprocessedIds, setUnprocessedIds] = useState<Set<string>>(new Set());

  const overdueOnly = searchParams.get("overdue") === "1";
  const unprocessedOnly = searchParams.get("unprocessed") === "1";

  function pushFilters(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`${adminHref("/institutii")}?${params.toString()}`);
  }

  async function load() {
    const [data, replies] = await Promise.all([
      readApi<Institution[]>(await fetch("/api/admin/institutions")),
      readApi<CorrespondenceReply[]>(await fetch("/api/admin/replies")).catch(() => [] as CorrespondenceReply[]),
    ]);
    setItems(Array.isArray(data) ? data : []);
    setUnprocessedIds(
      new Set(
        (Array.isArray(replies) ? replies : [])
          .filter((item) => item.processing === "neprocesat")
          .map((item) => item.institutionId),
      ),
    );
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
        if (result.added) setNotice(`Am adus ${result.added} primării din Arad și Timiș.`);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
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
        const req = deriveRequestStatus(item);
        if (status && item.responseStatus !== status) return false;
        if (request && req !== request) return false;
        if (county && item.county !== county) return false;
        if (emailFilter === "none" && item.email) return false;
        if (emailFilter === "yes" && !item.email) return false;
        if (overdueOnly) {
          if (req !== "in_asteptare" && req !== "trimisa") return false;
          if (!foiaTracking(item.lastEmailedAt).overdue) return false;
        }
        if (unprocessedOnly && !unprocessedIds.has(item.id)) return false;
        if (!needle) return true;
        return `${item.name} ${item.city} ${item.county} ${item.email}`
          .toLocaleLowerCase("ro")
          .includes(needle);
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name, "ro");
        if (sort === "county") return a.county.localeCompare(b.county, "ro") || a.name.localeCompare(b.name, "ro");
        if (sort === "sent") return (b.lastEmailedAt || "").localeCompare(a.lastEmailedAt || "");
        if (sort === "answered") return (b.respondedAt || "").localeCompare(a.respondedAt || "");
        const sent = Number(Boolean(a.lastEmailedAt)) - Number(Boolean(b.lastEmailedAt));
        if (sent) return sent;
        return a.name.localeCompare(b.name, "ro");
      });
  }, [items, query, status, request, county, emailFilter, sort, overdueOnly, unprocessedOnly, unprocessedIds]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const visible = filtered.slice((page - 1) * PAGE, page * PAGE);

  async function openDetail(item: Institution) {
    setEditId(item.id);
    setForm({
      name: item.name,
      kind: item.kind,
      county: item.county,
      city: item.city,
      email: item.email,
      website: item.website,
      responseStatus: item.responseStatus,
      requestStatus: deriveRequestStatus(item),
      toiletsSummary: item.toiletsSummary,
      notes: item.notes,
    });
    pushFilters({ selected: item.id });
    try {
      const data = await readApi<Detail>(await fetch(`/api/admin/institutions/${item.id}`));
      setDetail(data);
    } catch {
      setDetail(null);
    }
  }

  function reset() {
    setEditId(null);
    setForm(emptyForm);
    setDetail(null);
    setPrepare(null);
    pushFilters({ selected: "" });
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
      if (!editId) reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut salva.");
    } finally {
      setBusy(false);
    }
  }

  async function importLists() {
    setBusy(true);
    try {
      const result = await readApi<ImportResult>(
        await fetch("/api/admin/institutions/import", { method: "POST" }),
      );
      await load();
      setNotice(`Liste: ${result.added} noi, ${result.updated} completate, ${result.skipped} deja acolo.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut importa.");
    } finally {
      setBusy(false);
    }
  }

  async function batchStatus(requestStatus: RequestStatus) {
    if (!selected.length) return;
    if (!window.confirm(`Schimbi statusul solicitării pentru ${selected.length} instituții?`)) return;
    setBusy(true);
    try {
      const result = await readApi<{ updated: number }>(
        await fetch("/api/admin/institutions/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selected, requestStatus, confirm: true }),
        }),
      );
      setNotice(`Actualizate ${result.updated}.`);
      setSelected([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut actualiza lotul.");
    } finally {
      setBusy(false);
    }
  }

  const prepareProton = useCallback(async () => {
    if (!editId) return;
    const data = await readApi<{ subject: string; body: string }>(
      await fetch("/api/admin/mail/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: editId, templateId: "cerere-544", to: form.email }),
      }),
    );
    setPrepare(data);
  }, [editId, form.email]);

  async function markManualSent() {
    if (!editId || !prepare) return;
    if (!window.confirm("Confirmi că ai trimis mesajul din Proton?")) return;
    setBusy(true);
    try {
      await readApi(
        await fetch("/api/admin/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirm: true,
            institutionId: editId,
            channel: "proton_manual",
            subject: prepare.subject,
            body: prepare.body,
            toEmail: form.email,
            sentAt: sentDate ? new Date(`${sentDate}T12:00:00`).toISOString() : new Date().toISOString(),
          }),
        }),
      );
      setNotice("Am notat trimiterea manuală. Deschiderea mailului nu înseamnă expediere.");
      await load();
      const item = items.find((row) => row.id === editId);
      if (item) await openDetail({ ...item, lastEmailedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut nota.");
    } finally {
      setBusy(false);
    }
  }

  async function saveReply(event: React.FormEvent) {
    event.preventDefault();
    if (!editId) return;
    setBusy(true);
    try {
      const saved = await readApi<CorrespondenceReply>(
        await fetch("/api/admin/replies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            institutionId: editId,
            requestId: detail?.requests[0]?.id,
            responseType: replyType,
            summary: replySummary,
            receivedAt: replyDate || undefined,
            registrationNumber: replyNumber,
          }),
        }),
      );
      const fileInput = document.getElementById("reply-file") as HTMLInputElement | null;
      const file = fileInput?.files?.[0];
      if (file && saved?.id) {
        const payload = new FormData();
        payload.append("file", file);
        await fetch(`/api/admin/replies/${saved.id}/files`, { method: "POST", body: payload });
      }
      setReplySummary("");
      setReplyDate("");
      setReplyNumber("");
      setNotice("Răspuns notat. Publicarea toaletelor rămâne manuală.");
      await load();
      const item = items.find((row) => row.id === editId);
      if (item) await openDetail(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut nota răspunsul.");
    } finally {
      setBusy(false);
    }
  }

  async function markReply(id: string, processing: ReplyProcessing) {
    setBusy(true);
    try {
      await readApi(
        await fetch("/api/admin/replies", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, processing }),
        }),
      );
      setNotice(processing === "procesat" ? "Răspuns marcat ca procesat." : "Răspuns marcat pentru clarificări.");
      await load();
      const item = items.find((row) => row.id === editId);
      if (item) await openDetail(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut actualiza răspunsul.");
    } finally {
      setBusy(false);
    }
  }

  async function extendDeadline(id: string, sentAt: string) {
    if (!window.confirm("Notezi o prelungire orientativă de încă 10 zile? Verifică manual comunicarea instituției.")) {
      return;
    }
    setBusy(true);
    try {
      await readApi(
        await fetch("/api/admin/requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, extendedUntil: foiaDueAt(sentAt, true).toISOString() }),
        }),
      );
      setNotice("Prelungirea e notată ca urmă internă, nu ca o concluzie juridică.");
      const item = items.find((row) => row.id === editId);
      if (item) await openDetail(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut nota prelungirea.");
    } finally {
      setBusy(false);
    }
  }

  const exportQuery = new URLSearchParams({
    county,
    request,
    response: status,
    email: emailFilter,
  }).toString();

  return (
    <div className="app-shell">
      <AdminNav current="institutions" />
      {notice ? <p className="banner">{notice}</p> : null}
      {error ? <p className="banner warn">{error}</p> : null}

      <div className="desk desk-wide">
        <header className="desk-head">
          <div>
            <h1>Instituții</h1>
            <p className="hint">
              {filtered.length} din {items.length}. Statusul trimiterii e separat de tipul răspunsului.
            </p>
          </div>
          <div className="desk-head-actions">
            <button type="button" className="ghost" onClick={() => void importLists()} disabled={busy}>
              Liste Arad + Timiș
            </button>
            <a className="ghost" href={`/api/admin/export?type=institutions&${exportQuery}`}>
              Export CSV
            </a>
            <a className="ghost" href={`/api/admin/export?type=no-email&${exportQuery}`}>
              Fără e-mail
            </a>
            <a className="ghost" href={`/api/admin/export?type=overdue`}>
              Termene depășite
            </a>
            <a className="ghost" href={`/api/admin/export?type=counties&${exportQuery}`}>
              Județe
            </a>
            <a className="ghost" href={`/api/admin/export?type=requests`}>
              Solicitări
            </a>
            <a className="ghost" href={`/api/admin/export?type=replies`}>
              Răspunsuri
            </a>
          </div>
        </header>

        <div className="admin-tools desk-filters">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
              pushFilters({ q: event.target.value, page: "1" });
            }}
            placeholder="Nume, localitate, e-mail"
          />
          <select
            value={county}
            onChange={(event) => {
              setCounty(event.target.value);
              setPage(1);
              pushFilters({ county: event.target.value, page: "1" });
            }}
          >
            <option value="">Toate județele</option>
            {countyOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={request}
            onChange={(event) => {
              setRequest(event.target.value);
              pushFilters({ request: event.target.value });
            }}
          >
            <option value="">Toate solicitările</option>
            {requestStatuses.map((value) => (
              <option key={value} value={value}>
                {requestStatusLabels[value]}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              pushFilters({ response: event.target.value });
            }}
          >
            <option value="">Toate răspunsurile</option>
            {institutionResponses.map((value) => (
              <option key={value} value={value}>
                {institutionResponseLabels[value]}
              </option>
            ))}
          </select>
          <select
            value={emailFilter}
            onChange={(event) => {
              setEmailFilter(event.target.value);
              pushFilters({ email: event.target.value });
            }}
          >
            <option value="">Cu/fără e-mail</option>
            <option value="yes">Cu e-mail</option>
            <option value="none">Fără e-mail</option>
          </select>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              pushFilters({ sort: event.target.value });
            }}
          >
            <option value="unsent">Netrimise întâi</option>
            <option value="name">Nume</option>
            <option value="county">Județ</option>
            <option value="sent">Data trimiterii</option>
            <option value="answered">Data răspunsului</option>
          </select>
        </div>

        {selected.length ? (
          <div className="form-actions">
            <span className="hint">{selected.length} selectate</span>
            <button type="button" className="ghost" onClick={() => void batchStatus("pregatita")}>
              Marchează pregătite
            </button>
            <button type="button" className="ghost" onClick={() => void batchStatus("inchisa")}>
              Închide
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() =>
                router.push(
                  `${adminHref("/mail")}?ids=${encodeURIComponent(selected.filter((id) => items.find((item) => item.id === id)?.email).join(","))}`,
                )
              }
            >
              Pregătește mail
            </button>
          </div>
        ) : null}

        {loading ? (
          <p className="hint">Se încarcă…</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th className="sent">
                  <input
                    type="checkbox"
                    checked={visible.length > 0 && visible.every((item) => selected.includes(item.id))}
                    onChange={(event) => {
                      const ids = visible.map((item) => item.id);
                      setSelected(
                        event.target.checked
                          ? [...new Set([...selected, ...ids])]
                          : selected.filter((id) => !ids.includes(id)),
                      );
                    }}
                    aria-label="Selectează pagina"
                  />
                </th>
                <th>Instituție</th>
                <th>Solicitare</th>
                <th>Răspuns</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const req = deriveRequestStatus(item);
                const track = foiaTracking(item.lastEmailedAt);
                return (
                  <tr
                    key={item.id}
                    className={editId === item.id ? "is-active" : undefined}
                    onClick={() => void openDetail(item)}
                  >
                    <td className="sent" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? [...selected, item.id]
                              : selected.filter((id) => id !== item.id),
                          )
                        }
                        aria-label={`Selectează ${item.name}`}
                      />
                    </td>
                    <td>
                      <strong>{item.name}</strong>
                      <em>
                        {[item.city, item.county, item.email || "fără e-mail"].filter(Boolean).join(" · ")}
                      </em>
                      {track.overdue ? <em>termen depășit</em> : null}
                    </td>
                    <td>
                      <span className="status" data-status={req}>
                        {requestStatusLabels[req]}
                      </span>
                    </td>
                    <td>
                      <span className="status" data-status={item.responseStatus}>
                        {institutionResponseLabels[item.responseStatus]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="ghost"
            disabled={page <= 1}
            onClick={() => {
              const next = page - 1;
              setPage(next);
              pushFilters({ page: String(next) });
            }}
          >
            Înapoi
          </button>
          <span className="hint">
            Pagina {page} / {pages}
          </span>
          <button
            type="button"
            className="ghost"
            disabled={page >= pages}
            onClick={() => {
              const next = page + 1;
              setPage(next);
              pushFilters({ page: String(next) });
            }}
          >
            Înainte
          </button>
        </div>

        <form className="desk-form" onSubmit={(event) => void save(event)}>
          <h2>{editId ? "Detaliu" : "Instituție nouă"}</h2>
          <label>
            Instituție
            <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
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
              Solicitare
              <select
                value={form.requestStatus}
                onChange={(event) => setForm({ ...form, requestStatus: event.target.value as RequestStatus })}
              >
                {requestStatuses.map((value) => (
                  <option key={value} value={value}>
                    {requestStatusLabels[value]}
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
              <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
            </label>
            <label>
              Județ
              <select value={form.county} onChange={(event) => setForm({ ...form, county: event.target.value })}>
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
            />
          </label>
          <label>
            Website
            <input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
          </label>
          {form.responseStatus === "administreaza" ? (
            <label>
              Toalete și detalii
              <textarea
                rows={3}
                value={form.toiletsSummary}
                onChange={(event) => setForm({ ...form, toiletsSummary: event.target.value })}
              />
            </label>
          ) : null}
          <label>
            Note interne
            <textarea rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
          {editId ? (
            <p className="hint">
              Ultima solicitare:{" "}
              {items.find((item) => item.id === editId)?.lastEmailedAt
                ? new Date(items.find((item) => item.id === editId)!.lastEmailedAt as string).toLocaleDateString("ro-RO")
                : "—"}
              {" · "}
              Ultimul răspuns:{" "}
              {items.find((item) => item.id === editId)?.respondedAt
                ? new Date(items.find((item) => item.id === editId)!.respondedAt as string).toLocaleDateString("ro-RO")
                : "—"}
            </p>
          ) : null}
          <div className="form-actions">
            <button type="submit" className="primary" disabled={busy}>
              {busy ? "Salvez…" : editId ? "Actualizează" : "Notează"}
            </button>
            {editId ? (
              <button type="button" className="ghost" onClick={reset}>
                Anulează
              </button>
            ) : null}
            {editId && form.email ? (
              <button
                type="button"
                className="ghost"
                onClick={() =>
                  router.push(
                    `${adminHref("/mail")}?to=${encodeURIComponent(form.email)}&institution=${editId}`,
                  )
                }
              >
                Trimite prin SMTP
              </button>
            ) : null}
            {editId ? (
              <button type="button" className="ghost" onClick={() => void prepareProton()}>
                Pregătește pentru Proton
              </button>
            ) : null}
            {editId && form.email ? (
              <button
                type="button"
                className="ghost"
                onClick={() =>
                  router.push(
                    `${adminHref("/mail")}?to=${encodeURIComponent(form.email)}&institution=${editId}&template=revenire-544`,
                  )
                }
              >
                Pregătește revenire
              </button>
            ) : null}
          </div>
        </form>

        {prepare ? (
          <section className="desk-section">
            <h2>Mesaj pentru Proton</h2>
            <p className="hint">Copiază textul. Deschiderea aplicației de mail nu înseamnă că s-a trimis.</p>
            <label>
              Subiect
              <input readOnly value={prepare.subject} />
            </label>
            <textarea className="letter-edit" rows={10} readOnly value={prepare.body} />
            <label>
              Data reală a trimiterii
              <input type="date" value={sentDate} onChange={(event) => setSentDate(event.target.value)} />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => void navigator.clipboard.writeText(prepare.subject)}
              >
                Copiază subiectul
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => void navigator.clipboard.writeText(prepare.body)}
              >
                Copiază mesajul
              </button>
              {form.email ? (
                <a
                  className="ghost"
                  href={`mailto:${encodeURIComponent(form.email)}?subject=${encodeURIComponent(prepare.subject)}&body=${encodeURIComponent(prepare.body)}`}
                >
                  Deschide mailto
                </a>
              ) : null}
              <button type="button" className="primary" onClick={() => void markManualSent()}>
                Am trimis din Proton
              </button>
            </div>
          </section>
        ) : null}

        {detail ? (
          <section className="desk-section">
            <h2>Corespondență</h2>
            {detail.requests[0] ? (
              <>
                <p className="hint">{foiaTracking(detail.requests[0].sentAt, detail.requests[0].extendedUntil).label}</p>
                {!detail.requests[0].extendedUntil && detail.requests[0].sentAt ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => void extendDeadline(detail.requests[0].id, detail.requests[0].sentAt as string)}
                  >
                    Notează prelungire orientativă (+10 zile)
                  </button>
                ) : null}
              </>
            ) : (
              <p className="hint">Nicio solicitare notată încă.</p>
            )}
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Solicitare</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {detail.requests.map((item) => (
                  <tr key={item.id}>
                    <td>{item.subject || item.channel}</td>
                    <td>{requestStatusLabels[item.status]}</td>
                    <td>
                      <em>{item.sentAt ? new Date(item.sentAt).toLocaleDateString("ro-RO") : "—"}</em>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <form className="desk-form" onSubmit={(event) => void saveReply(event)}>
              <h2>Notează un răspuns</h2>
              <label>
                Tip
                <select
                  value={replyType}
                  onChange={(event) => setReplyType(event.target.value as InstitutionResponse)}
                >
                  {institutionResponses.map((value) => (
                    <option key={value} value={value}>
                      {institutionResponseLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="row">
                <label>
                  Data răspunsului
                  <input type="date" value={replyDate} onChange={(event) => setReplyDate(event.target.value)} />
                </label>
                <label>
                  Nr. înregistrare
                  <input value={replyNumber} onChange={(event) => setReplyNumber(event.target.value)} />
                </label>
              </div>
              <label>
                Rezumat intern
                <textarea
                  rows={3}
                  value={replySummary}
                  onChange={(event) => setReplySummary(event.target.value)}
                />
              </label>
              <label>
                PDF sau imagine
                <input id="reply-file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" />
              </label>
              <button type="submit" className="primary" disabled={busy}>
                Notează răspunsul
              </button>
            </form>

            {detail.replies.map((reply) => (
              <div key={reply.id} className="desk-section">
                <p className="hint">
                  {new Date(reply.receivedAt || reply.createdAt).toLocaleDateString("ro-RO")} ·{" "}
                  {institutionResponseLabels[reply.responseType]} · {replyProcessingLabels[reply.processing]}
                  {reply.registrationNumber ? ` · nr. ${reply.registrationNumber}` : ""}
                  {reply.summary ? ` — ${reply.summary}` : ""}
                  {reply.files.map((file) => (
                    <a key={file.id} href={`/api/admin/files/${file.id}`}>
                      {" "}
                      {file.filename}
                    </a>
                  ))}
                </p>
                <div className="form-actions">
                  <button type="button" className="ghost" onClick={() => void markReply(reply.id, "procesat")}>
                    Procesat
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => void markReply(reply.id, "necesita_clarificari")}
                  >
                    Necesită clarificări
                  </button>
                </div>
              </div>
            ))}

            <h2>Istoric</h2>
            {detail.events.length === 0 ? (
              <p className="empty">Nicio acțiune notată.</p>
            ) : (
              <ul className="attention-list">
                {detail.events.map((event) => (
                  <li key={event.id}>
                    {new Date(event.createdAt).toLocaleString("ro-RO")} — {event.kind}: {event.detail}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
