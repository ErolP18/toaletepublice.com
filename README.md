# toaletepublice.com

Harta toaletelor publice din România. Proiect personal.

## Hartă

Baza e [OpenStreetMap](https://www.openstreetmap.org/copyright), desenată cu [MapLibre](https://maplibre.org/) și tile-uri vectoriale [OpenFreeMap](https://openfreemap.org/). Nu e nevoie de cheie API.

## Date

Toaletele stau doar în [Supabase](https://supabase.com). Nu există SQLite și nu se face seed la pornire.

1. Rulează `supabase/schema.sql` în SQL Editor.
2. Pune `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` și `SUPABASE_SECRET_KEY` în `.env.local` (și în Coolify).
3. Opțional, o dată: `npm run db:seed`

Publicul vede toaletele confirmate și exemplele; propunerile rămân doar în admin.

Admin: [/admin](http://localhost:3000/admin), parolă din `.env.local`.

În Coolify nu seta `DATABASE_URL`.

## Rulare

```bash
cp .env.example .env.local
npm install
npm run dev
```

Apoi [http://localhost:3000](http://localhost:3000).
