"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Institution, MailOutboxRow, MailTemplate } from "@/lib/desk";
import { readApi } from "@/lib/client-api";
import AdminNav from "./AdminNav";

type MailState = {
  configured: boolean;
  identityReady: boolean;
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
    if (nextTo) setTo(nextTo);
    if (nextInstitution) setInstitutionId(nextInstitution);
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
    const data = await readApi<{ subject: string; body: string }>(
      await fetch("/api/admin/mail/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, institutionId, templateId }),
      }),
    );
    setSubject(data.subject);
    setBody(data.body);
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
          body: JSON.stringify({ to, institutionId, templateId, subject, body }),
        }),
      );
      setNotice(`Trimis către ${result.to}. Apare și în Sent la Proton.`);
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

  const ready = Boolean(to.trim() && subject.trim() && body.trim() && mail?.configured && mail.identityReady);

  const institutionOptions = useMemo(
    () =>
      institutions.filter((item) => item.email || item.id === institutionId),
    [institutions, institutionId],
  );

  return (
    <div className="app-shell">
      <AdminNav current="mail" />
      {notice ? <p className="banner">{notice}</p> : null}
      {error ? <p className="banner warn">{error}</p> : null}

      <div className="desk">
        <header className="desk-head">
          <div>
            <h1>Mail</h1>
            <p className="hint">
              Bagi adresa instituției și pleacă cererea 544/2001 prin Proton. Doar tu vezi pagina.
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
        {mail && mail.configured && !mail.identityReady ? (
          <p className="banner warn">
            Legea 544 cere identitatea solicitantului. Completează MAIL_SENDER_NAME și
            MAIL_SENDER_EMAIL.
          </p>
        ) : null}
        {mail?.from ? (
          <p className="stats-line">
            De la {mail.senderName ? `${mail.senderName} · ` : ""}
            {mail.from}
          </p>
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
            Poți folosi {"{{institutie}}"}, {"{{solicitant_nume}}"}, {"{{solicitant_adresa}}"},{" "}
            {"{{solicitant_email}}"}, {"{{solicitant_telefon}}"}, {"{{data}}"}.
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

        <section className="desk-section">
          <h2>Trimise din site</h2>
          {(mail?.outbox ?? []).length === 0 ? (
            <p className="empty">Încă nu ai trimis nimic de aici.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Către</th>
                  <th>Subiect</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {(mail?.outbox ?? []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.toEmail}</td>
                    <td>{row.subject}</td>
                    <td>
                      <em>{new Date(row.createdAt).toLocaleString("ro-RO")}</em>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
