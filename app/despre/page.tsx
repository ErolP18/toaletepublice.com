import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Despre — toaletepublice.com",
  description: "De ce există harta toaletelor publice din România și cum vor intra datele oficiale.",
};

export default function AboutPage() {
  return (
    <main className="about">
      <header className="about-top">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            WC
          </span>
          <span className="brand-copy">
            <strong>toaletepublice.com</strong>
            <em>Înapoi la hartă</em>
          </span>
        </Link>
      </header>

      <article className="about-body">
        <p className="kicker">Proiect personal</p>
        <h1>O hartă a toaletelor publice din România.</h1>
        <p>
          Ideea e simplă: să poți deschide telefonul și să vezi unde e o toaletă publică,
          exact pe stradă, în parc sau în gară — nu aproximativ, ci pe coordonate.
        </p>
        <p>
          Harta de bază e OpenStreetMap, servită gratuit prin OpenFreeMap și MapLibre.
          Are toată România: județe, orașe, sate, râuri, Delta, Carpați și nume de străzi
          până la nivelul clădirii.
        </p>
        <h2>Datele</h2>
        <p>
          Punctele de acum sunt un schelet, ca harta să fie folosibilă. Coordonatele
          oficiale le voi cere primăriilor, consiliilor județene și administratorilor de
          gări / parcuri. Până atunci poți adăuga o propunere: se salvează pe dispozitivul
          tău și apare imediat pe hartă.
        </p>
        <h2>Ce urmează</h2>
        <ul>
          <li>Import din răspunsurile instituțiilor, cu sursă și dată.</li>
          <li>Filtrare după program, accesibilitate și tip.</li>
          <li>Pagină publică per toaletă, ca să poată fi partajată.</li>
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
