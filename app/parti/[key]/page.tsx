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
import { findRebels, partyBlocVote } from "@/lib/analytics";
import { TOPICS, searchTermsForTopic } from "@/lib/topics";

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
    fetchRecentVotingsWithVotes(60).catch(() => []),
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

  // Parti-DNA: klassificér hver afstemning ind under kendte emner via titel-match,
  // og tæl for/imod/splittet pr. emne for dette parti.
  type TopicDna = {
    slug: string;
    name: string;
    emoji?: string;
    for: number;
    against: number;
    split: number;
    absent: number;
    total: number;
  };
  const dna: TopicDna[] = TOPICS.map((t) => ({
    slug: t.slug,
    name: t.name,
    emoji: t.emoji,
    for: 0,
    against: 0,
    split: 0,
    absent: 0,
    total: 0,
  }));
  for (const voting of votings) {
    const sag = getVotingCase(voting);
    const haystack = `${sag?.titel ?? ""} ${sag?.titelkort ?? ""} ${
      voting.konklusion ?? ""
    }`.toLowerCase();
    if (!haystack.trim()) continue;
    const { bloc } = partyBlocVote(voting, info.key);
    for (const row of dna) {
      const terms = searchTermsForTopic(row.slug);
      const matched = terms.some((t) => haystack.includes(t.toLowerCase()));
      if (!matched) continue;
      row[bloc]++;
      row.total++;
    }
  }
  const dnaRows = dna.filter((r) => r.total > 0);

  // Rebeller fra eget parti på tværs af seneste afstemninger.
  const ownRebels = votings.flatMap((v) =>
    findRebels(v)
      .filter((r) => r.party === info.key)
      .map((r) => ({ ...r, votingId: v.id })),
  );
  const rebelCounts = new Map<number, { name: string; count: number }>();
  for (const r of ownRebels) {
    const ex = rebelCounts.get(r.actorId);
    if (ex) ex.count++;
    else rebelCounts.set(r.actorId, { name: r.actorName, count: 1 });
  }
  const topOwnRebels = Array.from(rebelCounts.entries())
    .map(([actorId, v]) => ({ actorId, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

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

      {dnaRows.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Parti-DNA pr. emne</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="mb-3 text-sm text-muted-foreground">
                Hvordan har <strong>{info.name}</strong> samlet stemt på hvert
                emne? Baseret på {blocs.length} seneste afstemninger, klassificeret
                efter titel. Klik et emne for dybdegående overblik.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-2 pr-2">Emne</th>
                      <th className="pb-2 pr-2 text-right">FOR</th>
                      <th className="pb-2 pr-2 text-right">IMOD</th>
                      <th className="pb-2 pr-2 text-right">Splittet</th>
                      <th className="pb-2 pr-2 text-right">Fravær</th>
                      <th className="pb-2 text-right">Linje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dnaRows
                      .sort((a, b) => b.total - a.total)
                      .map((r) => {
                        const present = r.for + r.against;
                        const lean =
                          present === 0
                            ? 0
                            : Math.round((r.for / present) * 100);
                        return (
                          <tr key={r.slug} className="border-t border-border">
                            <td className="py-2 pr-2">
                              <Link
                                href={`/emne/${r.slug}`}
                                className="inline-flex items-center gap-1.5 hover:underline"
                              >
                                {r.emoji && <span aria-hidden>{r.emoji}</span>}
                                <span>{r.name}</span>
                              </Link>
                            </td>
                            <td className="py-2 pr-2 text-right text-green-700">
                              {r.for}
                            </td>
                            <td className="py-2 pr-2 text-right text-red-700">
                              {r.against}
                            </td>
                            <td className="py-2 pr-2 text-right text-amber-700">
                              {r.split}
                            </td>
                            <td className="py-2 pr-2 text-right text-muted-foreground">
                              {r.absent}
                            </td>
                            <td className="py-2 text-right">
                              <LeanBar leanFor={lean} />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </section>
      )}

      {topOwnRebels.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Rebeller i {info.short}</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="mb-3 text-sm text-muted-foreground">
                Medlemmer der oftest har stemt imod partiets flertal.
              </p>
              <ul className="divide-y divide-border">
                {topOwnRebels.map((r) => (
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
                    <span className="font-semibold">{r.count}×</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </section>
      )}

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

// Viser en kompakt bar 0–100% hvor højre er FOR.
function LeanBar({ leanFor }: { leanFor: number }) {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative h-2 w-24 overflow-hidden rounded-full bg-red-100">
        <div
          className="absolute inset-y-0 left-0 bg-green-500"
          style={{ width: `${leanFor}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs text-muted-foreground">
        {leanFor}%
      </span>
    </div>
  );
}
