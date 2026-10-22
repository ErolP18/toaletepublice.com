"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Institution, MailOutboxRow, MailTemplate } from "@/lib/desk";
import { outboxStatusLabels } from "@/lib/desk";
import { readApi } from "@/lib/client-api";
import AdminNav from "./AdminNav";

type MailState = {
  configured: boolean;
  from: string;
  senderName: string;
  templates: MailTemplate[];
  outbox: MailOutboxRow[];
};

export default function MailDesk() {
  const searchParams = useSearchParams();
  const [mail, setMail] = useState<MailState | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [to, setTo] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [templateId, setTemplateId] = useState("cerere-544");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const [previousSent, setPreviousSent] = useState(false);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [batchConfirm, setBatchConfirm] = useState(false);

  async function load() {
    const [mailData, list] = await Promise.all([
      readApi<MailState>(await fetch("/api/admin/mail")),
      readApi<Institution[]>(await fetch("/api/admin/institutions")),
    ]);
    setMail(mailData);
    setInstitutions(Array.isArray(list) ? list : []);
    if (mailData.templates[0] && !mailData.templates.some((item) => item.id === templateId)) {
      setTemplateId(mailData.templates[0].id);
    }
  }

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const nextTo = searchParams.get("to") ?? "";
    const nextInstitution = searchParams.get("institution") ?? "";
    const nextTemplate = searchParams.get("template") ?? "";
    const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);
    if (nextTo) setTo(nextTo);
    if (nextInstitution) setInstitutionId(nextInstitution);
    if (nextTemplate) setTemplateId(nextTemplate);
    if (ids.length) setBatchIds(ids);
  }, [searchParams]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedTemplate = mail?.templates.find((item) => item.id === templateId);

  useEffect(() => {
    if (!selectedTemplate) return;
    setEditSubject(selectedTemplate.subject);
    setEditBody(selectedTemplate.body);
  }, [selectedTemplate]);

  async function preview() {
    setError("");
    const data = await readApi<{
      subject: string;
      body: string;
      missing?: string[];
      previousSent?: boolean;
    }>(
      await fetch("/api/admin/mail/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, institutionId, templateId }),
      }),
    );
    setSubject(data.subject);
    setBody(data.body);
    setMissing(data.missing ?? []);
    setPreviousSent(Boolean(data.previousSent));
    setConfirm(false);
  }

  useEffect(() => {
    if (loading) return;
    void preview().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, institutionId, templateId, loading]);

  function pickInstitution(id: string) {
    setInstitutionId(id);
    const found = institutions.find((item) => item.id === id);
    if (found?.email) setTo(found.email);
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!confirm) {
      setError("Bifează confirmarea înainte de trimitere.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await readApi<{ ok: boolean; to: string }>(
        await fetch("/api/admin/mail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, institutionId, templateId, subject, body, confirm: true }),
        }),
      );
      setNotice(`SMTP a acceptat mesajul către ${result.to}. Asta nu înseamnă că a fost citit.`);
      setConfirm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut trimite.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate() {
    if (!selectedTemplate) return;
    setBusy(true);
    setError("");
    try {
      await readApi<MailTemplate>(
        await fetch("/api/admin/mail/templates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedTemplate.id,
            subject: editSubject,
            body: editBody,
          }),
        }),
      );
      await load();
      await preview();
      setNotice("Șablonul e salvat. Următoarele trimiteri îl folosesc.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut salva șablonul.");
    } finally {
      setBusy(false);
    }
  }

  async function sendBatch() {
    if (!batchConfirm) {
      setError("Confirmă trimiterea individuală, fără CC/BCC.");
      return;
    }
    const withEmail = institutions.filter((item) => batchIds.includes(item.id) && item.email);
    if (!withEmail.length) {
      setError("Nicio instituție cu e-mail valid în lot.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const already = withEmail.filter((item) => item.lastEmailedAt);
      if (already.length && !window.confirm(`${already.length} au mai primit o solicitare. Continui?`)) {
        setBusy(false);
        return;
      }
      const result = await readApi<{ results: Array<{ id: string; ok: boolean; error?: string }> }>(
        await fetch("/api/admin/mail/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: withEmail.slice(0, 12).map((item) => item.id),
            templateId,
            confirm: true,
          }),
        }),
      );
      const failed = result.results.filter((item) => !item.ok).length;
      const ok = result.results.filter((item) => item.ok).length;
      setNotice(`${ok} acceptate de SMTP, ${failed} cu eroare. Maximum 12 pe rundă, fiecare mesaj separat.`);
      setBatchConfirm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut trimite lotul.");
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(to.trim() && subject.trim() && body.trim() && mail?.configured);
  const batchList = institutions.filter((item) => batchIds.includes(item.id));
  const outbox = mail?.outbox ?? [];
  const institutionsById = useMemo(
    () => new Map(institutions.map((item) => [item.id, item])),
    [institutions],
  );

  const institutionOptions = useMemo(
    () =>
      institutions.filter((item) => item.email || item.id === institutionId),
    [institutions, institutionId],
  );

  function openOutboxRow(row: MailOutboxRow) {
    setTo(row.toEmail);
    if (row.institutionId) pickInstitution(row.institutionId);
    if (row.templateId) setTemplateId(row.templateId);
  }

  return (
    <div className="app-shell">
      <AdminNav current="mail" />
      {notice ? <p className="banner">{notice}</p> : null}
      {error ? <p className="banner warn">{error}</p> : null}

      <div className="desk desk-mail">
        <div className="mail-main">
        <header className="desk-head">
          <div>
            <h1>Mail</h1>
            <p className="hint">
              Un mesaj per instituție, prin Proton SMTP. Acceptarea serverului nu e confirmare de lectură.
            </p>
          </div>
        </header>

        {loading ? <p className="hint">Se încarcă…</p> : null}

        {mail && !mail.configured ? (
          <p className="banner warn">
            SMTP nu e setat. În Proton: Settings → IMAP/SMTP → SMTP tokens. Apoi SMTP_HOST,
            SMTP_USER, SMTP_PASS, SMTP_FROM în .env.local (și Coolify).
          </p>
        ) : null}
        {mail?.from ? (
          <p className="stats-line">
            De la {mail.senderName ? `${mail.senderName} · ` : ""}
            {mail.from}
          </p>
        ) : null}

        {batchList.length ? (
          <section className="desk-section">
            <h2>Lot: {batchList.length} instituții</h2>
            <p className="hint">
              Fără e-mail: {batchList.filter((item) => !item.email).length}. Se trimit doar adresele
              valide, fiecare separat, maxim 12 / rundă.
            </p>
            <ul className="attention-list">
              {batchList.map((item) => (
                <li key={item.id}>
                  {item.name} — {item.email || "fără e-mail"}
                  {item.lastEmailedAt ? " · mai are o trimitere" : ""}
                </li>
              ))}
            </ul>
            <label className="check">
              <input
                type="checkbox"
                checked={batchConfirm}
                onChange={(event) => setBatchConfirm(event.target.checked)}
              />
              Trimit mesaje individuale, fără CC sau BCC
            </label>
            <button type="button" className="primary" disabled={busy} onClick={() => void sendBatch()}>
              Trimite lotul
            </button>
          </section>
        ) : null}

        {missing.length ? (
          <p className="banner warn">
            Variabile fără valoare, omise din text: {missing.join(", ")}.
          </p>
        ) : null}
        {previousSent ? (
          <p className="banner warn">Această instituție mai are o solicitare notată.</p>
        ) : null}

        <form className="desk-form" onSubmit={(event) => void send(event)}>
          <label>
            E-mail instituție
            <input
              type="email"
              required
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="registratura@primarie.ro"
              autoComplete="off"
            />
          </label>
          <div className="row">
            <label>
              Leagă de jurnal
              <select value={institutionId} onChange={(event) => pickInstitution(event.target.value)}>
                <option value="">Fără — doar trimit</option>
                {institutionOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Șablon
              <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                {(mail?.templates ?? []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Subiect
            <input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </label>
          <label>
            Mesaj
            <textarea
              className="letter-edit"
              rows={16}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(event) => setConfirm(event.target.checked)}
            />
            Trimit cererea către {to || "adresa de mai sus"}
          </label>
          <div className="form-actions">
            <button type="submit" className="primary" disabled={busy || !ready}>
              {busy ? "Trimit…" : "Trimite"}
            </button>
          </div>
        </form>

        <section className="desk-section">
          <h2>Șablonul folosit des</h2>
          <p className="hint">
            Variabile: {"{{institutie}}"}, {"{{localitate}}"}, {"{{judet}}"}, {"{{data_solicitarii}}"},{" "}
            {"{{numar_inregistrare}}"}. Cele goale nu rămân în text. Scrisoarea 544 nu se rescrie.
          </p>
          <label>
            Subiect șablon
            <input value={editSubject} onChange={(event) => setEditSubject(event.target.value)} />
          </label>
          <label>
            Text șablon
            <textarea
              className="letter-edit"
              rows={12}
              value={editBody}
              onChange={(event) => setEditBody(event.target.value)}
            />
          </label>
          <div className="form-actions">
            <button type="button" className="ghost" onClick={() => void saveTemplate()} disabled={busy}>
              Salvează șablonul
            </button>
          </div>
        </section>
        </div>

        <aside className="mail-outbox" aria-label="Mesaje trimise">
          <header className="mail-outbox-head">
            <h2>Trimise</h2>
            <p className="hint">{outbox.length ? `${outbox.length} în jurnal` : "Gol"}</p>
          </header>
          {loading ? (
            <p className="hint">Se încarcă…</p>
          ) : outbox.length === 0 ? (
            <p className="empty">Încă nu ai trimis nimic de aici.</p>
          ) : (
            <ul className="mail-outbox-list">
              {outbox.map((row) => {
                const institution = row.institutionId ? institutionsById.get(row.institutionId) : undefined;
                const active = row.toEmail === to && (!row.institutionId || row.institutionId === institutionId);
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={active ? "mail-outbox-item is-active" : "mail-outbox-item"}
                      onClick={() => openOutboxRow(row)}
                    >
                      <strong>{institution?.name || row.toEmail}</strong>
                      <span>{row.subject}</span>
                      <em>
                        {new Date(row.createdAt).toLocaleString("ro-RO")}
                        {" · "}
                        {outboxStatusLabels[row.status] || "Acceptat de SMTP"}
                        {row.error ? ` — ${row.error}` : ""}
                      </em>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
