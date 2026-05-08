import { NextResponse } from "next/server";
import {
  searchEquinet,
  searchEquinetWithRaw,
  type EquinetSearchType,
} from "@/lib/sources/equinet";
import { getCachedSearch, logSearch } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const type = (url.searchParams.get("type") ?? "name") as EquinetSearchType;
  const debug = url.searchParams.get("debug") === "1";

  if (!q) {
    return NextResponse.json(
      { error: "q (søgeudtryk) er påkrævet" },
      { status: 400 },
    );
  }
  if (!["name", "ident", "chip"].includes(type)) {
    return NextResponse.json(
      { error: "type skal være name, ident eller chip" },
      { status: 400 },
    );
  }

  if (debug) {
    try {
      const { hits, html, finalUrl } = await searchEquinetWithRaw({
        type,
        query: q,
      });
      // Returner et uddrag af HTML'en så vi kan se strukturen uden at
      // overvælde browser/JSON. Vi viser de første tabeller og evt.
      // tomme-state markeringer.
      const tableSnippet = extractTableSnippets(html);
      return NextResponse.json({
        finalUrl,
        hitCount: hits.length,
        htmlLength: html.length,
        htmlHead: html.slice(0, 1500),
        tableSnippet,
        hits,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ukendt fejl";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const cached = await getCachedSearch("equinet", type, q);
  if (cached) {
    return NextResponse.json({
      source: "equinet",
      cached: true,
      fetchedAt: cached.fetchedAt,
      results: cached.results,
    });
  }

  try {
    const results = await searchEquinet({ type, query: q });
    await logSearch("equinet", type, q, results, "ok");
    return NextResponse.json({
      source: "equinet",
      cached: false,
      fetchedAt: new Date().toISOString(),
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    await logSearch("equinet", type, q, [], "error", message);
    return NextResponse.json(
      { source: "equinet", error: message, results: [] },
      { status: 502 },
    );
  }
}

function extractTableSnippets(html: string): string[] {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  return tables.slice(0, 3).map((t) => t.slice(0, 2000));
}
