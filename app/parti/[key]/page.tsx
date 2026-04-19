import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PartyTag } from "@/components/PartyTag";
import { StatsGrid } from "@/components/StatsGrid";
import { PoliticianCard } from "@/components/PoliticianCard";
import { Badge } from "@/components/ui/Badge";
import {
  fetchCurrentMembers,
  fetchRecentVotingsWithVotes,
  getVotingCase,
} from "@/lib/oda";
import { PARTIES, resolveParty, type PartyKey } from "@/lib/parties";
import type { VoteStats } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { key: string };
}): Promise<Metadata> {
  const info = PARTIES[params.key.toUpperCase() as PartyKey];
  return { title: info?.name ?? "Parti" };
}

type BlocVote = "for" | "against" | "split" | "absent";

interface VotingBloc {
  votingId: number;
  title: string;
  date?: string | null;
  vedtaget?: boolean | null;
  caseNumber?: string | null;
  bloc: BlocVote;
  breakdown: VoteStats;
}

export default async function PartyPage({
  params,
}: {
  params: { key: string };
}) {
  const keyUpper = params.key.toUpperCase() as PartyKey;
  const info = PARTIES[keyUpper];
  if (!info || info.key === "UNKNOWN") notFound();

  const [members, votings] = await Promise.all([
    fetchCurrentMembers(250).catch(() => []),
    fetchRecentVotingsWithVotes(20).catch(() => []),
  ]);

  const partyMembers = members.filter(
    (m) => resolveParty(m.gruppenavnkort).key === info.key,
  );

  // Samlet stemmefordeling og bloc-votes pr. afstemning.
  const totals: VoteStats = { for: 0, against: 0, abstain: 0, absent: 0, total: 0 };
  const blocs: VotingBloc[] = [];
  for (const voting of votings) {
    const breakdown: VoteStats = {
      for: 0,
      against: 0,
      abstain: 0,
      absent: 0,
      total: 0,
    };
    for (const stemme of voting.Stemme ?? []) {
      if (resolveParty(stemme.Aktør?.gruppenavnkort).key !== info.key) continue;
      if (stemme.typeid === 1) breakdown.for++;
      else if (stemme.typeid === 2) breakdown.against++;
      else if (stemme.typeid === 3) breakdown.absent++;
      else if (stemme.typeid === 4) breakdown.abstain++;
      breakdown.total++;
    }
    if (breakdown.total === 0) continue;

    totals.for += breakdown.for;
    totals.against += breakdown.against;
    totals.abstain += breakdown.abstain;
    totals.absent += breakdown.absent;
    totals.total += breakdown.total;

    const present = breakdown.for + breakdown.against + breakdown.abstain;
    let bloc: BlocVote = "absent";
    if (present === 0) bloc = "absent";
    else if (breakdown.for > breakdown.against && breakdown.for > breakdown.abstain)
      bloc = "for";
    else if (breakdown.against > breakdown.for && breakdown.against > breakdown.abstain)
      bloc = "against";
    else bloc = "split";

    const sag = getVotingCase(voting);
    blocs.push({
      votingId: voting.id,
      title:
        sag?.titelkort ??
        sag?.titel ??
        voting.konklusion ??
        `Afstemning #${voting.id}`,
      date: voting.opdateringsdato,
      vedtaget: voting.vedtaget,
      caseNumber: sag?.nummer,
      bloc,
      breakdown,
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:gap-6">
          <div
            aria-hidden
            className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-2xl font-bold"
            style={{ backgroundColor: info.color, color: info.textColor }}
          >
            {info.short}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {info.name}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {partyMembers.length} folketingsmedlemmer
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Samlet stemmefordeling · {blocs.length} afstemninger
        </h2>
        {totals.total === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-muted-foreground">
                Ingen stemmer registreret for dette parti i de seneste
                afstemninger.
              </p>
            </CardBody>
          </Card>
        ) : (
          <StatsGrid stats={totals} />
        )}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Bloc-stemmer</CardTitle>
          </CardHeader>
          <CardBody>
            {blocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen bloc-stemmer fundet.
              </p>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Hvordan partiet samlet stemte i hver afstemning. &quot;Splittet&quot;
                  betyder at flertallet ikke var entydigt for eller imod.
                </p>
                <ul className="divide-y divide-border">
                  {blocs.map((b) => (
                    <li key={b.votingId}>
                      <Link
                        href={`/afstemning/${b.votingId}`}
                        className="flex items-start justify-between gap-3 py-3 transition hover:bg-muted/40"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-medium">
                            {b.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(b.date)}
                            {b.caseNumber ? ` · ${b.caseNumber}` : ""}
                            {" · "}
                            {b.breakdown.for}/{b.breakdown.against}/
                            {b.breakdown.abstain}/{b.breakdown.absent} (F/I/A/Fr)
                          </p>
                        </div>
                        <BlocBadge bloc={b.bloc} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Medlemmer</CardTitle>
          </CardHeader>
          <CardBody>
            {partyMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen medlemmer fundet for dette parti.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {partyMembers
                  .sort((a, b) =>
                    (a.efternavn ?? a.navn).localeCompare(
                      b.efternavn ?? b.navn,
                      "da",
                    ),
                  )
                  .map((m) => (
                    <PoliticianCard
                      key={m.id}
                      id={m.id}
                      name={m.navn}
                      party={m.gruppenavnkort}
                    />
                  ))}
              </div>
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

function BlocBadge({ bloc }: { bloc: BlocVote }) {
  if (bloc === "for") return <Badge tone="for">Stemte FOR</Badge>;
  if (bloc === "against") return <Badge tone="against">Stemte IMOD</Badge>;
  if (bloc === "split")
    return <Badge tone="abstain">Splittet</Badge>;
  return <Badge tone="absent">Fraværende</Badge>;
}
