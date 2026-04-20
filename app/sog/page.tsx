import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PoliticianCard } from "@/components/PoliticianCard";
import { SearchBar } from "@/components/SearchBar";
import {
  fetchVotingsByCaseQuery,
  getVotingCase,
  searchActors,
  searchCases,
} from "@/lib/oda";
import { formatDate, slugify } from "@/lib/utils";
import { topicBySlug } from "@/lib/topics";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; slug?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const slug = searchParams.slug ?? slugify(q);
  const topic = topicBySlug(slug);

  const [actors, cases, votings] = q
    ? await Promise.all([
        searchActors(q, 12).catch(() => []),
        searchCases(q, 15).catch(() => []),
        fetchVotingsByCaseQuery(q, 10).catch(() => []),
      ])
    : [[], [], []];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Søgning
          {q ? (
            <span className="ml-2 font-normal text-muted-foreground">
              for &quot;{q}&quot;
            </span>
          ) : null}
        </h1>
        <div className="mt-4 max-w-xl">
          <SearchBar defaultValue={q} />
        </div>
        {topic && (
          <Link
            href={`/emne/${topic.slug}`}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm shadow-sm transition hover:shadow-md"
          >
            {topic.emoji && <span aria-hidden>{topic.emoji}</span>}
            <span>
              <strong>{topic.name}</strong> er et kendt emne — se samlet
              partioverblik →
            </span>
          </Link>
        )}
      </section>

      {!q ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              Skriv en politikers navn eller et emne i søgefeltet.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          {actors.length > 0 && (
            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Politikere ({actors.length})</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {actors.map((a) => (
                      <PoliticianCard
                        key={a.id}
                        id={a.id}
                        name={a.navn}
                        party={a.gruppenavnkort}
                      />
                    ))}
                  </div>
                </CardBody>
              </Card>
            </section>
          )}

          {votings.length > 0 && (
            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Afstemninger ({votings.length})</CardTitle>
                </CardHeader>
                <CardBody>
                  <ul className="divide-y divide-border">
                    {votings.map((v) => {
                      const sag = getVotingCase(v);
                      return (
                        <li key={v.id}>
                          <Link
                            href={`/afstemning/${v.id}`}
                            className="block py-3 transition hover:bg-muted/40"
                          >
                            <p className="line-clamp-2 text-sm font-medium">
                              {sag?.titelkort ??
                                sag?.titel ??
                                v.konklusion ??
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
                      );
                    })}
                  </ul>
                </CardBody>
              </Card>
            </section>
          )}

          {cases.length > 0 && (
            <section>
              <Card>
                <CardHeader>
                  <CardTitle>Sager ({cases.length})</CardTitle>
                </CardHeader>
                <CardBody>
                  <ul className="divide-y divide-border">
                    {cases.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/sag/${c.id}`}
                          className="block py-3 transition hover:bg-muted/40"
                        >
                          <p className="text-sm font-medium">
                            {c.titelkort ?? c.titel}
                          </p>
                          {c.nummer && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {c.nummer}
                            </p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </section>
          )}

          {actors.length === 0 && cases.length === 0 && votings.length === 0 && (
            <Card>
              <CardBody className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Ingen resultater for &quot;{q}&quot;. Prøv et andet søgeord,
                  eller se:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/politikere"
                    className="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/40"
                  >
                    Alle politikere
                  </Link>
                  <Link
                    href="/emner"
                    className="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/40"
                  >
                    Alle emner
                  </Link>
                  <Link
                    href="/partier"
                    className="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/40"
                  >
                    Alle partier
                  </Link>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
