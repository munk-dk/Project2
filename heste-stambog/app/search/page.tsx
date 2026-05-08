import { Suspense } from "react";
import { SearchBar } from "@/components/SearchBar";
import { HorseResultCard } from "@/components/HorseResultCard";
import { mergeHits } from "@/lib/aggregate";
import { detectSearchType } from "@/lib/utils";
import { searchEquinet, type EquinetSearchType } from "@/lib/sources/equinet";
import { searchFei } from "@/lib/sources/fei";
import { getCachedSearch, logSearch } from "@/lib/cache";
import type { SearchType, SourceHit, SourceName } from "@/lib/types";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: { q?: string; type?: SearchType };
}

interface SourceStatus {
  source: SourceName;
  count: number;
  status: "ok" | "error" | "skipped" | "cached";
  error?: string;
}

async function runSearch(
  q: string,
  type: Exclude<SearchType, "all">,
): Promise<{ hits: SourceHit[]; statuses: SourceStatus[] }> {
  const statuses: SourceStatus[] = [];
  const equinetType: EquinetSearchType | null =
    type === "name" || type === "ident" || type === "chip" ? type : null;

  const tasks: Promise<SourceHit[]>[] = [];

  if (equinetType) {
    tasks.push(
      (async () => {
        const cached = await getCachedSearch("equinet", equinetType, q);
        if (cached) {
          statuses.push({
            source: "equinet",
            count: cached.results.length,
            status: "cached",
          });
          return cached.results;
        }
        try {
          const r = await searchEquinet({ type: equinetType, query: q });
          await logSearch("equinet", equinetType, q, r);
          statuses.push({
            source: "equinet",
            count: r.length,
            status: "ok",
          });
          return r;
        } catch (e) {
          const message = e instanceof Error ? e.message : "Ukendt fejl";
          await logSearch("equinet", equinetType, q, [], "error", message);
          statuses.push({
            source: "equinet",
            count: 0,
            status: "error",
            error: message,
          });
          return [];
        }
      })(),
    );
  } else {
    statuses.push({ source: "equinet", count: 0, status: "skipped" });
  }

  tasks.push(
    (async () => {
      const cacheType = type === "feiid" ? "feiid" : "name";
      const cached = await getCachedSearch("fei", cacheType, q);
      if (cached) {
        statuses.push({
          source: "fei",
          count: cached.results.length,
          status: "cached",
        });
        return cached.results;
      }
      try {
        const r = await searchFei({
          query: q,
          feiId: type === "feiid" ? q : undefined,
        });
        await logSearch("fei", cacheType, q, r);
        statuses.push({ source: "fei", count: r.length, status: "ok" });
        return r;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Ukendt fejl";
        await logSearch("fei", cacheType, q, [], "error", message);
        statuses.push({
          source: "fei",
          count: 0,
          status: "error",
          error: message,
        });
        return [];
      }
    })(),
  );

  const results = await Promise.all(tasks);
  return { hits: results.flat(), statuses };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const q = searchParams.q?.trim() ?? "";
  const requestedType: SearchType = (searchParams.type as SearchType) ?? "all";
  const effectiveType =
    requestedType === "all" && q ? detectSearchType(q) : requestedType;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
        <SearchBar initialQuery={q} initialType={requestedType} />
      </div>

      {!q ? (
        <EmptyState />
      ) : (
        <Suspense fallback={<Loading />}>
          <Results q={q} type={effectiveType as Exclude<SearchType, "all">} />
        </Suspense>
      )}
    </div>
  );
}

async function Results({
  q,
  type,
}: {
  q: string;
  type: Exclude<SearchType, "all">;
}) {
  const { hits, statuses } = await runSearch(q, type);
  const merged = mergeHits(hits);

  const errors = statuses.filter((s) => s.status === "error" && s.error);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{merged.length}</strong>{" "}
          {merged.length === 1 ? "match" : "matches"} for &ldquo;{q}&rdquo;
          <span className="ml-2 text-xs text-muted-foreground">
            (type: {type})
          </span>
        </span>
        <span className="text-muted-foreground/60">·</span>
        {statuses.map((s) => (
          <SourcePill key={s.source} status={s} />
        ))}
      </div>
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Fejl pr. kilde:</p>
          <ul className="mt-2 space-y-1">
            {errors.map((s) => (
              <li key={s.source} className="font-mono text-xs">
                <strong className="font-semibold">{s.source}:</strong>{" "}
                {s.error}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-red-700/80">
            Equinet- og FEI-endpoints/feltnavne er gættet ud fra det offentlige
            UI. Hvis fejlen handler om HTML-struktur eller manglende tokens,
            skal scrapen verificeres mod et rigtigt netværksrequest i Chrome
            DevTools.
          </p>
        </div>
      )}
      {merged.length === 0 ? (
        <NoResults q={q} />
      ) : (
        <div className="grid gap-3">
          {merged.map((horse) => (
            <HorseResultCard key={horse.id} horse={horse} />
          ))}
        </div>
      )}
    </div>
  );
}

function SourcePill({ status }: { status: SourceStatus }) {
  const color =
    status.status === "error"
      ? "text-red-700"
      : status.status === "skipped"
        ? "text-muted-foreground/60"
        : "text-foreground";
  return (
    <span className={color} title={status.error ?? ""}>
      {status.source}
      {status.status === "skipped"
        ? " (n/a)"
        : status.status === "error"
          ? " (fejl)"
          : ` (${status.count})`}
    </span>
  );
}

function Loading() {
  return (
    <div className="rounded-lg border border-border bg-white p-6 text-sm text-muted-foreground">
      Søger…
    </div>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-6 text-sm">
      <p className="font-medium">Ingen resultater for &ldquo;{q}&rdquo;</p>
      <p className="mt-2 text-muted-foreground">
        Prøv en anden søgetype, eller tjek om identifikationsnummeret er
        korrekt formateret. UELN er 15 cifre, FEI ID 9 alfanumeriske tegn,
        chip-numre 15 cifre.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-border bg-white p-8 text-center text-muted-foreground">
      <p>Indtast et søgeudtryk ovenfor for at komme i gang.</p>
      <p className="mt-2 text-sm">
        Du kan søge på navn, dansk ident-nummer, chip-nummer, FEI ID eller UELN.
      </p>
    </div>
  );
}
