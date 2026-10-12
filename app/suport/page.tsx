import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suport — toaletepublice.com",
  description: "Semnalează o toaletă greșită sau trimite date oficiale pentru hartă.",
};

export default function SupportPage() {
  return (
    <main className="about">
      <header className="about-top">
        <Link href="/" className="back">
          ← Hartă
        </Link>
        <nav className="page-nav">
          <Link href="/despre">Despre</Link>
          <Link href="/suport" aria-current="page">
            Suport
          </Link>
        </nav>
      </header>

      <article className="about-body">
        <h1>Suport</h1>
        <p>
          Dacă o toaletă lipsește, e greșit pusă sau nu mai există, scrie-ne.
          La fel dacă ești de la o primărie sau un consiliu județean și vrei să
          trimiți coordonate oficiale.
        </p>

        <h2>Semnalează o problemă</h2>
        <p>
          Spune orașul, adresa aproximativă și ce e în neregulă. Un issue pe{" "}
          <a href="https://github.com/ErolP18/toaletepublice.com/issues">GitHub</a>{" "}
          e suficient deocamdată.
        </p>

        <h2>Pentru instituții</h2>
        <p>
          Avem nevoie de coordonate, adresă, regim de funcționare, tarif,
          accesibilitate și, dacă există, o fotografie. Poți trimite un tabel.
          Cererea tip, pe Legea 544/2001, e{" "}
          <Link href="/cerere">aici</Link>.
        </p>

        <h2>Cont</h2>
        <p className="muted">
          Adăugarea pe hartă se face doar din admin. Nu există cont public.
        </p>
      </article>
    </main>
  );
}
