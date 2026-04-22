import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PartyVoteBar } from "@/components/PartyVoteBar";
import { fetchRecentVotingsWithVotes } from "@/lib/oda";
import { PARTIES, resolveParty } from "@/lib/parties";
import type { PartyVoteStats } from "@/lib/types";

export const revalidate = 3600;

export const metadata = {
  title: "Alle partier",
};

// Hent de seneste afstemninger med individuelle stemmer og aggreger pr. parti.
async function loadPartyStats(): Promise<{
  stats: PartyVoteStats[];
  votingsCount: number;
}> {
  const votings = await fetchRecentVotingsWithVotes(30).catch(() => []);

  const byParty = new Map<string, PartyVoteStats>();
  for (const voting of votings) {
    for (const stemme of voting.Stemme ?? []) {
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
  }

  const partyOrder = Object.keys(PARTIES).filter(
    (k) => k !== "UNKNOWN" && k !== "UFG",
  );
  const stats = Array.from(byParty.values())
    .filter((r) => r.total > 0 && resolveParty(r.party).key !== "UNKNOWN")
    .sort((a, b) => {
      const ak = resolveParty(a.party).key;
      const bk = resolveParty(b.party).key;
      const ai = partyOrder.indexOf(ak);
      const bi = partyOrder.indexOf(bk);
      if (ai === -1 && bi === -1) return b.total - a.total;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  return { stats, votingsCount: votings.length };
}

export default async function PartiesPage() {
  const { stats, votingsCount } = await loadPartyStats();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Sådan stemmer partierne
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Samlet stemmefordeling pr. parti på tværs af de seneste{" "}
          {votingsCount} afstemninger i Folketinget. Klik et parti for at se
          medlemmer og bloc-stemmer.
        </p>
      </section>

      {stats.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              Kunne ikke hente data fra ODA lige nu. Prøv igen om lidt.
            </p>
          </CardBody>
        </Card>
      ) : (
        <section>
          <Card>
            <CardBody className="space-y-6">
              {stats.map((row) => (
                <Link
                  key={row.party}
                  href={`/parti/${resolveParty(row.party).key}`}
                  className="block rounded-lg p-3 -m-3 transition hover:bg-muted/40"
                >
                  <PartyVoteBar party={row.party} stats={row} />
                </Link>
              ))}
            </CardBody>
          </Card>
        </section>
      )}
    </div>
  );
}
