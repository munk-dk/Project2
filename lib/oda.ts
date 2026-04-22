// Typed wrapper omkring Folketingets ODA API.
// Dokumentation: https://oda.ft.dk/Help
//
// API'et er en OData v3 tjeneste. Alle requests laves over HTTP GET og
// svar leveres som JSON med en `value`-array og evt. `odata.nextLink`.

import type {
  OdaActor,
  OdaCase,
  OdaVote,
  OdaVoting,
  VoteStats,
} from "./types";

// Hjælpefunktion: ODA linker Afstemning → Sagstrin → Sag, ikke direkte.
// Brug denne i UI til at få fat i sagen uanset niveau.
export function getVotingCase(voting: OdaVoting): OdaCase | null {
  return voting.Sagstrin?.Sag ?? voting.Sag ?? null;
}

const BASE_URL = process.env.NEXT_PUBLIC_ODA_BASE_URL ?? "https://oda.ft.dk/api";

interface OdaListResponse<T> {
  "odata.metadata"?: string;
  "odata.nextLink"?: string;
  value: T[];
}

interface FetchOptions {
  filter?: string;
  expand?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  inlinecount?: boolean;
  select?: string;
  revalidate?: number;
}

function buildUrl(entity: string, options: FetchOptions = {}): string {
  const params = new URLSearchParams();
  if (options.filter) params.set("$filter", options.filter);
  if (options.expand) params.set("$expand", options.expand);
  if (options.orderby) params.set("$orderby", options.orderby);
  if (options.top != null) params.set("$top", String(options.top));
  if (options.skip != null) params.set("$skip", String(options.skip));
  if (options.select) params.set("$select", options.select);
  if (options.inlinecount) params.set("$inlinecount", "allpages");
  const qs = params.toString();
  return `${BASE_URL}/${entity}${qs ? `?${qs}` : ""}`;
}

async function odaFetch<T>(
  entity: string,
  options: FetchOptions = {},
): Promise<OdaListResponse<T>> {
  const url = buildUrl(entity, options);
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: options.revalidate ?? 3600 },
  });
  if (!res.ok) {
    throw new Error(`ODA request failed (${res.status}): ${url}`);
  }
  return (await res.json()) as OdaListResponse<T>;
}

async function odaFetchOne<T>(
  entity: string,
  id: number | string,
  options: FetchOptions = {},
): Promise<T | null> {
  const params = new URLSearchParams();
  if (options.expand) params.set("$expand", options.expand);
  if (options.select) params.set("$select", options.select);
  const qs = params.toString();
  const url = `${BASE_URL}/${entity}(${id})${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: options.revalidate ?? 3600 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`ODA request failed (${res.status}): ${url}`);
  return (await res.json()) as T;
}

// Hent alle medlemmer af Folketinget (typeid=5 = person/politiker).
// Vi filtrerer på at slutdato er null for at finde nuværende medlemmer.
export async function fetchCurrentMembers(top = 200): Promise<OdaActor[]> {
  const data = await odaFetch<OdaActor>("Aktør", {
    filter: "typeid eq 5 and slutdato eq null",
    orderby: "efternavn asc",
    top,
  });
  return data.value;
}

export async function fetchActor(id: number | string): Promise<OdaActor | null> {
  return odaFetchOne<OdaActor>("Aktør", id);
}

export async function searchActors(query: string, top = 20): Promise<OdaActor[]> {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/'/g, "''"))
    .filter((t) => t.length > 1);
  if (tokens.length === 0) return [];

  // Case-insensitive match via tolower(). Alle tokens skal findes i navn.
  const nameFilter = tokens
    .map((t) => `substringof('${t}',tolower(navn))`)
    .join(" and ");

  const data = await odaFetch<OdaActor>("Aktør", {
    filter: `typeid eq 5 and ${nameFilter}`,
    orderby: "efternavn asc",
    top,
  });
  return data.value;
}

export async function fetchVotesForActor(
  actorId: number | string,
  top = 50,
): Promise<OdaVote[]> {
  const data = await odaFetch<OdaVote>("Stemme", {
    filter: `aktørid eq ${actorId}`,
    expand: "Afstemning/Sagstrin/Sag",
    orderby: "opdateringsdato desc",
    top,
  });
  return data.value;
}

export async function fetchRecentVotings(top = 20): Promise<OdaVoting[]> {
  const data = await odaFetch<OdaVoting>("Afstemning", {
    expand: "Sagstrin/Sag",
    orderby: "opdateringsdato desc",
    top,
  });
  return data.value;
}

// Samme som fetchRecentVotings men med alle individuelle stemmer og
// aktør-info inkluderet. Tungere kald - brug kun når vi aggregerer.
// Bruger cache: "no-store" da svaret typisk er >2 MB og ikke kan
// gemmes i Next.js data-cache.
export async function fetchRecentVotingsWithVotes(
  top = 30,
): Promise<OdaVoting[]> {
  const url = buildUrl("Afstemning", {
    expand: "Sagstrin/Sag,Stemme/Aktør",
    orderby: "opdateringsdato desc",
    top,
  });
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[ODA] ${res.status} on ${url}`);
      return [];
    }
    const data = (await res.json()) as OdaListResponse<OdaVoting>;
    return data.value ?? [];
  } catch (err) {
    console.error(`[ODA] fetch failed: ${url}`, err);
    return [];
  }
}

export async function fetchVoting(id: number | string): Promise<OdaVoting | null> {
  return odaFetchOne<OdaVoting>("Afstemning", id, {
    expand: "Sagstrin/Sag,Stemme/Aktør",
  });
}

export async function fetchCase(id: number | string): Promise<OdaCase | null> {
  return odaFetchOne<OdaCase>("Sag", id);
}

// Hent alle afstemninger for en konkret sag ved at gå gennem Sagstrin.
export async function fetchVotingsForCase(
  caseId: number | string,
): Promise<OdaVoting[]> {
  const sagstrinData = await odaFetch<{ id: number }>("Sagstrin", {
    filter: `sagid eq ${caseId}`,
    top: 100,
  }).catch(() => ({ value: [] }));
  const ids = sagstrinData.value.map((s) => s.id);
  if (ids.length === 0) return [];

  const filters = batchOrFilter(ids, (id) => `sagstrinid eq ${id}`);
  const results = await Promise.all(
    filters.map((filter) =>
      odaFetch<OdaVoting>("Afstemning", {
        filter,
        expand: "Sagstrin/Sag,Stemme/Aktør",
        orderby: "opdateringsdato desc",
        top: 100,
      }).catch(() => ({ value: [] })),
    ),
  );
  return results.flatMap((r) => r.value);
}

export async function searchCases(query: string, top = 20): Promise<OdaCase[]> {
  const safe = query.trim().toLowerCase().replace(/'/g, "''");
  if (!safe) return [];
  const data = await odaFetch<OdaCase>("Sag", {
    filter: `substringof('${safe}',tolower(titel)) or substringof('${safe}',tolower(titelkort))`,
    orderby: "opdateringsdato desc",
    top,
  });
  return data.value;
}

// Split et OData-filter i batches for at holde URL'en under ~1800 tegn.
function batchOrFilter<T>(
  items: T[],
  build: (item: T) => string,
  maxLen = 1800,
): string[] {
  const batches: string[] = [];
  let current: string[] = [];
  let currentLen = 0;
  for (const item of items) {
    const expr = build(item);
    const addLen = expr.length + 4; // " or "
    if (current.length > 0 && currentLen + addLen > maxLen) {
      batches.push(current.join(" or "));
      current = [expr];
      currentLen = expr.length;
    } else {
      current.push(expr);
      currentLen += addLen;
    }
  }
  if (current.length) batches.push(current.join(" or "));
  return batches;
}

export async function fetchVotingsByCaseQuery(
  query: string,
  top = 20,
): Promise<OdaVoting[]> {
  const cases = await searchCases(query, 30);
  if (cases.length === 0) return [];

  // Trin 1: find alle Sagstrin for de fundne sager.
  // Nested filter (Sagstrin/sagid eq X) virker ikke pålideligt på ODA,
  // så vi deler i to kald.
  const stepFilters = batchOrFilter(cases, (c) => `sagid eq ${c.id}`);
  const sagstrinResults = await Promise.all(
    stepFilters.map((filter) =>
      odaFetch<{ id: number; sagid?: number | null }>("Sagstrin", {
        filter,
        top: 400,
      }).catch(() => ({ value: [] })),
    ),
  );
  const sagstrinIds = sagstrinResults.flatMap((r) => r.value.map((s) => s.id));
  if (sagstrinIds.length === 0) return [];

  // Trin 2: find Afstemninger for disse sagstrin.
  const voteFilters = batchOrFilter(sagstrinIds, (id) => `sagstrinid eq ${id}`);
  const votingResults = await Promise.all(
    voteFilters.map((filter) =>
      odaFetch<OdaVoting>("Afstemning", {
        filter,
        expand: "Sagstrin/Sag,Stemme/Aktør",
        orderby: "opdateringsdato desc",
        top: Math.max(top, 50),
      }).catch(() => ({ value: [] })),
    ),
  );
  const all = votingResults.flatMap((r) => r.value);
  // Dedupliker og sortér efter nyeste
  const byId = new Map<number, OdaVoting>();
  for (const v of all) byId.set(v.id, v);
  return Array.from(byId.values())
    .sort((a, b) =>
      (b.opdateringsdato ?? "").localeCompare(a.opdateringsdato ?? ""),
    )
    .slice(0, top);
}

// Aggregér en liste af stemmer til samlet statistik.
export function aggregateVotes(votes: { typeid: number }[]): VoteStats {
  const stats: VoteStats = {
    for: 0,
    against: 0,
    abstain: 0,
    absent: 0,
    total: votes.length,
  };
  for (const v of votes) {
    if (v.typeid === 1) stats.for++;
    else if (v.typeid === 2) stats.against++;
    else if (v.typeid === 3) stats.absent++;
    else if (v.typeid === 4) stats.abstain++;
  }
  return stats;
}

// Udled emne-tags fra en sagstitel. Bruges som forberedelse til fase 2.
const STOP_WORDS = new Set([
  "og",
  "i",
  "på",
  "af",
  "om",
  "for",
  "til",
  "med",
  "en",
  "et",
  "den",
  "det",
  "der",
  "som",
  "fra",
  "at",
  "mv",
  "m.v.",
  "mv.",
  "ved",
  "over",
  "forslag",
  "lov",
  "bekendtgørelse",
  "ændring",
  "ændringer",
]);

export function extractTags(title: string): string[] {
  return Array.from(
    new Set(
      title
        .toLowerCase()
        .replace(/[.,;:()\[\]"']/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
    ),
  ).slice(0, 10);
}
