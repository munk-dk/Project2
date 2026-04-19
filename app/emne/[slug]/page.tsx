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
import { searchTermsForTopic, topicBySlug } from "@/lib/topics";
import type { OdaVoting, PartyVoteStats } from "@/lib/types";
import { resolveParty } from "@/lib/parties";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const topic = topicBySlug(params.slug);
  const title =
    topic?.name ?? decodeURIComponent(params.slug).replace(/-/g, " ");
  return { title: `Emne: ${title}` };
}

function aggregateParties(votings: OdaVoting[]): PartyVoteStats[] {
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
  // Filtrér tomme og sortér efter partis officielle farveliste
  return Array.from(byParty.values())
    .filter((r) => r.total > 0)
    .sort((a, b) => {
      const ak = resolveParty(a.party).key;
      const bk = resolveParty(b.party).key;
      if (ak === "UNKNOWN" && bk !== "UNKNOWN") return 1;
      if (bk === "UNKNOWN" && ak !== "UNKNOWN") return -1;
      return b.total - a.total;
    });
}

export default async function TopicPage({
  params,
}: {
  params: { slug: string };
}) {
  const topic = topicBySlug(params.slug);
  const displayName =
    topic?.name ?? decodeURIComponent(params.slug).replace(/-/g, " ");
  const searchTerms = searchTermsForTopic(params.slug);

  // Hent sager og afstemninger for hver søgeterm og flet dem.
  const results = await Promise.all(
    searchTerms.map((term) =>
      Promise.all([
        searchCases(term, 15).catch(() => []),
        fetchVotingsByCaseQuery(term, 10).catch(() => []),
      ]),
    ),
  );

  const casesMap = new Map<number, (typeof results)[0][0][0]>();
  const votingsMap = new Map<number, OdaVoting>();
  for (const [cases, votings] of results) {
    for (const c of cases) casesMap.set(c.id, c);
    for (const v of votings) votingsMap.set(v.id, v);
  }
  const cases = Array.from(casesMap.values());
  const votings = Array.from(votingsMap.values()).sort((a, b) => {
    const ad = a.opdateringsdato ?? "";
    const bd = b.opdateringsdato ?? "";
    return bd.localeCompare(ad);
  });

  await Promise.all(
    cases.map((c) => cacheCase(c, extractTags(c.titel))),
  ).catch(() => undefined);

  const partyRows = aggregateParties(votings);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Emne
        </p>
        <div className="mt-1 flex items-start gap-3">
          {topic?.emoji && (
            <span className="text-3xl" aria-hidden>
              {topic.emoji}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {displayName}
            </h1>
            {topic?.description && (
              <p className="mt-1 text-muted-foreground">{topic.description}</p>
            )}
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {cases.length} sager og {votings.length} afstemninger fundet.
        </p>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Sådan har partierne stemt samlet</CardTitle>
          </CardHeader>
          <CardBody>
            {partyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen partistemmer fundet. Prøv et andet emne eller søgeord.
              </p>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Tallene er summen af alle individuelle stemmer på tværs af{" "}
                  {votings.length} afstemninger om dette emne. Klik en kolonne
                  for at sortere.
                </p>
                <PartyComparisonTable rows={partyRows} />
              </>
            )}
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Afstemninger</CardTitle>
          </CardHeader>
          <CardBody>
            {votings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen afstemninger fundet for &quot;{displayName}&quot;.
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
                Ingen sager fundet.
              </p>
            ) : (
              <ul className="space-y-3">
                {cases.slice(0, 20).map((c) => (
                  <li key={c.id} className="text-sm">
                    <p className="font-medium">{c.titelkort ?? c.titel}</p>
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
