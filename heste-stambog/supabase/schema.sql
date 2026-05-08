-- Heste Stambog & ID-Verificering — cache-skema.
-- Kør denne i Supabase SQL Editor efter projektet er oprettet.

-- horse_cache: aggregeret hesteprofil samlet fra alle kilder.
create table if not exists public.horse_cache (
  id uuid primary key default gen_random_uuid(),
  ueln text,
  fei_id text,
  danish_ident text,
  chip_number text,
  name text not null,
  birth_year int,
  sex text,
  color text,
  studbook text,
  studbook_number text,
  sire jsonb,
  dam jsonb,
  dam_sire jsonb,
  owner text,
  trainer text,
  country text,
  passport_status text,
  passport_issuing_org text,
  vaccinations jsonb default '[]'::jsonb,
  competition_history jsonb default '[]'::jsonb,
  current_ranking int,
  highest_score numeric,
  sources jsonb default '[]'::jsonb,
  verification_status text,
  verification_flags jsonb default '[]'::jsonb,
  raw jsonb default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists horse_cache_ueln_idx
  on public.horse_cache (ueln) where ueln is not null;
create unique index if not exists horse_cache_fei_id_idx
  on public.horse_cache (fei_id) where fei_id is not null;
create unique index if not exists horse_cache_danish_ident_idx
  on public.horse_cache (danish_ident) where danish_ident is not null;
create index if not exists horse_cache_chip_idx
  on public.horse_cache (chip_number) where chip_number is not null;
create index if not exists horse_cache_name_idx
  on public.horse_cache using gin (to_tsvector('simple', name));

-- search_log: rå søgesvar pr. kilde, så vi kan cache søgeresultater og analysere brugen.
create table if not exists public.search_log (
  id bigserial primary key,
  source text not null,
  query text not null,
  query_type text not null,
  result_count int not null default 0,
  results jsonb default '[]'::jsonb,
  status text not null default 'ok',
  error text,
  fetched_at timestamptz not null default now()
);

create index if not exists search_log_lookup_idx
  on public.search_log (source, query_type, query, fetched_at desc);

-- Tillad offentlig læseadgang via anon-rolle.
alter table public.horse_cache enable row level security;
alter table public.search_log enable row level security;

do $$ begin
  create policy "Public read horse_cache" on public.horse_cache for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Public read search_log" on public.search_log for select using (true);
exception when duplicate_object then null; end $$;
