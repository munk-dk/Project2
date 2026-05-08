// Aggregeret søgning på tværs af alle aktive kilder.
//
// Vi kører kilderne parallelt med Promise.allSettled så ét nedbrud ikke
// vælter den samlede søgning. Resultaterne flettes via mergeHits så samme
// hest fra flere kilder vises som én række.

import { NextResponse } from "next/server";
import { searchEquinet, type EquinetSearchType } from "@/lib/sources/equinet";
import { searchFei } from "@/lib/sources/fei";
import { mergeHits } from "@/lib/aggregate";
import { detectSearchType } from "@/lib/utils";
import { getCachedSearch, logSearch } from "@/lib/cache";
import type { SearchType, SourceHit, SourceName } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SourceStatus {
  source: SourceName;
  status: "ok" | "error" | "skipped" | "cached";
  count: number;
  error?: string;
  fetchedAt?: string;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const requestedType = (url.searchParams.get("type") ?? "all") as SearchType;

  if (!q) {
    return NextResponse.json(
      { error: "q (søgeudtryk) er påkrævet" },
      { status: 400 },
    );
  }

  const type =
    requestedType === "all" ? detectSearchType(q) : requestedType;

  const sourceStatuses: SourceStatus[] = [];

  const [equinetResult, feiResult] = await Promise.allSettled([
    runEquinet(q, type, sourceStatuses),
    runFei(q, type, sourceStatuses),
  ]);

  const allHits: SourceHit[] = [];
  if (equinetResult.status === "fulfilled") allHits.push(...equinetResult.value);
  if (feiResult.status === "fulfilled") allHits.push(...feiResult.value);

  const merged = mergeHits(allHits);

  return NextResponse.json({
    query: q,
    type,
    sources: sourceStatuses,
    results: merged,
  });
}

async function runEquinet(
  q: string,
  type: Exclude<SearchType, "all">,
  log: SourceStatus[],
): Promise<SourceHit[]> {
  // Equinet kender kun name, ident og chip.
  const mapped: EquinetSearchType | null =
    type === "name" || type === "ident" || type === "chip"
      ? type
      : null;
  if (!mapped) {
    log.push({ source: "equinet", status: "skipped", count: 0 });
    return [];
  }

  const cached = await getCachedSearch("equinet", mapped, q);
  if (cached) {
    log.push({
      source: "equinet",
      status: "cached",
      count: cached.results.length,
      fetchedAt: cached.fetchedAt,
    });
    return cached.results;
  }

  try {
    const results = await searchEquinet({ type: mapped, query: q });
    await logSearch("equinet", mapped, q, results, "ok");
    log.push({
      source: "equinet",
      status: "ok",
      count: results.length,
      fetchedAt: new Date().toISOString(),
    });
    return results;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    await logSearch("equinet", mapped, q, [], "error", message);
    log.push({ source: "equinet", status: "error", count: 0, error: message });
    return [];
  }
}

async function runFei(
  q: string,
  type: Exclude<SearchType, "all">,
  log: SourceStatus[],
): Promise<SourceHit[]> {
  // FEI kan tage navn eller direkte FEI ID.
  const cacheKey = type === "feiid" ? q : q;
  const cacheType = type === "feiid" ? "feiid" : "name";

  const cached = await getCachedSearch("fei", cacheType, cacheKey);
  if (cached) {
    log.push({
      source: "fei",
      status: "cached",
      count: cached.results.length,
      fetchedAt: cached.fetchedAt,
    });
    return cached.results;
  }

  try {
    const results = await searchFei({
      query: q,
      feiId: type === "feiid" ? q : undefined,
    });
    await logSearch("fei", cacheType, cacheKey, results, "ok");
    log.push({
      source: "fei",
      status: "ok",
      count: results.length,
      fetchedAt: new Date().toISOString(),
    });
    return results;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    await logSearch("fei", cacheType, cacheKey, [], "error", message);
    log.push({ source: "fei", status: "error", count: 0, error: message });
    return [];
  }
}
