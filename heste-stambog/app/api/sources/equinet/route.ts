import { NextResponse } from "next/server";
import { searchEquinet, type EquinetSearchType } from "@/lib/sources/equinet";
import { getCachedSearch, logSearch } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const type = (url.searchParams.get("type") ?? "name") as EquinetSearchType;

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
