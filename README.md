# toaletepublice.com

Harta toaletelor publice din România. Proiect personal.

## Hartă

Baza e [OpenStreetMap](https://www.openstreetmap.org/copyright), desenată cu [MapLibre](https://maplibre.org/) și tile-uri vectoriale [OpenFreeMap](https://openfreemap.org/). Nu e nevoie de cheie API.

## Date

Toaletele stau doar în [Supabase](https://supabase.com). Nu există SQLite și nu se face seed.

1. Rulează `supabase/schema.sql` în SQL Editor (o dată, ca să existe tabela).
2. Pune `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` și `SUPABASE_SECRET_KEY` în `.env.local` (și în Coolify).

Harta citește ce e în baza de date. Toaletele se adaugă din admin. Publicul vede toaletele confirmate; propunerile rămân doar în admin.

După un pull, rulează din nou `supabase/schema.sql` (e aditiv) ca să existe tabelele de corespondență. Atașamentele de răspuns stau în `private/uploads/replies`, nu sunt publice.

Adminul nu stă pe `/admin` în producție. Pui `NEXT_PUBLIC_ADMIN_PATH` (o cale greu de ghicit), iar Google e oprit să o indexeze. Intrarea e un cod de 6 cifre pe `erol@ciucur.com`, prin Proton SMTP. Parola din `.env.local` rămâne ca rezervă dacă mailul nu merge.

În Coolify nu seta `DATABASE_URL`. Build pack: **Dockerfile** (nu Nixpacks), port **3000**. Nixpacks scrie tot mediul în imagine, inclusiv `SMTP_PASS`; un `$` din tokenul Proton rupe deploy-ul. Secretul SMTP rămâne doar la runtime, în container.

## Mail Proton

Trimiterea din `/admin/mail` folosește SMTP, nu parola contului Proton.

1. Plan Proton plătit, cu adresă pe domeniu propriu.
2. Proton Mail → Settings → All settings → IMAP/SMTP → SMTP tokens → Generate token.
3. În `.env.local` / Coolify: `SMTP_HOST=smtp.protonmail.ch`, `SMTP_PORT=587`, `SMTP_USER` = adresa de pe domeniu, `SMTP_PASS` = tokenul (nu parola de login), `SMTP_FROM` = aceeași adresă.
4. Identitatea 544 stă în șablonul din Mail, nu în variabile de mediu.
5. Opțional: `SMTP_HOUR_LIMIT` (implicit 80) limitează trimiterile SMTP pe oră.

Dacă SMTP Submission nu e disponibil, rulează [Proton Mail Bridge](https://proton.me/mail/bridge) pe același host: `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_ALLOW_INVALID_CERT=1`, user/parolă din Bridge → Mailbox details. Parola de cont Proton nu se pune în mediu.

## Rulare

```bash
cp .env.example .env.local
npm install
npm run dev
```

Apoi [http://localhost:3000](http://localhost:3000).
