// Slå en samlet hesteprofil op via det kombinerede ID fra søgning,
// fx "equinet:DK20051234" eller "fei:GBR12345".
//
// Strategi for MVP: vi kender kun rawId fra én kilde, så vi henter via dén
// kilde og bruger fundne ID-numre (UELN, FEI ID, dansk ident, chip) til at
// berige fra de andre kilder.

import { NextResponse } from "next/server";
import { searchEquinet } from "@/lib/sources/equinet";
import { searchFei } from "@/lib/sources/fei";
import { buildHorse } from "@/lib/aggregate";
import type { DataSource, SourceHit, SourceName } from "@/lib/types";

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

  // Hent primær kilde først.
  try {
    const primary = await fetchFromSource(source, rawId);
    sources.push({
      name: source,
      fetchedAt: new Date().toISOString(),
      status: primary.length ? "ok" : "not_found",
      rawId,
    });
    allHits.push(...primary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    sources.push({
      name: source,
      fetchedAt: new Date().toISOString(),
      status: "error",
      rawId,
      message,
    });
  }

  // Berig fra andre kilder hvis vi har et anvendeligt søgekriterium.
  const primaryHit = allHits[0];
  const enrichmentTargets: SourceName[] =
    source === "equinet" ? ["fei"] : ["equinet"];

  for (const target of enrichmentTargets) {
    if (!primaryHit) break;
    try {
      const hits = await enrich(target, primaryHit);
      sources.push({
        name: target,
        fetchedAt: new Date().toISOString(),
        status: hits.length ? "ok" : "not_found",
      });
      allHits.push(...hits);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ukendt fejl";
      sources.push({
        name: target,
        fetchedAt: new Date().toISOString(),
        status: "error",
        message,
      });
    }
  }

  if (allHits.length === 0) {
    return NextResponse.json(
      { error: "Hest ikke fundet", sources },
      { status: 404 },
    );
  }

  const horse = buildHorse(id, allHits, { sources });
  return NextResponse.json({ horse });
}

async function fetchFromSource(
  source: SourceName,
  rawId: string,
): Promise<SourceHit[]> {
  switch (source) {
    case "equinet":
      // På Equinet er rawId som regel ident-nummeret.
      return searchEquinet({ type: "ident", query: rawId });
    case "fei":
      return searchFei({ query: "", feiId: rawId });
    default:
      return [];
  }
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
