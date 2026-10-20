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

const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

export type TemplateVars = Record<string, string>;

export function renderTemplate(text: string, vars: TemplateVars) {
  return text.replace(PLACEHOLDER, (_, key: string) => vars[key] ?? "");
}

export function todayRo(date = new Date()) {
  return date.toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
