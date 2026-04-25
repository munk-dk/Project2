# Medicinhjælper

Find det billigste alternativ til din medicin — forklaret i klart dansk.

Medicinpriser er ens på alle apoteker i Danmark. Værdien ligger i at finde
det billigste præparat med samme virkning og forstå hvad du faktisk betaler
efter tilskud. Det er det Medicinhjælper hjælper dig med.

## Stack

- **Next.js 14** (App Router, React Server Components)
- **TypeScript** i strict-mode
- **Tailwind CSS** til styling
- **Vercel** som deploy-target
- **Ingen API-nøgle påkrævet** — al data kommer fra det offentlige API

## Datakilde

Alt data kommer fra [Lægemiddelstyrelsens medicinpriser](https://medicinpriser.dk).
API'et ligger på `https://api.medicinpriser.dk/v1` og er frit tilgængeligt.

Endpoints vi bruger (alle via JSON, server-side):

| Endpoint | Brug |
| --- | --- |
| `GET /v1/produkter/sog/{tekst}` | Fritekstsøgning på navn / indholdsstof |
| `GET /v1/produkter/detaljer/{varenummer}` | Detaljer for én pakning |
| `GET /v1/atc/{atc-kode}` | Alle pakninger med en ATC-kode (bruges til at finde alternativer) |

Klienten i `lib/medicine.ts` er defensiv: den prøver flere stier og accepterer
flere mulige feltnavne i responsen, så små variationer i API'et ikke knækker
appen. Alle kald sker server-side med Next.js' indbyggede fetch-cache (TTL 1
time som default — priserne opdateres alligevel kun hver 14. dag).

## Kør lokalt

```bash
cd medicinhjaelper
npm install
cp .env.example .env.local   # valgfrit — defaults virker
npm run dev
```

Appen kører på <http://localhost:3000>.

### Test-søgninger

Prøv disse for at verificere at API-integrationen virker:

- **Panodil** — håndkøbsmedicin, paracetamol, mange generiske alternativer
- **Ibuprofen** — masser af pakninger, god test for grupperingen
- **Simvastatin** — receptpligtigt, tilskudsberettiget, klassisk substitutionscase

## Miljøvariabler

Alt er valgfrit — appen virker uden `.env.local`.

| Variabel | Default | Beskrivelse |
| --- | --- | --- |
| `MEDICINPRISER_API_BASE` | `https://api.medicinpriser.dk/v1` | Base-URL til API'et. Kan pege på en proxy eller mock. |
| `MEDICINPRISER_CACHE_SECONDS` | `3600` | Hvor længe Next.js skal cache API-svar. |

## Projektstruktur

```
medicinhjaelper/
  app/
    page.tsx                       # forside med søgefelt
    søg/page.tsx                   # søgeresultater (gruppér på indholdsstof)
    medicin/[varenummer]/page.tsx  # detaljevisning + alternativer
    layout.tsx
    globals.css
  components/
    SearchBar.tsx                  # stort søgefelt
    MedicineGroup.tsx              # gruppé af original + generiske
    MedicineCard.tsx               # ét præparat
    SavingsHighlight.tsx           # "Du kan spare X kr"
    SubsidyExplainer.tsx           # tilskud forklaret
    ABCBadge.tsx                   # A/B/C-mærkning
    SiteHeader.tsx                 # header + footer
  lib/
    medicine.ts                    # typed API-klient + gruppering
    types.ts                       # domænetyper
    utils.ts                       # cn() + formatKr()
```

## Sprog og tone

Vi skriver alt UI-tekst i klart, venligt dansk. Vi undgår fagsprog som
*AIP*, *AUP*, *DDD*, *substitution*, *ekspeditionsgebyr*. I stedet:
"din pris", "samme virkning", "billigste alternativ", "hvad du betaler".

Målgruppen er bred — ældre, forældre, kronisk syge — så fontstørrelser er
sat lidt større end Tailwind-default, og kontrasten er høj.

## A/B/C-mærkning forklaret

Lægemiddelstyrelsen mærker pakninger inden for samme substitutionsgruppe:

- **A** — billigste pakning. Apoteket skal som udgangspunkt tilbyde dig denne.
- **B** — inden for 5 kr af A. Apoteket må udlevere uden ekstra besked.
- **C** — mere end 5 kr dyrere. Bed apoteket skifte til den billigste.

Brugeren ser disse forklaringer overalt hvor mærket vises (via `ABCBadge`-
komponenten og `ABCExplainer`).

## Deploy til Vercel

1. Push repo'et til GitHub.
2. Importér det i Vercel og peg på `medicinhjaelper/` som root directory.
3. (Valgfrit) sæt `MEDICINPRISER_API_BASE` og `MEDICINPRISER_CACHE_SECONDS`.
4. Deploy. `vercel.json` sætter regionen til Stockholm (`arn1`) for lavere
   latency mod det danske API.

Build-kommandoen er `next build` — Vercel detekterer det automatisk.

## Disclaimer

Medicinhjælper giver ikke medicinsk rådgivning. Vi viser priser og
alternativer som de står i Lægemiddelstyrelsens database. Snak altid med din
læge eller dit apotek før du skifter præparat.

Data © Lægemiddelstyrelsen, leveret under åbne licensbetingelser.
Medicinhjælper er et uafhængigt værktøj uden tilknytning til
Lægemiddelstyrelsen.
