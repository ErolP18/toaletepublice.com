import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cerere 544 — toaletepublice.com",
  description:
    "Cerere de informații de interes public despre toaletele publice, pe Legea 544/2001.",
};

const letter = `Către
Primăria ______________________________
Compartimentul pentru relații cu publicul / registratură

Cerere de informații de interes public
(Legea nr. 544/2001)

Subsemnatul Erol ________________, 17 ani, cu adresa de corespondență ________________, e-mail ________________, telefon ________________, formulez prezenta cerere în temeiul Legii nr. 544/2001 privind liberul acces la informațiile de interes public.

Fac un proiect personal, toaletepublice.com: o hartă a toaletelor publice din România, cu locul exact, programul și dacă sunt accesibile. Nu e firmă, nu e aplicație cu conturi și nu vând datele. Vreau doar ca un om care are nevoie de o toaletă să o găsească, inclusiv cine e în scaun rulant sau cu copil.

Vă rog să-mi comunicați lista toaletelor publice aflate în administrarea primăriei sau a serviciilor din subordine (parcuri, piețe, gări/autogări unde e cazul, zone pietonale, plaje, faleze). Pentru fiecare punct, dacă le dețineți, am nevoie de:

1. Denumirea locului (parc, piață, stradă etc.)
2. Adresa
3. Coordonate GPS (latitudine și longitudine), sau un plan/hartă din care să se poată citi poziția
4. Regimul de funcționare: program zilnic, zile închise, sezonier sau permanent
5. Dacă e cu plată sau gratuită; dacă e cu plată, tariful
6. Dacă e accesibilă persoanelor cu dizabilități
7. O fotografie a punctului, dacă există în arhiva instituției
8. Operatorul / cine o întreține

Dacă o toaletă a fost desființată, e suficient să o menționați.

Răspunsul îl pot primi pe e-mail, în format tabel (Excel, CSV) sau PDF. Datele vor apărea pe hartă cu sursa instituției.

Vă mulțumesc.
Data: ____________

Erol ________________`;

export default function RequestPage() {
  return (
    <main className="about">
      <header className="about-top">
        <Link href="/" className="back">
          ← Hartă
        </Link>
        <nav className="page-nav">
          <Link href="/despre">Despre</Link>
          <Link href="/suport">Suport</Link>
        </nav>
      </header>

      <article className="about-body">
        <h1>Cerere pe Legea 544/2001</h1>
        <p>
          O trimiți la registratura primăriei, pe e-mail sau prin formularul de
          contact. Completează numele, adresa și mailul. Instituția are, de
          regulă, 10 zile să răspundă.
        </p>
        <pre className="letter">{letter}</pre>
      </article>
    </main>
  );
}
