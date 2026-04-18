# Politisk Radar

Et gratis, åbent værktøj der gør Folketingets afstemningsdata tilgængeligt for
alle danskere. Søg en politiker og se hvordan de har stemt. Søg et emne og se
hvor partierne står.

## Stack

- **Next.js 14** (App Router, React Server Components)
- **TypeScript** i strict-mode
- **Tailwind CSS** til styling
- **Supabase** (PostgreSQL) til caching af ODA-responses
- **Vercel** til deploy

## Datakilde

Alt data kommer fra [Folketingets Åbne Data (ODA)](https://oda.ft.dk/Help).
Ingen API-nøgle er påkrævet. Vigtige endpoints der bruges:

- `GET /Aktør?$filter=typeid eq 5` – folketingsmedlemmer
- `GET /Stemme?$filter=aktørid eq {id}&$expand=Afstemning` – stemmer pr. politiker
- `GET /Afstemning?$expand=Stemme,Sag` – afstemninger med individuelle stemmer
- `GET /Sag` – sager og lovforslag

## Kør lokalt

```bash
npm install
cp .env.example .env.local
# udfyld Supabase-variablerne i .env.local
npm run dev
```

Appen kører nu på http://localhost:3000. Hvis Supabase ikke er konfigureret
fungerer appen stadig – den henter bare direkte fra ODA uden caching.

## Miljøvariabler

| Variabel | Beskrivelse |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL til dit Supabase projekt, fx `https://yjqecufiwdgiolooitmj.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon-nøglen fra Supabase (Project Settings → API) |
| `NEXT_PUBLIC_ODA_BASE_URL` | Valgfrit. Default `https://oda.ft.dk/api` |

## Supabase setup

1. Opret et projekt på [supabase.com](https://supabase.com).
2. Kør `supabase/schema.sql` i SQL Editor – den opretter `members`, `cases` og
   `votes` med indeks og read-only RLS policies.
3. Kopiér URL + anon key til `.env.local`.

Typer ligger i `lib/database.types.ts`. Regenerér dem hvis skemaet ændres:

```bash
npx supabase gen types typescript --project-id <id> > lib/database.types.ts
```

## Projektstruktur

```
app/
  page.tsx                   # forside med søg og seneste afstemninger
  politiker/[id]/page.tsx    # politikerprofil
  afstemning/[id]/page.tsx   # detaljeret afstemning
  emne/[slug]/page.tsx       # emneside (fase 2)
  sog/page.tsx               # søgeresultater
components/
  SearchBar.tsx
  PoliticianCard.tsx
  VoteList.tsx
  PartyVoteBar.tsx
  StatsGrid.tsx
  PartyComparisonTable.tsx
lib/
  oda.ts                     # typed ODA-klient
  supabase.ts                # Supabase-klient
  cache.ts                   # cache helpers
  parties.ts                 # partifarver og aliaser
  types.ts                   # delte typer
supabase/
  schema.sql                 # databaseskema
```

## Caching-strategi

- **ISR**: alle sider har `revalidate = 3600` (1 time) så de kan serveres
  statisk men stadig holdes friske.
- **Supabase**: politikere caches i `members` med 24-timers TTL. Sager lagres
  i `cases` med udledte tags. En daglig sync-job er et naturligt næste skridt.
- **Fallback**: appen virker uden Supabase – `getSupabase()` returnerer `null`
  og lag lag aktiveres aldrig.

## Fase 2 – emnesøgning

Strukturen er på plads:

- `cases.tags` som `text[]` + GIN-indeks for hurtig tag-lookup
- `/emne/[slug]` ruten er klar og viser sager + afstemninger
- `PartyComparisonTable` er færdig og forbundet – den venter kun på at
  `votes`-tabellen bliver fyldt med aktør+parti information via et
  sync-job (næste PR).

## Deploy til Vercel

1. Push repo'et til GitHub.
2. Importér det i Vercel.
3. Tilføj env-variablerne (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy. `vercel.json` sætter region til Stockholm (`arn1`).

## Licens & attribution

Data © Folketinget, leveret under åbne licensbetingelser. Se
<https://oda.ft.dk/Help>. Politisk Radar er et uafhængigt værktøj uden
tilknytning til Folketinget.
