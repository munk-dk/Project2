import type {
  Medicine,
  MedicineGroupData,
  SubstitutionCategory,
} from "./types";

// =============================================================================
// API-klient til Lægemiddelstyrelsens medicinpriser API
// =============================================================================
//
// Base: https://api.medicinpriser.dk/v1
//
// Bekræftet endpoint:
//   GET /v1/produkter/detaljer/{varenummer}?format=json
//     Returnerer ét produkt med Substitutioner-array (alternativer i samme
//     substitutionsgruppe, dog uden priser — dem henter vi separat).
//
// Søge-endpoint: I skrivende stund ikke bekræftet. Klienten prøver flere
// kandidater i rækkefølge. Hvis ingen virker, kan vi falde tilbage til
// kun at acceptere 6-cifrede varenumre som søgning.
//
// API-feltnavne er PascalCase (Navn, Varenummer, PrisPrPakning, AtcKode,
// VirksomtStof, Firma, Pakning, Styrke, Substitutioner, TilskudKode, …).
// =============================================================================

const DEFAULT_BASE = "https://api.medicinpriser.dk/v1";
const DEFAULT_CACHE_SECONDS = 3600;
// Bekræftet via debug-logning: API'ets søgning ligger på /v1/produkter/{tekst}
// (prefix-match med stort begyndelsesbogstav). De andre kandidater giver 404
// eller 500. Vi prøver dem alligevel som fallback hvis API'et ændrer sig.
const SEARCH_PATHS = [
  "produkter",
  "produkter/sog",
  "produkter/soeg",
];

const DEBUG = process.env.MEDICINPRISER_DEBUG === "1";

function getBase() {
  return (process.env.MEDICINPRISER_API_BASE ?? DEFAULT_BASE).replace(/\/+$/, "");
}

function getCacheSeconds() {
  const raw = process.env.MEDICINPRISER_CACHE_SECONDS;
  if (!raw) return DEFAULT_CACHE_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_CACHE_SECONDS;
}

async function fetchJson(url: string): Promise<unknown> {
  if (DEBUG) console.log(`[medicinpriser] GET ${url}`);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Medicinhjaelper/0.1 (+https://github.com)",
      },
      next: { revalidate: getCacheSeconds() },
    });
  } catch (err) {
    if (DEBUG) console.log(`[medicinpriser] netværksfejl: ${String(err)}`);
    throw err;
  }
  if (DEBUG) console.log(`[medicinpriser] -> ${res.status} ${res.statusText}`);
  if (!res.ok) {
    throw new Error(`API fejl ${res.status} for ${url}`);
  }
  const text = await res.text();
  if (DEBUG) {
    const preview = text.slice(0, 200).replace(/\s+/g, " ");
    console.log(`[medicinpriser]    body[${text.length}]: ${preview}`);
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    if (DEBUG) console.log(`[medicinpriser] JSON-parse fejl: ${String(err)}`);
    return null;
  }
}

// -----------------------------------------------------------------------------
// Normalisering — accepterer både PascalCase (rigtige API) og camelCase fallback
// -----------------------------------------------------------------------------

type RawObject = Record<string, unknown>;

function pickString(obj: RawObject, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function pickNumber(obj: RawObject, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const cleaned = v.replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
      if (cleaned.length === 0) continue;
      const parsed = Number.parseFloat(cleaned);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickBool(obj: RawObject, ...keys: string[]): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.toLowerCase().trim();
      if (s === "ja" || s === "true" || s === "1" || s === "yes") return true;
      if (s === "nej" || s === "false" || s === "0" || s === "no") return false;
    }
    if (typeof v === "number") return v !== 0;
  }
  return false;
}

/** Heuristik: hvis navnet starter med indholdsstoffet, er det generisk. */
function looksGeneric(navn: string, indhold: string | null): boolean {
  if (!indhold) return false;
  const indholdL = indhold.toLowerCase().split(/\s|"/)[0] ?? "";
  if (!indholdL) return false;
  return navn.toLowerCase().includes(indholdL);
}

function pickSubstitutionsVarenumre(obj: RawObject): string[] {
  const subs = obj["Substitutioner"] ?? obj["substitutioner"];
  if (!Array.isArray(subs)) return [];
  const out: string[] = [];
  for (const s of subs) {
    if (s && typeof s === "object") {
      const vnr = pickString(s as RawObject, "Varenummer", "varenummer", "vnr");
      if (vnr) out.push(vnr);
    }
  }
  return out;
}

function normalizeMedicine(raw: unknown): Medicine | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as RawObject;

  // PascalCase first, camelCase as fallback
  const varenummer = pickString(o, "Varenummer", "varenummer", "vnr");
  if (!varenummer) return null;

  const navn = pickString(o, "Navn", "navn", "produktnavn");
  if (!navn) return null;

  const indhold = pickString(o, "VirksomtStof", "indholdsstof", "atcTekst");
  const tilskudKode = pickString(o, "TilskudKode", "tilskudKode");
  const tilskudTekst = pickString(o, "TilskudTekst", "tilskudTekst");

  // Tilskud findes hvis TilskudKode er sat og ikke "0"/"intet"
  let harTilskud = false;
  if (tilskudKode) {
    const k = tilskudKode.toUpperCase();
    harTilskud = k !== "" && k !== "0" && k !== "INTET";
  } else {
    harTilskud = pickBool(o, "tilskud", "harTilskud");
  }

  // TilskudBeregnesAf er det grundlag CTR beregnes af — det er den effektive
  // pris for tilskudsberegning, ikke det brugeren betaler. Vi viser den dog
  // som "den pris dit tilskud beregnes ud fra" når den findes.
  const prisMedTilskud = pickNumber(
    o,
    "TilskudBeregnesAf",
    "tilskudBeregnesAf",
    "prisMedTilskud",
    "tilskudspris",
  );

  // Håndkøb -> ikke recept. Hvis ingen markering: gæt ud fra navn.
  const haandkoeb = pickBool(o, "Haandkoeb", "haandkoeb", "handkoeb");

  return {
    varenummer,
    navn,
    firma: pickString(o, "Firma", "firma", "firmanavn", "indehaver"),
    atc: pickString(o, "AtcKode", "atc", "atcKode"),
    indholdsstof: indhold,
    styrke: pickString(o, "Styrke", "styrke"),
    form: pickString(o, "form", "lmForm", "laegemiddelform"),
    pakning: pickString(o, "Pakning", "pakning", "pakningsstoerrelse"),
    prisKr: pickNumber(
      o,
      "PrisPrPakning",
      "forbrugerpris",
      "kundepris",
      "pris",
    ),
    prisPrEnhedKr: pickNumber(o, "PrisPrEnhed", "prisPrEnhed", "enhedspris"),
    substitutionsgruppe: pickString(
      o,
      "Substitutionsgruppe",
      "substitutionsgruppe",
      "substitutionsGruppeId",
    ),
    abc: null, // beregnes af groupMedicines — ikke leveret af API'et
    tilskud: harTilskud,
    prisMedTilskudKr: prisMedTilskud,
    erOriginal: !looksGeneric(navn, indhold),
    recept: !haandkoeb,
    indlaegsseddelUrl: pickString(
      o,
      "IndlaegssedlerUrl",
      "indlaegsseddelUrl",
      "indlaegsseddel",
    ),
    tilskudKode,
    tilskudTekst,
    indikation: pickString(o, "Indikation", "indikation"),
    dosering: pickString(o, "Dosering", "dosering"),
    trafikAdvarsel: pickBool(o, "TrafikAdvarsel", "trafikAdvarsel"),
    udgaaet: pickBool(o, "Udgaaet", "udgaaet"),
    substitutionsVarenumre: pickSubstitutionsVarenumre(o),
  };
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const o = raw as RawObject;
    for (const key of [
      "Produkter",
      "produkter",
      "Pakninger",
      "pakninger",
      "data",
      "items",
      "results",
      "hits",
    ]) {
      const v = o[key];
      if (Array.isArray(v)) return v;
    }
    if ("Varenummer" in o || "varenummer" in o || "vnr" in o) return [o];
  }
  return [];
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/** Hent detaljer for én pakning ved varenummer. */
export async function getMedicine(varenummer: string): Promise<Medicine | null> {
  const vnr = varenummer.trim();
  if (!/^\d{4,8}$/.test(vnr)) return null;
  const url = `${getBase()}/produkter/detaljer/${vnr}?format=json`;
  try {
    const raw = await fetchJson(url);
    return normalizeMedicine(raw);
  } catch (err) {
    if (DEBUG) console.warn("[medicinhjaelper] detalje-fejl:", err);
    return null;
  }
}

/**
 * Hent flere produkter samtidigt. Kald sker parallelt og resultater
 * der ikke kunne hentes filtreres væk.
 */
export async function getMedicines(varenumre: string[]): Promise<Medicine[]> {
  if (varenumre.length === 0) return [];
  const results = await Promise.all(varenumre.map((v) => getMedicine(v)));
  return results.filter((m): m is Medicine => m !== null);
}

/**
 * Hent et produkt og alle dets substitutioner (med priser) på én gang.
 * Brugbar til detaljesiden hvor vi viser alternativer side om side.
 */
export async function getMedicineWithAlternatives(
  varenummer: string,
): Promise<{ main: Medicine | null; alternatives: Medicine[] }> {
  const main = await getMedicine(varenummer);
  if (!main) return { main: null, alternatives: [] };
  const alternatives = await getMedicines(main.substitutionsVarenumre);
  return { main, alternatives };
}

/**
 * Genvej: hvis input er et 6-cifret varenummer, hop direkte i detalje.
 */
function isVarenummer(s: string): boolean {
  return /^\d{6}$/.test(s);
}

/** Capitalisér første bogstav — API'ets søgning ser ud til at være case-sensitiv. */
function titleCase(s: string): string {
  if (s.length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** Generér søgevarianter at prøve i rækkefølge. */
function searchVariants(q: string): string[] {
  const variants = new Set<string>();
  variants.add(titleCase(q));
  variants.add(q);
  variants.add(q.toLowerCase());
  // Forkortelse — fx "Pano" matcher Panodil hvis API'et bruger prefix
  if (q.length > 3) variants.add(titleCase(q).slice(0, 4));
  return Array.from(variants);
}

/**
 * Søg medicin via fritekst. API'ets søgning ligger på
 * `/v1/produkter/sog/{tekst}` og ser ud til at være prefix-match med
 * stort begyndelsesbogstav, så vi prøver flere case-varianter.
 */
export async function searchMedicine(query: string): Promise<Medicine[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Genvej: 6-cifret varenummer → direkte detalje + alternativer
  if (isVarenummer(q)) {
    const { main, alternatives } = await getMedicineWithAlternatives(q);
    return main ? [main, ...alternatives] : [];
  }

  // ATC-kode: fx "N02BE01" — slå hele ATC-gruppen op (best effort)
  if (/^[A-Z]\d{2}[A-Z]{1,2}\d{0,2}$/i.test(q)) {
    // Vi har ikke et bekræftet ATC-endpoint; spring den over for nu.
  }

  const base = getBase();
  let lastErr: unknown = null;

  for (const path of SEARCH_PATHS) {
    for (const variant of searchVariants(q)) {
      const url = `${base}/${path}/${encodeURIComponent(variant)}?format=json`;
      try {
        const raw = await fetchJson(url);
        const list = unwrapList(raw)
          .map(normalizeMedicine)
          .filter((m): m is Medicine => m !== null);
        if (list.length > 0) {
          return await enrichSearchHits(list);
        }
      } catch (err) {
        lastErr = err;
      }
    }
  }

  if (DEBUG && lastErr) console.warn("[medicinhjaelper] søgefejl:", lastErr);
  return [];
}

/**
 * Søgeresponset er minimalt — kun Navn, Varenummer, Firma, Styrke, Pakning.
 * Pris, ATC, indholdsstof og tilskud får vi kun via detaljer-endpointet.
 * Vi henter derfor fuld detalje for hver hit. Hits der fejler beholder vi
 * fra søgeresponset (uden pris) så brugeren ihvertfald ser navnet.
 */
async function enrichSearchHits(hits: Medicine[]): Promise<Medicine[]> {
  const MAX_HITS = 25;
  const CONCURRENCY = 5;
  const limited = hits.slice(0, MAX_HITS);

  if (DEBUG) {
    console.log(
      `[medicinpriser] enrichSearchHits: ${limited.length} hits at berige`,
    );
  }

  // 1) Hent fulde detaljer for hver søgehit i batches
  const enriched: Medicine[] = [];
  for (let i = 0; i < limited.length; i += CONCURRENCY) {
    const batch = limited.slice(i, i + CONCURRENCY);
    const fulls = await Promise.all(
      batch.map(async (h) => {
        const full = await getMedicine(h.varenummer);
        // Hvis detail fejler, fald tilbage til den minimale søge-version
        return full ?? h;
      }),
    );
    enriched.push(...fulls);
  }

  if (DEBUG) {
    const medPris = enriched.filter((m) => m.prisKr !== null).length;
    console.log(
      `[medicinpriser] enrichSearchHits: ${enriched.length} berigede, ${medPris} med pris`,
    );
  }

  // 2) Saml unikke substitutioner fra de øverste hits og hent dem også
  const seen = new Set(enriched.map((m) => m.varenummer));
  const extraVnrs: string[] = [];
  for (const m of enriched.slice(0, 10)) {
    for (const vnr of m.substitutionsVarenumre) {
      if (!seen.has(vnr)) {
        seen.add(vnr);
        extraVnrs.push(vnr);
      }
    }
  }

  const MAX_EXTRA = 20;
  const extraEnriched: Medicine[] = [];
  const extraSlice = extraVnrs.slice(0, MAX_EXTRA);
  for (let i = 0; i < extraSlice.length; i += CONCURRENCY) {
    const batch = extraSlice.slice(i, i + CONCURRENCY);
    const fulls = await Promise.all(batch.map((v) => getMedicine(v)));
    for (const f of fulls) if (f) extraEnriched.push(f);
  }

  if (DEBUG) {
    console.log(
      `[medicinpriser] enrichSearchHits: ${extraEnriched.length} ekstra fra substitutioner`,
    );
  }

  return [...enriched, ...extraEnriched];
}

// -----------------------------------------------------------------------------
// Gruppering — samler ækvivalente pakninger og beregner A/B/C selv
// -----------------------------------------------------------------------------

/**
 * Udled form fra Pakning-strengen — fx "100 stk. (dåse) filmovertrukne tabl."
 * → "tabletter". Bruges til gruppering så fx brusetabletter ikke ender i
 * samme gruppe som almindelige tabletter selv om de har samme indholdsstof
 * og styrke. Returnerer en standardiseret form-betegnelse.
 */
export function udledForm(pakning: string | null): string | null {
  if (!pakning) return null;
  const p = pakning.toLowerCase();
  // Rækkefølgen er vigtig — mere specifikke matches først.
  if (p.includes("brusetab")) return "brusetabletter";
  if (p.includes("suppositori")) return "stikpiller";
  if (p.includes("oral susp")) return "mikstur";
  if (p.includes("oral opl") || p.includes("oral.opl")) return "mikstur";
  if (p.includes("pul.t.oral") || p.includes("pulver til oral")) return "pulver";
  if (p.includes("inj.væske") || p.includes("inj væske") || p.includes("injektion"))
    return "injektion";
  if (p.includes("kapsler") || p.includes("kaps.")) return "kapsler";
  if (p.includes("filmovertrukne") || p.includes("tabl.") || p.includes("tabletter"))
    return "tabletter";
  if (p.includes("creme") || p.includes("salve")) return "creme/salve";
  if (p.includes("dråber")) return "dråber";
  return null;
}

function groupKey(m: Medicine): string {
  if (m.substitutionsgruppe) return `sg:${m.substitutionsgruppe}`;
  // Gruppér ækvivalente pakninger: samme ATC + samme styrke + samme
  // formulering (tablet, brus, mikstur, …). Pakningsstørrelse blandes
  // ikke ind — pris-pr-stk gør sammenligningen retfærdig på tværs.
  const form = udledForm(m.pakning);
  return `atc:${m.atc ?? "?"}|${m.styrke ?? "?"}|${form ?? "?"}`;
}

function groupHeadline(sample: Medicine): string {
  const parts: string[] = [];
  if (sample.indholdsstof) parts.push(sample.indholdsstof);
  if (sample.styrke) parts.push(sample.styrke);
  const form = udledForm(sample.pakning);
  if (form) parts.push(form);
  return parts.length > 0 ? parts.join(" ") : sample.navn;
}

/**
 * Beregn A/B/C på baggrund af pris-pr-stk i gruppen:
 *   A = inden for 0,50 kr af billigste (eller billigste nøjagtigt)
 *   B = inden for 5 kr af billigste pr pakning
 *   C = mere end 5 kr dyrere
 */
function computeAbc(
  m: Medicine,
  billigsteKr: number | null,
): SubstitutionCategory {
  if (m.prisKr === null || billigsteKr === null) return null;
  const diff = m.prisKr - billigsteKr;
  if (diff <= 0.5) return "A";
  if (diff <= 5) return "B";
  return "C";
}

export function groupMedicines(list: Medicine[]): MedicineGroupData[] {
  const buckets = new Map<string, Medicine[]>();
  for (const m of list) {
    const key = groupKey(m);
    const arr = buckets.get(key) ?? [];
    arr.push(m);
    buckets.set(key, arr);
  }

  const groups: MedicineGroupData[] = [];
  for (const [key, items] of buckets) {
    const sorted = [...items].sort((a, b) => {
      const pa = a.prisKr ?? Number.POSITIVE_INFINITY;
      const pb = b.prisKr ?? Number.POSITIVE_INFINITY;
      return pa - pb;
    });

    const billigste = sorted.find((m) => m.prisKr !== null) ?? null;
    const dyreste =
      [...sorted].reverse().find((m) => m.prisKr !== null) ?? null;
    const original = sorted.find((m) => m.erOriginal) ?? null;

    // Sæt A/B/C på alle elementer baseret på billigste i denne gruppe
    const billigsteKr = billigste?.prisKr ?? null;
    for (const m of sorted) {
      m.abc = computeAbc(m, billigsteKr);
    }

    const alternativer = sorted.filter((m) => m !== original);

    let maxBesparelse = 0;
    if (billigste?.prisKr != null && dyreste?.prisKr != null) {
      maxBesparelse = Math.max(0, dyreste.prisKr - billigste.prisKr);
    }

    let besparelseProcent: number | null = null;
    if (
      original?.prisKr != null &&
      billigste?.prisKr != null &&
      original.prisKr > 0 &&
      billigste !== original
    ) {
      besparelseProcent =
        ((original.prisKr - billigste.prisKr) / original.prisKr) * 100;
    }

    groups.push({
      key,
      overskrift: groupHeadline(sorted[0]!),
      atc: sorted[0]?.atc ?? null,
      original,
      alternativer,
      billigste,
      dyreste,
      maxBesparelseKr: maxBesparelse,
      besparelseProcent,
    });
  }

  groups.sort((a, b) => b.maxBesparelseKr - a.maxBesparelseKr);
  return groups;
}

// -----------------------------------------------------------------------------
// Forklaringstekster
// -----------------------------------------------------------------------------

export function abcForklaring(abc: SubstitutionCategory): {
  kort: string;
  lang: string;
} {
  switch (abc) {
    case "A":
      return {
        kort: "Billigst",
        lang:
          "Apoteket skal som udgangspunkt tilbyde dig dette præparat — det er det billigste i gruppen.",
      };
    case "B":
      return {
        kort: "Tæt på billigst",
        lang:
          "Inden for 5 kr af den billigste. Apoteket må gerne udlevere denne uden ekstra besked.",
      };
    case "C":
      return {
        kort: "Dyrere",
        lang:
          "Mere end 5 kr dyrere end den billigste. Du kan bede apoteket om at skifte til billigste alternativ.",
      };
    default:
      return {
        kort: "Ingen kategori",
        lang:
          "Pakningen indgår ikke i en substitutionsgruppe. Der er enten ingen direkte alternativer, eller præparatet er originalen alene på markedet.",
      };
  }
}

export function tilskudForklaring(kode: string | null): string {
  if (!kode) return "Ingen tilskud";
  const k = kode.toUpperCase();
  switch (k) {
    case "A":
      return "Generelt tilskud — alle får automatisk tilskud via CTR";
    case "B":
    case "BEGR":
      return "Begrænset tilskud — gælder kun visse aldersgrupper eller forhold";
    case "C":
    case "KLAUS":
      return "Klausuleret tilskud — kun ved bestemte sygdomme, lægen skal markere recepten";
    default:
      return `Tilskudskode ${kode}`;
  }
}
