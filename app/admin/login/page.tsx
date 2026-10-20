"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminBasePath } from "@/lib/admin-path";

function nextAdminPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  const base = adminBasePath();
  if (next?.startsWith(base) && next !== `${base}/login` && !next.startsWith(`${base}/login?`)) {
    return next;
  }
  return base;
}

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [methods, setMethods] = useState({ password: true, magic: false });

  useEffect(() => {
    fetch("/api/admin/login")
      .then((response) => response.json())
      .then((data: { password?: boolean; magic?: boolean }) => {
        setMethods({
          password: data.password !== false,
          magic: Boolean(data.magic),
        });
      })
      .catch(() => undefined);
  }, []);

  async function sendCode() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/login/magic", { method: "POST" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Nu am putut trimite mailul.");
        return;
      }
      setSent(true);
      setNotice("Codul e în Proton, pe erol@ciucur.com. 15 minute, o dată.");
    } finally {
      setBusy(false);
    }
  }

  async function withCode(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login/magic", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || "Cod greșit.");
        return;
      }
      window.location.href = nextAdminPath();
    } finally {
      setBusy(false);
    }
  }

  async function withPassword(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || "Parolă greșită.");
        return;
      }
      window.location.href = nextAdminPath();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <article className="login-body">
        <p className="login-back">
          <Link href="/">← Hartă</Link>
        </p>
        <h1>Admin</h1>
        <p className="hint">Îți trimit un cod de 6 cifre pe mail. Nu e o pagină publică.</p>

        {methods.magic ? (
          sent ? (
            <form className="login-form" onSubmit={(event) => void withCode(event)}>
              <label>
                Cod din mail
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                />
              </label>
              <button type="submit" className="primary" disabled={busy || code.length !== 6}>
                {busy ? "Intru…" : "Intră"}
              </button>
              <button type="button" className="ghost" onClick={() => void sendCode()} disabled={busy}>
                Trimite alt cod
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={(event) => { event.preventDefault(); void sendCode(); }}>
              <button type="submit" className="primary" disabled={busy}>
                {busy ? "Trimit…" : "Trimite codul pe mail"}
              </button>
            </form>
          )
        ) : (
          <p className="hint">Configurează SMTP Proton ca să-ți trimit codul.</p>
        )}

        {notice ? <p className="banner">{notice}</p> : null}

        {methods.password ? (
          <details className="login-alt">
            <summary>Parolă, dacă mailul nu merge</summary>
            <form className="login-form" onSubmit={(event) => void withPassword(event)}>
              <label>
                Parolă
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button type="submit" className="primary" disabled={busy || !password}>
                Intră cu parola
              </button>
            </form>
          </details>
        ) : null}

        {error ? <p className="banner warn">{error}</p> : null}
      </article>
    </main>
  );
}
