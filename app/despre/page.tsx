import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Despre — toaletepublice.com",
  description: "Harta toaletelor publice din România și cum vor intra datele oficiale.",
};

export default function AboutPage() {
  return (
    <main className="about">
      <header className="about-top">
        <Link href="/" className="back">
          ← Hartă
        </Link>
        <nav className="page-nav">
          <Link href="/despre" aria-current="page">
            Despre
          </Link>
          <Link href="/suport">Suport</Link>
        </nav>
      </header>

      <article className="about-body">
        <h1>Harta toaletelor publice din România</h1>
        <p>
          Scopul e practic: să vezi unde e o toaletă publică, pe coordonate, nu
          aproximativ. Harta e OpenStreetMap, prin OpenFreeMap și MapLibre.
        </p>
        <h2>Datele</h2>
        <p>
          Punctele de acum sunt un schelet. Coordonatele, programul și fotografiile
          oficiale vor veni de la primării, pe Legea 544/2001. Adăugarea pe hartă
          se face doar din admin.{" "}
          <Link href="/cerere">Cererea de trimis</Link>.
        </p>
        <h2>Urmează</h2>
        <ul>
          <li>Import din răspunsurile instituțiilor, cu sursă și dată.</li>
          <li>Filtrare după program, accesibilitate și tip.</li>
          <li>Pagină publică per toaletă.</li>
        </ul>
        <p className="muted">
          Proiect început de Erol. Codul e pe{" "}
          <a href="https://github.com/ErolP18/toaletepublice.com">GitHub</a>.
        </p>
        <Link href="/" className="primary inline-link">
          Deschide harta
        </Link>
      </article>
    </main>
  );
}
