// Caching-lag mod Supabase. Hvis Supabase ikke er konfigureret falder vi
// gracefully tilbage til ingen-cache uden at fejle.

import { getSupabase } from "./supabase";
import type { Horse, SourceHit, SourceName } from "./types";

const SEARCH_TTL_MS = 24 * 60 * 60 * 1000;
const HORSE_TTL_MS = 24 * 60 * 60 * 1000;

interface CachedSearch {
  results: SourceHit[];
  fetchedAt: string;
}

export async function getCachedSearch(
  source: SourceName,
  queryType: string,
  query: string,
): Promise<CachedSearch | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("search_log")
    .select("results, fetched_at")
    .eq("source", source)
    .eq("query_type", queryType)
    .eq("query", query)
    .eq("status", "ok")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const age = Date.now() - new Date(data.fetched_at as string).getTime();
  if (age > SEARCH_TTL_MS) return null;
  return {
    results: (data.results as SourceHit[]) ?? [],
    fetchedAt: data.fetched_at as string,
  };
}

export async function logSearch(
  source: SourceName,
  queryType: string,
  query: string,
  results: SourceHit[],
  status: "ok" | "error" = "ok",
  errorMsg?: string,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("search_log").insert({
    source,
    query_type: queryType,
    query,
    result_count: results.length,
    results,
    status,
    error: errorMsg ?? null,
  });
}

export async function getCachedHorse(
  field: "ueln" | "fei_id" | "danish_ident",
  value: string,
): Promise<Horse | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("horse_cache")
    .select("*")
    .eq(field, value)
    .maybeSingle();
  if (error || !data) return null;
  const age = Date.now() - new Date(data.updated_at as string).getTime();
  if (age > HORSE_TTL_MS) return null;
  return rowToHorse(data);
}

export async function upsertHorse(horse: Horse): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("horse_cache").upsert(
    {
      id: horse.id,
      ueln: horse.ueln ?? null,
      fei_id: horse.feiId ?? null,
      danish_ident: horse.danishIdent ?? null,
      chip_number: horse.chipNumber ?? null,
      name: horse.name,
      birth_year: horse.birthYear ?? null,
      sex: horse.sex ?? null,
      color: horse.color ?? null,
      studbook: horse.studbook ?? null,
      studbook_number: horse.studBookNumber ?? null,
      sire: horse.sire ?? null,
      dam: horse.dam ?? null,
      dam_sire: horse.damSire ?? null,
      owner: horse.owner ?? null,
      trainer: horse.trainer ?? null,
      country: horse.country ?? null,
      passport_status: horse.passportStatus ?? null,
      passport_issuing_org: horse.passportIssuingOrg ?? null,
      vaccinations: horse.vaccinations ?? [],
      competition_history: horse.competitionHistory ?? [],
      current_ranking: horse.currentRanking ?? null,
      highest_score: horse.highestScore ?? null,
      sources: horse.sources,
      verification_status: horse.verificationStatus,
      verification_flags: horse.verificationFlags,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}

function rowToHorse(data: Record<string, unknown>): Horse {
  return {
    id: data.id as string,
    ueln: (data.ueln as string) ?? undefined,
    feiId: (data.fei_id as string) ?? undefined,
    danishIdent: (data.danish_ident as string) ?? undefined,
    chipNumber: (data.chip_number as string) ?? undefined,
    name: data.name as string,
    birthYear: (data.birth_year as number) ?? undefined,
    sex: (data.sex as Horse["sex"]) ?? undefined,
    color: (data.color as string) ?? undefined,
    studbook: (data.studbook as string) ?? undefined,
    studBookNumber: (data.studbook_number as string) ?? undefined,
    sire: (data.sire as Horse["sire"]) ?? undefined,
    dam: (data.dam as Horse["dam"]) ?? undefined,
    damSire: (data.dam_sire as Horse["damSire"]) ?? undefined,
    owner: (data.owner as string) ?? undefined,
    trainer: (data.trainer as string) ?? undefined,
    country: (data.country as string) ?? undefined,
    passportStatus:
      (data.passport_status as Horse["passportStatus"]) ?? undefined,
    passportIssuingOrg: (data.passport_issuing_org as string) ?? undefined,
    vaccinations: (data.vaccinations as Horse["vaccinations"]) ?? [],
    competitionHistory:
      (data.competition_history as Horse["competitionHistory"]) ?? [],
    currentRanking: (data.current_ranking as number) ?? undefined,
    highestScore: (data.highest_score as number) ?? undefined,
    sources: (data.sources as Horse["sources"]) ?? [],
    verificationStatus:
      (data.verification_status as Horse["verificationStatus"]) ?? "unknown",
    verificationFlags:
      (data.verification_flags as Horse["verificationFlags"]) ?? [],
    lastUpdated: data.updated_at as string,
  };
}
