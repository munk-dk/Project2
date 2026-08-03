# Ladepause — Proof of Concept

En webapp der viser elbilister **hvad et ladestop er godt til** under en 30-40 minutters
pause — ikke antal ledige ladere, men toiletter, mad, kaffe, indkøb, ro og plads til at
strække ben. Denne PoC validerer ét spørgsmål: **er de AI-genererede resuméer gode og
retvisende nok til at være nyttige?**

- **Område:** Danmark + Nordtyskland
- **Netværk:** kun Tesla Superchargere
- **Omfang:** et testsæt på 10 stationer (5 DK, 5 DE)
- Ingen live-status, ingen ruteplanlægning, ingen PWA, ingen login — det kommer først hvis
  PoC'en holder.

> Dette er et selvstændigt projekt i mappen `ladepause/`. Det deler intet med andre
> projekter i repoet.

## Arkitektur

Databehandling og webapp er bevidst adskilt i to lag:

```
Fase 1 · Pipeline (scripts/)            Fase 2 · Webapp (app/)
┌──────────────────────────┐           ┌──────────────────────────┐
│ 1. OCM  → stationer      │           │  Kort (Google Maps)      │
│ 2. Google Places + OSM   │  SQLite   │  Liste + filtrering      │
│    → POI'er + anmeldelser │ ───────►  │  Stationsdetalje         │
│ 3. Claude → resumé + tags │  (data/)  │  /api/stations (JSON)    │
└──────────────────────────┘           └──────────────────────────┘
```

- **Rådata-hentning** (trin 1-2) og **AI-generering** (trin 3) er separate trin, så resuméer
  kan regenereres uden at hente data igen.
- **Google Places kaldes kun én gang pr. station** i pipelinen og caches permanent i
  databasen. Webappen læser altid fra vores egen database — aldrig live.
- Databasen er **SQLite** (`data/ladepause.db`, gitignored) for enkelhed. Skemaet er lagt
  tæt op ad en senere Postgres/Supabase + PostGIS-migrering.

## Kom i gang

```bash
cd ladepause
npm install
cp .env.example .env.local   # udfyld nøgler (kun nødvendigt for pipelinen)
npm run dev                  # http://localhost:3000
```

Uden en bygget database viser appen **illustrative eksempeldata** fra
`data/sample-enriched.json`, så du kan se UI'et med det samme — også uden API-nøgler.

## Kør berigelses-pipelinen (Fase 1)

```bash
npm run pipeline:stations     # 1. Stationer → DB (seed-testsæt; --all for hele området)
npm run pipeline:pois         # 2. Google Places + OSM → POI'er (cachet; --osm-only uden Google)
npm run pipeline:summaries    # 3. Claude → resumé + "bedst til"-tags
# eller alt på én gang:
npm run pipeline:all

npm run pipeline:export       # (valgfrit) skriv DB → data/sample-enriched.json og commit
```

Hvert trin er idempotent: trin 2 springer stationer over der allerede er cachet (brug
`--force` for at hente igen), så genkørsler ikke brænder Google-kvote.

### Miljøvariabler

| Variabel | Bruges af | Nødvendig? |
| --- | --- | --- |
| `OCM_API_KEY` | trin 1 | Nej — seed-sæt bruges uden |
| `GOOGLE_PLACES_API_KEY` | trin 2 | Til rigtige POI-data (koster penge — se nedenfor) |
| `ANTHROPIC_API_KEY` | trin 3 | Til resumé-generering (kan også komme fra `ant auth login`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | webapp-kort | Nej — listevisning virker uden |
| `POI_RADIUS_METERS` | trin 2 | Default 700 |
| `CLAUDE_MODEL` | trin 3 | Default `claude-opus-5` |

### Omkostningsstyring (Google Places)

Google Places koster penge pr. kald. Derfor:

- Kaldes **kun én gang pr. station** i pipelinen, aldrig live fra appen.
- Resultatet **caches permanent** i databasen.
- Sæt et **budgetloft på $10** (billing alert/quota) i Google Cloud-projektet som
  sikkerhedsnet. I PoC-skala (10 stationer) ligger forbruget typisk under $1.

## Fase 3 — evaluering

Kør pipelinen mod de 10 stationer og gennemgå resuméerne: er de retvisende? Kan man stole
på dem? Juster prompten i `lib/claude.ts` (bump `PROMPT_VERSION`) og kør
`npm run pipeline:summaries` igen — uden at hente data forfra. Holder kvaliteten, kan der
skaleres til alle Superchargere med `npm run pipeline:stations -- --all`.

## Projektstruktur

```
ladepause/
  data/
    seed-stations.json        # testsæt på 10 Superchargere (input)
    sample-enriched.json      # committet eksempeldata (webapp-fallback)
    ladepause.db              # SQLite (gitignored, bygges af pipelinen)
  lib/
    types.ts                  # delte typer + det faste tag-sæt
    db.ts / repository.ts      # SQLite-skema + skrive-helpers
    stations.ts               # read-only datakilde til webappen
    ocm.ts / places.ts / overpass.ts   # eksterne datakilder
    claude.ts                 # resumé-prompt + generering
    geo.ts                    # afstandsberegning
  scripts/
    01-fetch-stations.ts
    02-fetch-pois.ts
    03-generate-summaries.ts
    04-export-sample.ts
  app/                        # Next.js App Router (kort, liste, detalje, API)
  components/
```

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind · SQLite (better-sqlite3) · Claude API
(`@anthropic-ai/sdk`) · Google Places + Maps · OpenStreetMap/Overpass.

## Deploy

Beregnet til lokal kørsel i PoC-fasen (Fase 3 er manuel kvalitetsgennemgang). Til en Vercel-
deployment af selve visningen: sæt `ladepause` som root directory, tilføj
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, og commit et opdateret `data/sample-enriched.json` som
datakilde (SQLite-filens skrivninger passer ikke til Vercels read-only serverless-filsystem —
pipelinen køres lokalt/planlagt, ikke på Vercel).
