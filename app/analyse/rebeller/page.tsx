import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PartyTag } from "@/components/PartyTag";
import { Badge } from "@/components/ui/Badge";
import { fetchManyVotingsWithVotes, getVotingCase } from "@/lib/oda";
import { findRebels, type Rebel } from "@/lib/analytics";
import { VOTE_LABEL, VOTE_TONE, type VoteType } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const revalidate = 3600;

export const metadata = {
  title: "Rebeller i Folketinget",
};

interface RebelEntry {
  rebel: Rebel;
  votingId: number;
  title: string;
  date?: string | null;
}

export default async function RebelsPage() {
  const votings = await fetchManyVotingsWithVotes(80, 20).catch(() => []);

  const entries: RebelEntry[] = [];
  const counts = new Map<number, { name: string; party: string; count: number }>();

  for (const v of votings) {
    const rebels = findRebels(v);
    if (rebels.length === 0) continue;
    const sag = getVotingCase(v);
    const title =
      sag?.titelkort ?? sag?.titel ?? v.konklusion ?? `Afstemning #${v.id}`;
    for (const r of rebels) {
      entries.push({ rebel: r, votingId: v.id, title, date: v.opdateringsdato });
      const existing = counts.get(r.actorId);
      if (existing) existing.count++;
      else
        counts.set(r.actorId, {
          name: r.actorName,
          party: r.party,
          count: 1,
        });
    }
  }

  const topRebels = Array.from(counts.entries())
    .map(([actorId, v]) => ({ actorId, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Saml pr. afstemning.
  const byVoting = new Map<
    number,
    { title: string; date?: string | null; rebels: Rebel[] }
  >();
  for (const e of entries) {
    const row = byVoting.get(e.votingId) ?? {
      title: e.title,
      date: e.date,
      rebels: [],
    };
    row.rebels.push(e.rebel);
    byVoting.set(e.votingId, row);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Analyse
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          Rebeller i Folketinget
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Folketingsmedlemmer der har stemt imod deres eget partis flertal. Her
          ser du dem fra de seneste {votings.length} afstemninger. Når et parti
          er splittet, er ingen &quot;rebel&quot;.
        </p>
        <p className="mt-3 text-sm">
          <strong>{entries.length}</strong> rebelstemmer fundet fordelt på{" "}
          <strong>{byVoting.size}</strong> afstemninger.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top rebeller (flest brud)</CardTitle>
          </CardHeader>
          <CardBody>
            {topRebels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen rebeller fundet i de seneste afstemninger.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {topRebels.map((r) => (
                  <li
                    key={r.actorId}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <Link
                      href={`/politiker/${r.actorId}`}
                      className="truncate font-medium hover:underline"
                    >
                      {r.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <PartyTag party={r.party} />
                      <span className="min-w-[2rem] text-right font-semibold">
                        {r.count}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hvad er en rebel?</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-muted-foreground">
            <p>
              En <strong>rebel</strong> er en folketingsmedlem der afgiver en
              stemme (for eller imod) der går imod partiets klare flertal i
              samme afstemning.
            </p>
            <p>
              Fraværende og afstår tælles ikke som rebelstemme. Hvis partiet
              selv er splittet, regnes ingen som rebel.
            </p>
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Afstemninger med rebeller</CardTitle>
          </CardHeader>
          <CardBody>
            {byVoting.size === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen afstemninger med rebeller fundet.
              </p>
            ) : (
              <ul className="space-y-5">
                {Array.from(byVoting.entries())
                  .sort(([, a], [, b]) =>
                    (b.date ?? "").localeCompare(a.date ?? ""),
                  )
                  .map(([votingId, v]) => (
                    <li key={votingId}>
                      <Link
                        href={`/afstemning/${votingId}`}
                        className="block font-medium hover:underline"
                      >
                        {v.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(v.date)} · {v.rebels.length} rebelstemmer
                      </p>
                      <ul className="mt-2 divide-y divide-border rounded-md border border-border">
                        {v.rebels.map((r) => (
                          <li
                            key={`${r.actorId}-${r.voteType}`}
                            className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/politiker/${r.actorId}`}
                                className="truncate font-medium hover:underline"
                              >
                                {r.actorName}
                              </Link>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                Partiet stemte{" "}
                                <strong>
                                  {r.partyMajority === "for" ? "FOR" : "IMOD"}
                                </strong>
                              </p>
                            </div>
                            <PartyTag party={r.party} />
                            <Badge tone={VOTE_TONE[r.voteType as VoteType]}>
                              {VOTE_LABEL[r.voteType as VoteType]}
                            </Badge>
                          </li>
                        ))}
                      </ul>
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
