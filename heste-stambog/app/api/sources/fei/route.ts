import { NextResponse } from "next/server";
import { searchFei } from "@/lib/sources/fei";
import { getCachedSearch, logSearch } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const feiId = url.searchParams.get("feiId")?.trim() || undefined;

  if (!q && !feiId) {
    return NextResponse.json(
      { error: "q eller feiId er påkrævet" },
      { status: 400 },
    );
  }

  const queryKey = feiId ?? q ?? "";
  const queryType = feiId ? "feiid" : "name";

  const cached = await getCachedSearch("fei", queryType, queryKey);
  if (cached) {
    return NextResponse.json({
      source: "fei",
      cached: true,
      fetchedAt: cached.fetchedAt,
      results: cached.results,
    });
  }

  try {
    const results = await searchFei({ query: q ?? "", feiId });
    await logSearch("fei", queryType, queryKey, results, "ok");
    return NextResponse.json({
      source: "fei",
      cached: false,
      fetchedAt: new Date().toISOString(),
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukendt fejl";
    await logSearch("fei", queryType, queryKey, [], "error", message);
    return NextResponse.json(
      { source: "fei", error: message, results: [] },
      { status: 502 },
    );
  }
}
