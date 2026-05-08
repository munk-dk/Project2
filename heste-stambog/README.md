# Heste Stambog & ID-Verificering

Et samlet sted at slå danske og internationale heste op, verificere deres
identitet på tværs af registre og se konkurrencehistorik. Primært målrettet
dressurryttere og -professionelle.

## Stack

- **Next.js 14** (App Router, React Server Components)
- **TypeScript** i strict-mode
- **Tailwind CSS** til styling
- **Supabase (PostgreSQL)** til caching af søgesvar og hesteprofiler
- **cheerio** til HTML-parsing af scrape-targets
- **Vercel** til deploy

## Datakilder (Fase 1)

| Kilde | Indhold | Adgang |
|---|---|---|
| Equinet/SEGES | Danske heste — ident, navn, chip, stambog, ejer | Oracle APEX scraping med session |
| FEI | Internationale konkurrenceheste | HTML/JSON-scraping af søgeside |

UELN, WBFSH og DRF er planlagt til Fase 2.

## Kør lokalt

```bash
cd heste-stambog
npm install
cp .env.example .env.local
# udfyld dine Supabase-værdier i .env.local
npm run dev
```

Appen kører på <http://localhost:3000>. Hvis Supabase ikke er konfigureret
fungerer appen stadig — den henter bare direkte fra kilderne hver gang uden
caching.

## Miljøvariabler

| Variabel | Beskrivelse |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL til dit Supabase-projekt |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/publishable key fra Supabase |
| `EQUINET_BASE_URL` | Valgfri override (default `https://equinet.seges.dk`) |
| `FEI_BASE_URL` | Valgfri override (default `https://data.fei.org`) |

## Supabase setup

1. Opret et projekt på [supabase.com](https://supabase.com).
2. Kør `supabase/schema.sql` i SQL Editor — det opretter `horse_cache` og
   `search_log` med indeks og read-only RLS.
3. Kopiér URL + anon key til `.env.local`.

## API

| Endpoint | Beskrivelse |
| --- | --- |
| `GET /api/search?q=&type=` | Aggregeret søgning på tværs af kilder |
| `GET /api/sources/equinet?q=&type=` | Direkte søgning mod Equinet |
| `GET /api/sources/fei?q=` eller `?feiId=` | Direkte søgning mod FEI |
| `GET /api/horse/[id]` | Samlet hesteprofil (id-format: `<source>:<rawId>`) |
| `GET /api/verify/[id]` | Verifikationsrapport |

## Projektstruktur

```
app/
  page.tsx                   # forside med søgebar
  search/page.tsx            # søgeresultater
  horse/[id]/page.tsx        # hesteprofil
  api/
    search/route.ts
    sources/equinet/route.ts
    sources/fei/route.ts
    horse/[id]/route.ts
    verify/[id]/route.ts
components/
  SearchBar.tsx
  HorseResultCard.tsx
  VerificationLights.tsx
  SiteHeader.tsx
  ui/Card.tsx
  ui/Badge.tsx
lib/
  sources/equinet.ts         # Oracle APEX scraping
  sources/fei.ts             # FEI scraping
  aggregate.ts               # fletning på tværs af kilder
  verify.ts                  # verifikationslogik
  cache.ts                   # Supabase-caching
  supabase.ts
  types.ts
  utils.ts
supabase/
  schema.sql
```

## Equinet-noter

Equinet kører Oracle APEX. Vi:

1. Henter `f?p=1000:2` og udtrækker `p_instance`, `p_flow_id`,
   `p_flow_step_id`, `p_page_submission_id` plus cookies.
2. POSTer til `wwv_flow.show` med `P2_SOEGEKRITERIE` og `P2_SOEGETEKST`.
3. Parser den returnerede HTML-tabel.

**Vigtigt:** APEX-feltnavne kan variere mellem versioner. Verificér de
præcise navne med Chrome DevTools på <https://equinet.seges.dk/ords/prod/f?p=1000:2>
hvis scraperen pludselig giver tomme resultater.

Resultater caches i Supabase med 24 timers TTL for at undgå unødvendig
belastning af Equinet's server.

## Fase 2 (planlagt)

- UELN-integration (horseid.eu)
- WBFSH studbook-data (Hanoverian, KWPN, DWB, Oldenburg)
- Fuld konkurrencehistorik med visualisering
- Verifikationsrapport som PDF
- DRF-integration (afhænger af datafeed-aftale)
- Brugerkonti: gemte heste, ejerskifte- og pasudløb-alerts

## Licens & attribution

Data tilhører de respektive registre (Equinet/SEGES, FEI m.fl.) og leveres
under deres egne vilkår. Heste Stambog er et uafhængigt værktøj uden
tilknytning til de pågældende registre.
