-- Politisk Radar - cache-skema for ODA-data.
-- Kør denne i Supabase SQL Editor efter projektet er oprettet.

create table if not exists public.members (
  id bigint primary key,
  navn text not null,
  fornavn text,
  efternavn text,
  party text,
  biografi text,
  startdato timestamptz,
  slutdato timestamptz,
  opdateringsdato timestamptz,
  synced_at timestamptz not null default now()
);

create index if not exists members_party_idx on public.members (party);
create index if not exists members_navn_idx on public.members using gin (to_tsvector('simple', navn));

create table if not exists public.cases (
  id bigint primary key,
  titel text not null,
  titelkort text,
  resume text,
  nummer text,
  tags text[] default '{}',
  opdateringsdato timestamptz,
  synced_at timestamptz not null default now()
);

create index if not exists cases_tags_idx on public.cases using gin (tags);
create index if not exists cases_titel_idx on public.cases using gin (to_tsvector('simple', titel));

create table if not exists public.votes (
  id bigint primary key,
  actor_id bigint not null,
  voting_id bigint not null,
  type_id smallint not null,
  opdateringsdato timestamptz,
  synced_at timestamptz not null default now()
);

create index if not exists votes_actor_idx on public.votes (actor_id);
create index if not exists votes_voting_idx on public.votes (voting_id);

-- Tillad offentlig læseadgang via anon-rolle.
alter table public.members enable row level security;
alter table public.cases enable row level security;
alter table public.votes enable row level security;

do $$ begin
  create policy "Public read members" on public.members for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Public read cases" on public.cases for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Public read votes" on public.votes for select using (true);
exception when duplicate_object then null; end $$;
