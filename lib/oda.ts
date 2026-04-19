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
    expand: "Afstemning,Afstemning/Sag",
    orderby: "opdateringsdato desc",
    top,
  });
  return data.value;
}

export async function fetchRecentVotings(top = 20): Promise<OdaVoting[]> {
  const data = await odaFetch<OdaVoting>("Afstemning", {
    expand: "Sag",
    orderby: "opdateringsdato desc",
    top,
  });
  return data.value;
}

export async function fetchVoting(id: number | string): Promise<OdaVoting | null> {
  return odaFetchOne<OdaVoting>("Afstemning", id, {
    expand: "Sag,Stemme,Stemme/Aktør",
  });
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

export async function fetchVotingsByCaseQuery(
  query: string,
  top = 20,
): Promise<OdaVoting[]> {
  const cases = await searchCases(query, 30);
  if (cases.length === 0) return [];
  const orFilter = cases.map((c) => `Sag/id eq ${c.id}`).join(" or ");
  const data = await odaFetch<OdaVoting>("Afstemning", {
    filter: orFilter,
    expand: "Sag,Stemme/Aktør",
    orderby: "opdateringsdato desc",
    top,
  });
  return data.value;
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
