"use client";

import Link from "next/link";
import { adminHref } from "@/lib/admin-path";
import { logoutAdmin } from "@/lib/client-api";

export default function AdminNav({
  current,
  children,
  actions,
}: {
  current: "desk" | "toilets" | "institutions" | "mail";
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="topbar admin-topbar">
      <nav className="page-nav">
        <Link href="/">Hartă</Link>
        <Link href={adminHref("/panou")} aria-current={current === "desk" ? "page" : undefined}>
          Panou
        </Link>
        <Link href={adminHref()} aria-current={current === "toilets" ? "page" : undefined}>
          Toalete
        </Link>
        <Link href={adminHref("/institutii")} aria-current={current === "institutions" ? "page" : undefined}>
          Instituții
        </Link>
        <Link href={adminHref("/mail")} aria-current={current === "mail" ? "page" : undefined}>
          Mail
        </Link>
      </nav>
      {children ?? <span className="admin-nav-slot" />}
      <div className="admin-actions">
        {actions}
        <button type="button" className="ghost" onClick={() => void logoutAdmin()}>
          Ieșire
        </button>
      </div>
    </header>
  );
}
