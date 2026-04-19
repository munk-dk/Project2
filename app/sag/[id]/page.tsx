import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatsGrid } from "@/components/StatsGrid";
import { PartyVoteBar } from "@/components/PartyVoteBar";
import { aggregateVotes, fetchCase, fetchVotingsForCase } from "@/lib/oda";
import { resolveParty } from "@/lib/parties";
import { formatDate } from "@/lib/utils";
import type { PartyVoteStats } from "@/lib/types";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return { title: "Sag" };
  const sag = await fetchCase(id).catch(() => null);
  return { title: sag?.titelkort ?? sag?.titel ?? `Sag #${params.id}` };
}

export default async function CasePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const [sag, votings] = await Promise.all([
    fetchCase(id),
    fetchVotingsForCase(id).catch(() => []),
  ]);

  if (!sag) notFound();

  // Aggregér alle individuelle stemmer for sagen.
  const allVotes = votings.flatMap((v) => v.Stemme ?? []);
  const totals = aggregateVotes(allVotes);

  const byParty = new Map<string, PartyVoteStats>();
  for (const stemme of allVotes) {
    const key = stemme.Aktør?.gruppenavnkort ?? "Ukendt";
    const row =
      byParty.get(key) ??
      ({
        party: key,
        for: 0,
        against: 0,
        abstain: 0,
        absent: 0,
        total: 0,
      } satisfies PartyVoteStats);
    if (stemme.typeid === 1) row.for++;
    else if (stemme.typeid === 2) row.against++;
    else if (stemme.typeid === 3) row.absent++;
    else if (stemme.typeid === 4) row.abstain++;
    row.total++;
    byParty.set(key, row);
  }
  const partyStats = Array.from(byParty.values())
    .filter((r) => r.total > 0)
    .sort((a, b) => {
      const ak = resolveParty(a.party).key;
      const bk = resolveParty(b.party).key;
      if (ak === "UNKNOWN" && bk !== "UNKNOWN") return 1;
      if (bk === "UNKNOWN" && ak !== "UNKNOWN") return -1;
      return b.total - a.total;
    });

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Sag {sag.nummer ? `· ${sag.nummer}` : ""}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          {sag.titelkort ?? sag.titel}
        </h1>
        {sag.titel && sag.titel !== sag.titelkort && (
          <p className="mt-2 text-muted-foreground">{sag.titel}</p>
        )}
        {sag.resume && (
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            {sag.resume.replace(/<[^>]+>/g, " ").slice(0, 800)}
          </p>
        )}
      </section>

      {votings.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              Der er ingen afstemninger på denne sag endnu.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold tracking-tight">
              Samlet resultat · {votings.length} afstemninger
            </h2>
            <StatsGrid stats={totals} />
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Partivis stemmefordeling</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                {partyStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ingen partistemmer registreret.
                  </p>
                ) : (
                  partyStats.map((p) => (
                    <PartyVoteBar key={p.party} party={p.party} stats={p} />
                  ))
                )}
              </CardBody>
            </Card>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Afstemninger på denne sag</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="divide-y divide-border">
                  {votings
                    .sort((a, b) =>
                      (b.opdateringsdato ?? "").localeCompare(
                        a.opdateringsdato ?? "",
                      ),
                    )
                    .map((v) => (
                      <li key={v.id}>
                        <Link
                          href={`/afstemning/${v.id}`}
                          className="flex items-start justify-between gap-3 py-3 transition hover:bg-muted/40"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium">
                              {v.konklusion ?? `Afstemning #${v.id}`}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDate(v.opdateringsdato)}
                              {v.vedtaget != null
                                ? ` · ${v.vedtaget ? "Vedtaget" : "Forkastet"}`
                                : ""}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                </ul>
              </CardBody>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
