import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PartyComparisonTable } from "@/components/PartyComparisonTable";
import {
  extractTags,
  fetchVotingsByCaseQuery,
  searchCases,
} from "@/lib/oda";
import { cacheCase } from "@/lib/cache";
import { formatDate } from "@/lib/utils";
import type { PartyVoteStats } from "@/lib/types";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const q = decodeURIComponent(params.slug).replace(/-/g, " ");
  return { title: `Emne: ${q}` };
}

type PartyAgg = PartyVoteStats;

export default async function TopicPage({
  params,
}: {
  params: { slug: string };
}) {
  const query = decodeURIComponent(params.slug).replace(/-/g, " ");

  const [cases, votings] = await Promise.all([
    searchCases(query, 20).catch(() => []),
    fetchVotingsByCaseQuery(query, 50).catch(() => []),
  ]);

  // Cache sager med udledte tags (fase 2-forberedelse).
  await Promise.all(
    cases.map((c) => cacheCase(c, extractTags(c.titel))),
  ).catch(() => undefined);

  // Aggregér stemmer pr. parti. Bemærk: Stemme-entiteterne her mangler
  // Aktør-expand (kostbart ved mange afstemninger), så vi viser kun hvor
  // mange afstemninger der er fundet, og lader PartyComparisonTable stå
  // klar til når backend-sync populerer `votes`-tabellen med parti.
  const rows: PartyAgg[] = [];

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Emne
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl capitalize">
          {query}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {cases.length} sager og {votings.length} afstemninger fundet på dette
          emne.
        </p>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Partivis stemmefordeling</CardTitle>
          </CardHeader>
          <CardBody>
            {rows.length === 0 ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Partivis sammenligning er under opbygning. Den kræver at alle
                  individuelle stemmer på tværs af afstemningerne hentes og
                  berigges med partitilhørsforhold.
                </p>
                <p>
                  Indtil Supabase-synkroniseringen kører, se listen over sager
                  og afstemninger nedenfor — klik ind på hver for at se partivis
                  oversigt.
                </p>
              </div>
            ) : (
              <PartyComparisonTable rows={rows} />
            )}
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Afstemninger på dette emne</CardTitle>
          </CardHeader>
          <CardBody>
            {votings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen afstemninger fundet for &quot;{query}&quot;.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {votings.slice(0, 30).map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/afstemning/${v.id}`}
                      className="block py-3 transition hover:bg-muted/40"
                    >
                      <p className="line-clamp-2 font-medium">
                        {v.Sag?.titelkort ??
                          v.Sag?.titel ??
                          `Afstemning #${v.id}`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(v.opdateringsdato)}
                        {v.vedtaget != null
                          ? ` · ${v.vedtaget ? "Vedtaget" : "Forkastet"}`
                          : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Sager</CardTitle>
          </CardHeader>
          <CardBody>
            {cases.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen sager fundet for &quot;{query}&quot;.
              </p>
            ) : (
              <ul className="space-y-3">
                {cases.map((c) => (
                  <li key={c.id} className="text-sm">
                    <p className="font-medium">
                      {c.titelkort ?? c.titel}
                    </p>
                    {c.nummer && (
                      <p className="text-xs text-muted-foreground">
                        {c.nummer}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
