create table if not exists public.toilets (
  id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  city text not null,
  county text not null,
  address text,
  hours text,
  photo text,
  price text,
  accessible boolean not null default false,
  free boolean not null default true,
  type text not null,
  status text not null default 'propunere',
  notes text,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists toilets_city_idx on public.toilets (city);
create index if not exists toilets_status_idx on public.toilets (status);

alter table public.toilets enable row level security;

drop policy if exists "public read published" on public.toilets;
create policy "public read published"
  on public.toilets
  for select
  to anon, authenticated
  using (status is distinct from 'propunere');

alter table public.toilets add column if not exists price text;

-- Scrierea (insert/update/delete) trece prin SUPABASE_SECRET_KEY, care ocolește RLS.
