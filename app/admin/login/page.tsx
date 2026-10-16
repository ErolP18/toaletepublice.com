"use client";

import Link from "next/link";
import { useState } from "react";

function nextAdminPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  if (next?.startsWith("/admin") && !next.startsWith("/admin/login")) return next;
  return "/admin";
}

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
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
        <p className="hint">Doar pentru adăugarea și corectarea toaletelor.</p>
        <form className="login-form" onSubmit={(event) => void submit(event)}>
          <label>
            Parolă
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className="banner warn">{error}</p> : null}
          <button type="submit" className="primary" disabled={busy || !password}>
            {busy ? "Intru…" : "Intră"}
          </button>
        </form>
      </article>
    </main>
  );
}
