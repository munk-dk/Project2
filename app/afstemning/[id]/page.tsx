import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PartyTag } from "@/components/PartyTag";
import { PartyVoteBar } from "@/components/PartyVoteBar";
import { StatsGrid } from "@/components/StatsGrid";
import { Badge } from "@/components/ui/Badge";
import { aggregateVotes, fetchVoting, getVotingCase } from "@/lib/oda";
import { findRebels } from "@/lib/analytics";
import { RebelList } from "@/components/RebelList";
import { formatDate } from "@/lib/utils";
import {
  VOTE_LABEL,
  VOTE_TONE,
  type PartyVoteStats,
  type VoteType,
} from "@/lib/types";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return { title: "Afstemning" };
  const voting = await fetchVoting(id).catch(() => null);
  const sag = voting ? getVotingCase(voting) : null;
  return {
    title:
      sag?.titelkort ??
      sag?.titel ??
      `Afstemning #${params.id}`,
  };
}

function groupByParty(
  votes: { typeid: number; Aktør?: { gruppenavnkort?: string | null } | null }[],
): PartyVoteStats[] {
  const byParty = new Map<string, PartyVoteStats>();
  for (const v of votes) {
    const key = v.Aktør?.gruppenavnkort ?? "Ukendt";
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
    if (v.typeid === 1) row.for++;
    else if (v.typeid === 2) row.against++;
    else if (v.typeid === 3) row.absent++;
    else if (v.typeid === 4) row.abstain++;
    row.total++;
    byParty.set(key, row);
  }
  return Array.from(byParty.values()).sort((a, b) => b.total - a.total);
}

export default async function VotingPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const voting = await fetchVoting(id);
  if (!voting) notFound();

  const votes = voting.Stemme ?? [];
  const stats = aggregateVotes(votes);
  const partyStats = groupByParty(votes);
  const sag = getVotingCase(voting);
  const rebels = findRebels(voting);

  const title =
    sag?.titelkort ??
    sag?.titel ??
    voting.konklusion ??
    `Afstemning #${voting.id}`;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDate(voting.opdateringsdato)}</span>
          {sag?.nummer && <span>· {sag.nummer}</span>}
          {voting.vedtaget != null && (
            <span
              className={`rounded px-2 py-0.5 font-medium ${
                voting.vedtaget
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {voting.vedtaget ? "Vedtaget" : "Forkastet"}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
        {sag?.resume && (
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            {sag.resume.replace(/<[^>]+>/g, " ").slice(0, 600)}
          </p>
        )}
        {voting.konklusion && voting.konklusion !== title && (
          <p className="mt-3 rounded-md bg-muted/60 p-3 text-sm">
            <strong>Konklusion: </strong>
            {voting.konklusion}
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Samlet resultat
        </h2>
        <StatsGrid stats={stats} />
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Partivis oversigt</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {partyStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen partidata for denne afstemning.
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
            <CardTitle>
              Rebeller{rebels.length > 0 ? ` (${rebels.length})` : ""}
            </CardTitle>
          </CardHeader>
          <CardBody>
            <p className="mb-3 text-sm text-muted-foreground">
              Folketingsmedlemmer der stemte imod deres eget partis flertal.
            </p>
            <RebelList rebels={rebels} />
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Alle individuelle stemmer</CardTitle>
          </CardHeader>
          <CardBody>
            {votes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen individuelle stemmer tilgængelige.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {votes.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/politiker/${v.aktørid}`}
                        className="truncate font-medium hover:underline"
                      >
                        {v.Aktør?.navn ?? `Aktør #${v.aktørid}`}
                      </Link>
                    </div>
                    <PartyTag party={v.Aktør?.gruppenavnkort ?? null} />
                    <Badge tone={VOTE_TONE[v.typeid as VoteType]}>
                      {VOTE_LABEL[v.typeid as VoteType]}
                    </Badge>
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
