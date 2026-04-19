import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PartyTag } from "@/components/PartyTag";
import { StatsGrid } from "@/components/StatsGrid";
import { VoteList, type VoteListItem } from "@/components/VoteList";
import {
  aggregateVotes,
  fetchActor,
  fetchVotesForActor,
  getVotingCase,
} from "@/lib/oda";
import { initials } from "@/lib/utils";
import { resolveParty } from "@/lib/parties";
import { cacheMember, getCachedMember } from "@/lib/cache";
import type { VoteType } from "@/lib/types";

export const revalidate = 3600;

async function loadActor(id: number) {
  const cached = await getCachedMember(id);
  if (cached) return cached;
  const actor = await fetchActor(id);
  if (actor) await cacheMember(actor);
  return actor;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return { title: "Politiker" };
  const actor = await loadActor(id).catch(() => null);
  return { title: actor?.navn ?? "Politiker" };
}

export default async function PoliticianPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const [actor, votes] = await Promise.all([
    loadActor(id),
    fetchVotesForActor(id, 50).catch(() => []),
  ]);

  if (!actor) notFound();

  const stats = aggregateVotes(votes);
  const info = resolveParty(actor.gruppenavnkort);

  const items: VoteListItem[] = votes.map((v) => {
    const sag = v.Afstemning ? getVotingCase(v.Afstemning) : null;
    return {
      voteId: v.id,
      votingId: v.afstemningid,
      typeid: v.typeid as VoteType,
      title:
        sag?.titelkort ??
        sag?.titel ??
        v.Afstemning?.konklusion ??
        `Afstemning #${v.afstemningid}`,
      date: v.Afstemning?.opdateringsdato ?? v.opdateringsdato,
      caseNumber: sag?.nummer,
    };
  });

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6 shadow-sm md:flex-row md:items-center md:gap-6">
        <div
          aria-hidden
          className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-2xl font-bold"
          style={{ backgroundColor: info.color, color: info.textColor }}
        >
          {initials(actor.navn)}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {actor.navn}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <PartyTag party={actor.gruppenavnkort} full />
          </div>
          {actor.biografi && (
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground line-clamp-3">
              {actor.biografi.replace(/<[^>]+>/g, " ").slice(0, 400)}
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Stemmestatistik
        </h2>
        <StatsGrid stats={stats} />
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Seneste afstemninger</CardTitle>
          </CardHeader>
          <CardBody>
            <VoteList votes={items} />
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
