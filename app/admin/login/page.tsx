"use client";

import { useState } from "react";

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
      window.location.href = "/admin";
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="about">
      <article className="about-body login-body">
        <h1>Admin</h1>
        <form className="login-form" onSubmit={(event) => void submit(event)}>
          <label>
            Parolă
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className="banner warn">{error}</p> : null}
          <button type="submit" className="primary" disabled={busy}>
            Intră
          </button>
        </form>
      </article>
    </main>
  );
}
