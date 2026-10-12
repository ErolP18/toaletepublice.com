# toaletepublice.com

Harta toaletelor publice din România. Proiect personal.

## Hartă

Baza e [OpenStreetMap](https://www.openstreetmap.org/copyright), desenată cu [MapLibre](https://maplibre.org/) și tile-uri vectoriale [OpenFreeMap](https://openfreemap.org/). Nu e nevoie de cheie API.

## Date

Toaletele stau în [Supabase](https://supabase.com) când `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e setat; altfel în SQLite local (`data/toilets.db`).

1. Rulează `supabase/schema.sql` în SQL Editor.
2. Pune cheia publishable (și secretul, pentru admin) în `.env.local`.
3. `npm run db:seed`

Publicul vede toaletele confirmate și exemplele; propunerile rămân doar în admin.

Admin: [/admin](http://localhost:3000/admin), parolă din `.env.local`.

## Rulare

```bash
cp .env.example .env.local
npm install
npm run dev
```

Apoi [http://localhost:3000](http://localhost:3000).
