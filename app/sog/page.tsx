import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PoliticianCard } from "@/components/PoliticianCard";
import { SearchBar } from "@/components/SearchBar";
import { searchActors, searchCases } from "@/lib/oda";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; slug?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const slug = searchParams.slug ?? slugify(q);

  const [actors, cases] = q
    ? await Promise.all([
        searchActors(q, 12).catch(() => []),
        searchCases(q, 10).catch(() => []),
      ])
    : [[], []];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-2xl font-bold tracking-tight">
          Søgning
          {q ? (
            <span className="ml-2 font-normal text-muted-foreground">
              for &quot;{q}&quot;
            </span>
          ) : null}
        </h1>
        <SearchBar defaultValue={q} />
      </section>

      {q && (
        <>
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Politikere</CardTitle>
              </CardHeader>
              <CardBody>
                {actors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ingen politikere matcher &quot;{q}&quot;.
                  </p>
                ) : (
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
                )}
              </CardBody>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Emne</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-muted-foreground">
                  Se hvordan partierne har stemt i sager om &quot;{q}&quot;.
                </p>
                <Link
                  href={`/emne/${encodeURIComponent(slug)}`}
                  className="mt-3 inline-flex rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
                >
                  Åbn emnesiden →
                </Link>
                {cases.length > 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {cases.length} relevante sager fundet.
                  </p>
                )}
              </CardBody>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
