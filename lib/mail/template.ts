export const DEFAULT_TEMPLATE_ID = "cerere-544";

export const DEFAULT_TEMPLATE = {
  id: DEFAULT_TEMPLATE_ID,
  name: "Cerere 544/2001",
  subject: "Solicitare informatii - Legea nr. 544/2001",
  body: `Bună ziua!

Mă numesc Erol Ciucur, am 17 ani și dezvolt https://toaletepublice.com - un proiect civic, fără scop comercial: o hartă gratuită a toaletelor publice din România. Momentan, toate locațiile afișate pe hartă sunt introduse doar pentru testare.

În baza Legii nr. 544/2001, aș avea rugămintea să îmi comunicați lista toaletelor publice administrate de primăria dumneavoastră, de serviciile sau instituțiile subordonate, inclusiv a celor momentan nefuncționale, și următoarele informații, în măsura în care le dețineți:

— fotografii existente ale locațiilor;
— amplasamentul exact: adresă și, dacă există, coordonate GPS;
— starea de funcționare: funcțională sau nefuncțională;
— programul de acces și intervalele de curățenie, inclusiv eventualele închideri pentru igienizare;
— dacă accesul este gratuit sau cu plată și, după caz, tariful;
— accesibilitatea pentru persoanele cu dizabilități.

Scopul este ca fiecare locație să fie prezentată corect pe hartă, inclusiv cu mențiunea că este nefuncțională, unde este cazul.

Mi-ar face plăcere să colaborăm și mai departe, dacă proiectul vi se pare util pentru comunitatea dumneavoastră. Orice sugestie sau sprijin pentru completarea și actualizarea informațiilor este binevenit. De exemplu, putem crea o pagină dedicată localității, pe care să o faceți cunoscută printr-un link pe site-ul primăriei sau prin coduri QR afișate în spații publice.

Toate cele bune!

Vă mulțumesc!

Cu deosebită considerație,

Ciucur Erol-Eduard

+40 758 431 828

erolciucur.com
`,
};

export const EXTRA_TEMPLATES = [
  {
    id: "revenire-544",
    name: "Revenire fără răspuns",
    subject: "Revenire — Solicitare informatii - Legea nr. 544/2001",
    body: `Bună ziua!

Mă numesc Erol Ciucur. Pe {{data_solicitarii}} am transmis către {{institutie}} o solicitare de informații de interes public, în baza Legii nr. 544/2001, privind toaletele publice administrate de instituția dumneavoastră{{numar_inregistrare}}.

Nu am primit încă un răspuns. Aș avea rugămintea să îmi comunicați stadiul cererii sau, dacă este posibil, informațiile solicitate.

Vă mulțumesc!

Cu deosebită considerație,
Ciucur Erol-Eduard
+40 758 431 828
erolciucur.com
`,
  },
  {
    id: "clarificari-544",
    name: "Solicitare de clarificări",
    subject: "Clarificări — Solicitare informatii - Legea nr. 544/2001",
    body: `Bună ziua!

Vă mulțumesc pentru răspunsul primit din partea {{institutie}}{{numar_inregistrare}}.

Pentru ca locațiile să poată fi prezentate corect pe https://toaletepublice.com, aș avea rugămintea să îmi precizați, în măsura în care le dețineți, punctele rămase neclare din solicitarea inițială: amplasament, stare de funcționare, program, tarif și accesibilitate.

Toate cele bune,
Ciucur Erol-Eduard
`,
  },
  {
    id: "multumire-544",
    name: "Mulțumire pentru răspuns",
    subject: "Mulțumire — toaletepublice.com",
    body: `Bună ziua!

Vă mulțumesc pentru răspunsul {{institutie}}{{numar_inregistrare}}. Informațiile vor fi folosite doar pentru prezentarea corectă, gratuită, a toaletelor publice pe hartă.

Dacă apar actualizări, le primesc cu drag pe aceeași adresă.

Cu deosebită considerație,
Ciucur Erol-Eduard
`,
  },
  {
    id: "personalizat",
    name: "Șablon personalizat",
    subject: "Solicitare — toaletepublice.com",
    body: `Bună ziua!

{{institutie}}

`,
  },
] as const;

const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

export type TemplateVars = Record<string, string>;

export function renderTemplate(text: string, vars: TemplateVars) {
  const rendered = text.replace(PLACEHOLDER, (_, key: string) => {
    const value = vars[key];
    return value ? value : "";
  });
  return rendered.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function missingTemplateVars(text: string, vars: TemplateVars) {
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER)) {
    const key = match[1];
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (!vars[key]) missing.push(key);
  }
  return missing;
}

export function todayRo(date = new Date()) {
  return date.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
