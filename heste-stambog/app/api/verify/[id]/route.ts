// Generér en verifikationsrapport for en hest. Vi genbruger /api/horse/[id]
// internt for at samle data og kører derefter buildVerificationReport.

import { NextResponse } from "next/server";
import { searchEquinet } from "@/lib/sources/equinet";
import { searchFei } from "@/lib/sources/fei";
import { buildHorse } from "@/lib/aggregate";
import { buildVerificationReport } from "@/lib/verify";
import type {
  DataSource,
  Horse,
  SourceHit,
  SourceName,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { id: string } },
) {
  const id = decodeURIComponent(context.params.id);
  const [sourcePart, ...idParts] = id.split(":");
  const rawId = idParts.join(":");
  const source = sourcePart as SourceName;

  if (!source || !rawId) {
    return NextResponse.json(
      { error: "id skal have format <source>:<rawId>" },
      { status: 400 },
    );
  }

  const sources: DataSource[] = [];
  const allHits: SourceHit[] = [];

  try {
    const primary = await fetchPrimary(source, rawId);
    sources.push({
      name: source,
      fetchedAt: new Date().toISOString(),
      status: primary.length ? "ok" : "not_found",
      rawId,
    });
    allHits.push(...primary);
  } catch (err) {
    sources.push({
      name: source,
      fetchedAt: new Date().toISOString(),
      status: "error",
      message: err instanceof Error ? err.message : "Ukendt fejl",
    });
  }

  const primaryHit = allHits[0];
  if (primaryHit) {
    const enrichments: SourceName[] =
      source === "equinet" ? ["fei"] : ["equinet"];
    for (const target of enrichments) {
      try {
        const hits = await enrich(target, primaryHit);
        sources.push({
          name: target,
          fetchedAt: new Date().toISOString(),
          status: hits.length ? "ok" : "not_found",
        });
        allHits.push(...hits);
      } catch (err) {
        sources.push({
          name: target,
          fetchedAt: new Date().toISOString(),
          status: "error",
          message: err instanceof Error ? err.message : "Ukendt fejl",
        });
      }
    }
  }

  if (allHits.length === 0) {
    return NextResponse.json(
      { error: "Hest ikke fundet", sources },
      { status: 404 },
    );
  }

  const horse = buildHorse(id, allHits, { sources });
  const sourceData: Partial<Record<SourceName, Partial<Horse>>> = {};
  for (const hit of allHits) {
    sourceData[hit.source] = {
      name: hit.name,
      birthYear: hit.birthYear,
      sex: hit.sex,
      ueln: hit.ueln,
      feiId: hit.feiId,
      danishIdent: hit.danishIdent,
      chipNumber: hit.chipNumber,
      studbook: hit.studbook,
      country: hit.country,
    };
  }
  const report = buildVerificationReport(horse, sourceData);
  return NextResponse.json({ horse, report });
}

async function fetchPrimary(
  source: SourceName,
  rawId: string,
): Promise<SourceHit[]> {
  if (source === "equinet")
    return searchEquinet({ type: "ident", query: rawId });
  if (source === "fei") return searchFei({ query: "", feiId: rawId });
  return [];
}

async function enrich(
  target: SourceName,
  primary: SourceHit,
): Promise<SourceHit[]> {
  if (target === "fei") {
    if (primary.feiId) return searchFei({ query: "", feiId: primary.feiId });
    if (primary.name) return searchFei({ query: primary.name });
    return [];
  }
  if (target === "equinet") {
    if (primary.danishIdent)
      return searchEquinet({ type: "ident", query: primary.danishIdent });
    if (primary.chipNumber)
      return searchEquinet({ type: "chip", query: primary.chipNumber });
    if (primary.name)
      return searchEquinet({ type: "name", query: primary.name });
    return [];
  }
  return [];
}
