import type {
  Medicine,
  MedicineGroupData,
  SubstitutionCategory,
} from "./types";

// =============================================================================
// API-klient til Lægemiddelstyrelsens medicinpriser API
// =============================================================================
//
// Base URL: https://api.medicinpriser.dk/v1
//
// API'et understøtter XML, JSON og JSONP. Vi bruger JSON via Accept-headeren.
// Responsen kan indeholde forskellige feltnavne afhængigt af endpoint og
// version (camelCase vs PascalCase, korte navne vs lange). Klienten her
// normaliserer ved at læse fra alle kendte feltnavne.
//
// ALLE kald sker server-side (Server Components / Route Handlers) — det
// undgår CORS i browseren og giver os ægte caching via Next.js fetch().
//
// Endpoints vi bruger:
//   GET /v1/produkter/sog/{søgetekst}        — fritekst-søgning på produktnavn
//   GET /v1/produkter/detaljer/{varenummer}  — detaljer for én pakning
//   GET /v1/atc/{atc-kode}                   — alle pakninger med en ATC
//   GET /v1/sortiment/atc/{atc-kode}         — fallback for samme
//
// Hvis API'et returnerer en fejl eller et uventet format falder vi blødt
// tilbage og returnerer en tom liste — UI'et viser så et venligt budskab.
// =============================================================================

const DEFAULT_BASE = "https://api.medicinpriser.dk/v1";
const DEFAULT_CACHE_SECONDS = 3600;
const SEARCH_PATHS = ["produkter/sog", "produkt/sog", "sog"];
const DETAIL_PATHS = ["produkter/detaljer", "produkt/detaljer", "detaljer"];
const ATC_PATHS = ["atc", "sortiment/atc", "produkter/atc"];

function getBase() {
  return (process.env.MEDICINPRISER_API_BASE ?? DEFAULT_BASE).replace(/\/+$/, "");
}

function getCacheSeconds() {
  const raw = process.env.MEDICINPRISER_CACHE_SECONDS;
  if (!raw) return DEFAULT_CACHE_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_CACHE_SECONDS;
}

const DEBUG = process.env.MEDICINPRISER_DEBUG === "1";

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
  // Nogle gange returneres JSON med text/plain — så vi parser manuelt.
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

/**
 * Prøv flere endpoint-stier i rækkefølge. Returnér første der svarer
 * med 2xx + ikke-tom JSON. Vi gør dette fordi det offentlige API'ets
 * præcise stier kan variere lidt mellem versioner.
 */
async function tryPaths(paths: string[], suffix: string): Promise<unknown> {
  const base = getBase();
  let lastErr: unknown = null;
  for (const p of paths) {
    const url = `${base}/${p}/${suffix}?format=json`;
    try {
      const data = await fetchJson(url);
      if (data !== null && data !== undefined) {
        // Hvis det er en tom liste, prøv næste sti — det kan være et
        // 200 OK uden faktiske resultater fra en sti der teknisk findes.
        if (Array.isArray(data) && data.length === 0) {
          if (DEBUG) console.log(`[medicinpriser]    tom liste, prøver næste sti`);
          continue;
        }
        return data;
      }
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr) throw lastErr;
  return null;
}

// -----------------------------------------------------------------------------
// Normalisering — accepterer mange feltnavne, vælger første ikke-tomme
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

function pickAbc(obj: RawObject): SubstitutionCategory {
  const raw = pickString(
    obj,
    "abc",
    "ABC",
    "priskategori",
    "Priskategori",
    "substitutionPriskategori",
  );
  if (!raw) return null;
  const upper = raw.toUpperCase().trim();
  if (upper === "A" || upper === "B" || upper === "C") return upper;
  return null;
}

function pickIndlaegsseddel(obj: RawObject): string | null {
  return pickString(
    obj,
    "indlaegsseddel",
    "indlaegsseddelUrl",
    "indlaegsseddelLink",
    "leafletUrl",
    "indlaegssedlerUrl",
  );
}

function looksOriginal(obj: RawObject, navn: string | null): boolean {
  // Heuristik: hvis API'et eksplicit markerer original, brug det.
  // Ellers gætter vi: original har typisk handelsnavn der ikke
  // matcher indholdsstoffet 1:1, og generiske kopier nævner ofte
  // producenten i navnet ("Paracetamol Orifarm").
  if (pickBool(obj, "erOriginal", "original", "isOriginal")) return true;
  const indhold = pickString(obj, "indholdsstof", "virksomtStof", "atcTekst");
  if (!navn || !indhold) return false;
  const navnL = navn.toLowerCase();
  const indholdL = indhold.toLowerCase();
  // Hvis navnet starter med indholdsstoffet — det er typisk en generisk
  return !navnL.startsWith(indholdL.split(" ")[0] ?? "");
}

function normalizeMedicine(raw: unknown): Medicine | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as RawObject;

  const varenummer = pickString(o, "varenummer", "vnr", "Varenummer", "VareNummer");
  if (!varenummer) return null;

  const navn = pickString(o, "navn", "produktnavn", "lmNavn", "name", "Navn");
  if (!navn) return null;

  const styrke = pickString(o, "styrke", "Styrke", "strength");
  const form = pickString(o, "form", "lmForm", "laegemiddelform", "dispenseringsform");
  const pakning = pickString(
    o,
    "pakning",
    "pakningsstoerrelse",
    "pakningsstr",
    "Pakning",
    "packageSize",
  );
  const indhold = pickString(o, "indholdsstof", "virksomtStof", "atcTekst", "activeSubstance");
  const firma = pickString(o, "firma", "firmanavn", "indehaver", "Firma", "company");

  const pris = pickNumber(o, "forbrugerpris", "aup", "kundepris", "pris", "price", "ConsumerPrice");
  const prisPrEnhed = pickNumber(
    o,
    "prisPrEnhed",
    "enhedspris",
    "ddPris",
    "ConsumerPricePerUnit",
  );
  const prisMedTilskud = pickNumber(
    o,
    "prisMedTilskud",
    "tilskudspris",
    "patientpris",
    "patientPrice",
  );

  return {
    varenummer,
    navn,
    firma,
    atc: pickString(o, "atc", "atcKode", "ATC"),
    indholdsstof: indhold,
    styrke,
    form,
    pakning,
    prisKr: pris,
    prisPrEnhedKr: prisPrEnhed,
    substitutionsgruppe: pickString(
      o,
      "substitutionsgruppe",
      "substitutionsGruppeId",
      "sgId",
      "substitutionGroup",
    ),
    abc: pickAbc(o),
    tilskud: pickBool(o, "tilskud", "harTilskud", "subsidy"),
    prisMedTilskudKr: prisMedTilskud,
    erOriginal: looksOriginal(o, navn),
    recept: pickBool(o, "recept", "receptpligtig", "prescription"),
    indlaegsseddelUrl: pickIndlaegsseddel(o),
  };
}

/**
 * API'er svinger mellem `[ {...} ]`, `{ produkter: [ {...} ] }`,
 * `{ data: [...] }` osv. Denne fundtion finder den faktiske liste.
 */
function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const o = raw as RawObject;
    for (const key of [
      "produkter",
      "data",
      "items",
      "results",
      "hits",
      "pakninger",
      "Produkter",
    ]) {
      const v = o[key];
      if (Array.isArray(v)) return v;
    }
    // Hvis det er et enkelt objekt med varenummer — pak det som single-list
    if ("varenummer" in o || "Varenummer" in o || "vnr" in o) return [o];
  }
  return [];
}

function unwrapSingle(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw[0] ?? null;
  if (raw && typeof raw === "object") {
    const o = raw as RawObject;
    for (const key of ["produkt", "data", "result", "Produkt"]) {
      const v = o[key];
      if (v && typeof v === "object") return v;
    }
  }
  return raw;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/** Søg medicin via fritekst — typisk produktnavn eller indholdsstof. */
export async function searchMedicine(query: string): Promise<Medicine[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const raw = await tryPaths(SEARCH_PATHS, encodeURIComponent(q));
    return unwrapList(raw)
      .map(normalizeMedicine)
      .filter((m): m is Medicine => m !== null);
  } catch (err) {
    console.warn("[medicinhjaelper] søgefejl:", err);
    return [];
  }
}

/** Hent detaljer for én pakning ved varenummer. */
export async function getMedicine(varenummer: string): Promise<Medicine | null> {
  const vnr = varenummer.trim();
  if (!/^\d{4,8}$/.test(vnr)) return null;
  try {
    const raw = await tryPaths(DETAIL_PATHS, vnr);
    return normalizeMedicine(unwrapSingle(raw));
  } catch (err) {
    console.warn("[medicinhjaelper] detalje-fejl:", err);
    return null;
  }
}

/** Hent alle pakninger der deler en ATC-kode (samme indholdsstof + styrke). */
export async function getByAtc(atc: string): Promise<Medicine[]> {
  const code = atc.trim().toUpperCase();
  if (code.length < 3) return [];
  try {
    const raw = await tryPaths(ATC_PATHS, encodeURIComponent(code));
    return unwrapList(raw)
      .map(normalizeMedicine)
      .filter((m): m is Medicine => m !== null);
  } catch (err) {
    console.warn("[medicinhjaelper] ATC-fejl:", err);
    return [];
  }
}

// -----------------------------------------------------------------------------
// Gruppering — samler ækvivalente pakninger så brugeren kan se alternativer
// -----------------------------------------------------------------------------

function groupKey(m: Medicine): string {
  // Foretrukken nøgle er substitutionsgruppen — den er API'ets eget bud
  // på "disse er ækvivalente". Hvis den ikke findes falder vi tilbage til
  // ATC + styrke + form + pakning.
  if (m.substitutionsgruppe) return `sg:${m.substitutionsgruppe}`;
  return `atc:${m.atc ?? "?"}|${m.styrke ?? "?"}|${m.form ?? "?"}|${m.pakning ?? "?"}`;
}

function groupHeadline(sample: Medicine): string {
  const parts: string[] = [];
  if (sample.indholdsstof) parts.push(sample.indholdsstof);
  if (sample.styrke) parts.push(sample.styrke);
  if (sample.form) parts.push(sample.form);
  if (sample.pakning) parts.push(`(${sample.pakning})`);
  return parts.length > 0 ? parts.join(" ") : sample.navn;
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

  // Sortér grupper med størst besparelse øverst — det er den værdi vi tilbyder
  groups.sort((a, b) => b.maxBesparelseKr - a.maxBesparelseKr);
  return groups;
}

// -----------------------------------------------------------------------------
// Forklaringstekster — bruges af UI-komponenter
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
