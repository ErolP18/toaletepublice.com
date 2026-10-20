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

create table if not exists public.institutions (
  id text primary key,
  name text not null,
  kind text not null default 'primarie',
  county text,
  city text,
  email text,
  response_status text not null default 'fara_raspuns',
  toilets_summary text,
  notes text,
  requested_at timestamptz,
  responded_at timestamptz,
  last_emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint institutions_kind_check check (
    kind in ('primarie', 'consiliu_judetean', 'sector', 'minister', 'alta')
  ),
  constraint institutions_status_check check (
    response_status in ('fara_raspuns', 'administreaza', 'nu_administreaza')
  )
);

create index if not exists institutions_status_idx on public.institutions (response_status);
create index if not exists institutions_county_idx on public.institutions (county);

alter table public.institutions enable row level security;

create table if not exists public.mail_templates (
  id text primary key,
  name text not null,
  subject text not null,
  body text not null,
  updated_at timestamptz not null default now()
);

alter table public.mail_templates enable row level security;

create table if not exists public.mail_outbox (
  id text primary key,
  institution_id text references public.institutions (id) on delete set null,
  to_email text not null,
  subject text not null,
  template_id text,
  created_at timestamptz not null default now()
);

create index if not exists mail_outbox_created_idx on public.mail_outbox (created_at desc);

alter table public.mail_outbox enable row level security;

-- Fără politici: publicul nu vede instituțiile, șabloanele sau jurnalul de mail.
-- Adminul trece prin SUPABASE_SECRET_KEY.

create table if not exists public.admin_passkeys (
  id text primary key,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_name text,
  transports text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.admin_passkeys enable row level security;

create table if not exists public.admin_recovery_codes (
  id text primary key,
  code_hash text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_recovery_codes enable row level security;

create table if not exists public.admin_magic_links (
  nonce text primary key,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_magic_links enable row level security;
