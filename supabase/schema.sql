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

-- Extinderi aditive. Nu șterg date. Rulează din nou tot fișierul după un pull.

alter table public.institutions add column if not exists website text;
alter table public.institutions add column if not exists request_status text;

alter table public.institutions drop constraint if exists institutions_status_check;
alter table public.institutions add constraint institutions_status_check check (
  response_status in (
    'fara_raspuns',
    'administreaza',
    'nu_administreaza',
    'redirectionare',
    'incomplet',
    'altul'
  )
);

alter table public.institutions drop constraint if exists institutions_request_status_check;
alter table public.institutions add constraint institutions_request_status_check check (
  request_status is null or request_status in (
    'netrimisa',
    'pregatita',
    'trimisa',
    'eroare',
    'in_asteptare',
    'raspuns_primit',
    'necesita_revenire',
    'inchisa'
  )
);

update public.institutions
set request_status = case
  when response_status in ('administreaza', 'nu_administreaza', 'redirectionare', 'incomplet', 'altul')
    then 'raspuns_primit'
  when last_emailed_at is not null then 'in_asteptare'
  else 'netrimisa'
end
where request_status is null;

alter table public.institutions alter column request_status set default 'netrimisa';

create index if not exists institutions_request_idx on public.institutions (request_status);

alter table public.toilets add column if not exists institution_id text references public.institutions (id) on delete set null;
alter table public.toilets add column if not exists source_request_id text;
alter table public.toilets add column if not exists source_responded_at timestamptz;

create index if not exists toilets_institution_idx on public.toilets (institution_id);

alter table public.mail_outbox add column if not exists status text default 'accepted';
alter table public.mail_outbox add column if not exists error text;
alter table public.mail_outbox add column if not exists message_id text;
alter table public.mail_outbox add column if not exists channel text default 'smtp';
alter table public.mail_outbox add column if not exists request_id text;
alter table public.mail_outbox add column if not exists body_preview text;

create table if not exists public.correspondence_requests (
  id text primary key,
  institution_id text not null references public.institutions (id) on delete cascade,
  channel text not null default 'smtp',
  template_id text,
  subject text,
  body text,
  to_email text,
  status text not null default 'pregatita',
  sent_at timestamptz,
  due_at timestamptz,
  extended_until timestamptz,
  registration_number text,
  notes text,
  outbox_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint correspondence_channel_check check (channel in ('smtp', 'proton_manual', 'mailto')),
  constraint correspondence_request_status_check check (
    status in (
      'netrimisa',
      'pregatita',
      'trimisa',
      'eroare',
      'in_asteptare',
      'raspuns_primit',
      'necesita_revenire',
      'inchisa'
    )
  )
);

create index if not exists correspondence_requests_inst_idx on public.correspondence_requests (institution_id, created_at desc);

alter table public.correspondence_requests enable row level security;

create table if not exists public.correspondence_events (
  id text primary key,
  institution_id text references public.institutions (id) on delete cascade,
  request_id text references public.correspondence_requests (id) on delete set null,
  kind text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists correspondence_events_inst_idx on public.correspondence_events (institution_id, created_at desc);

alter table public.correspondence_events enable row level security;

create table if not exists public.correspondence_replies (
  id text primary key,
  institution_id text not null references public.institutions (id) on delete cascade,
  request_id text references public.correspondence_requests (id) on delete set null,
  received_at timestamptz,
  registration_number text,
  response_type text not null default 'fara_raspuns',
  summary text,
  notes text,
  processing text not null default 'neprocesat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint correspondence_reply_type_check check (
    response_type in (
      'fara_raspuns',
      'administreaza',
      'nu_administreaza',
      'redirectionare',
      'incomplet',
      'altul'
    )
  ),
  constraint correspondence_reply_processing_check check (
    processing in ('neprocesat', 'procesat', 'necesita_clarificari')
  )
);

create index if not exists correspondence_replies_inst_idx on public.correspondence_replies (institution_id, created_at desc);

alter table public.correspondence_replies enable row level security;

create table if not exists public.correspondence_files (
  id text primary key,
  reply_id text not null references public.correspondence_replies (id) on delete cascade,
  filename text not null,
  mime text not null,
  byte_size integer not null,
  storage_key text not null,
  created_at timestamptz not null default now()
);

alter table public.correspondence_files enable row level security;
