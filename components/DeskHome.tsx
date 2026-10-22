"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminHref } from "@/lib/admin-path";
import type { AdminStats } from "@/lib/desk";
import { readApi } from "@/lib/client-api";
import AdminNav from "./AdminNav";

type AttentionItem = { id: string; name: string; county?: string; replyId?: string };

type DeskPayload = {
  stats: AdminStats;
  attention: {
    overdue: AttentionItem[];
    clarification: AttentionItem[];
    errors: AttentionItem[];
    noContact: AttentionItem[];
    unprocessed: AttentionItem[];
  };
};

function Card({ label, value }: { label: string; value: number }) {
  return (
    <p className="stat-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </p>
  );
}

function Attention({
  title,
  items,
  href,
}: {
  title: string;
  items: AttentionItem[];
  href: string;
}) {
  return (
    <section className="desk-section">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="empty">Nimic aici.</p>
      ) : (
        <ul className="attention-list">
          {items.slice(0, 12).map((item) => (
            <li key={`${item.id}-${item.replyId ?? ""}`}>
              <Link href={`${href}&selected=${encodeURIComponent(item.id)}`}>{item.name}</Link>
              {item.county ? <em> · {item.county}</em> : null}
            </li>
          ))}
        </ul>
      )}
      {items.length ? (
        <p>
          <Link href={href}>Vezi toate ({items.length})</Link>
        </p>
      ) : null}
    </section>
  );
}

export default function DeskHome() {
  const [data, setData] = useState<DeskPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        setData(await readApi<DeskPayload>(await fetch("/api/admin/stats")));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nu am putut citi panoul.");
      }
    })();
  }, []);

  const stats = data?.stats;
  const base = adminHref("/institutii");

  return (
    <div className="app-shell">
      <AdminNav current="desk" />
      {error ? <p className="banner warn">{error}</p> : null}
      <div className="desk">
        <header className="desk-head">
          <div>
            <h1>Panou</h1>
            <p className="hint">Cifre din jurnalul intern. Publicul nu le vede.</p>
          </div>
        </header>
        {!stats ? (
          <p className="hint">Se încarcă…</p>
        ) : (
          <div className="stat-grid">
            <Card label="Instituții" value={stats.institutions} />
            <Card label="Cu e-mail" value={stats.withEmail} />
            <Card label="Fără e-mail" value={stats.withoutEmail} />
            <Card label="Trimise" value={stats.sent} />
            <Card label="Netrimise" value={stats.unsent} />
            <Card label="Fără răspuns" value={stats.waiting} />
            <Card label="Răspunsuri" value={stats.answered} />
            <Card label="Administrează" value={stats.administers} />
            <Card label="Nu administrează" value={stats.doesNot} />
            <Card label="Toalete confirmate" value={stats.toiletsConfirmed} />
            <Card label="Toalete neconfirmate" value={stats.toiletsUnconfirmed} />
          </div>
        )}
        <h2>Necesită atenție</h2>
        <p className="hint">
          Termenele sunt orientative (10 zile de la trimitere, art. 7 din Legea 544/2001). Verifică
          manual prelungirile.
        </p>
        {data ? (
          <>
            <Attention
              title="Termen depășit"
              items={data.attention.overdue}
              href={`${base}?request=in_asteptare&overdue=1`}
            />
            <Attention
              title="Necesită clarificări"
              items={data.attention.clarification}
              href={`${base}?response=incomplet`}
            />
            <Attention
              title="Erori de trimitere"
              items={data.attention.errors}
              href={`${base}?request=eroare`}
            />
            <Attention
              title="Fără date de contact"
              items={data.attention.noContact}
              href={`${base}?email=none`}
            />
            <Attention
              title="Răspunsuri neprocesate"
              items={data.attention.unprocessed}
              href={`${base}?unprocessed=1`}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
