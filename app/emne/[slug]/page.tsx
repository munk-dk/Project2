import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PartyComparisonTable } from "@/components/PartyComparisonTable";
import {
  extractTags,
  fetchVotingsByCaseQuery,
  getVotingCase,
  searchCases,
} from "@/lib/oda";
import { cacheCase } from "@/lib/cache";
import { formatDate } from "@/lib/utils";
import { searchTermsForTopic, topicBySlug } from "@/lib/topics";
import type { OdaVoting, PartyVoteStats } from "@/lib/types";
import { PARTIES, resolveParty, type PartyKey } from "@/lib/parties";
import {
  distinctParties,
  findRebels,
  mostActiveParty,
  partyBlocVote,
  votingsByMonth,
} from "@/lib/analytics";
import { RebelList } from "@/components/RebelList";

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
    .filter((r) => r.total > 0 && resolveParty(r.party).key !== "UNKNOWN")
    .sort((a, b) => b.total - a.total);
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

  // Dashboard-tal.
  const vedtagetCount = votings.filter((v) => v.vedtaget === true).length;
  const forkastetCount = votings.filter((v) => v.vedtaget === false).length;
  const topParty = mostActiveParty(votings);
  const timeline = votingsByMonth(votings).slice(-12);
  const maxMonth = timeline.reduce((m, x) => Math.max(m, x.count), 0) || 1;

  // Find rebeller på tværs af alle afstemninger i emnet.
  const topicRebels = votings.flatMap((v) =>
    findRebels(v).map((r) => ({ ...r, votingId: v.id })),
  );
  const rebelCounts = new Map<number, { name: string; party: string; count: number }>();
  for (const r of topicRebels) {
    const ex = rebelCounts.get(r.actorId);
    if (ex) ex.count++;
    else rebelCounts.set(r.actorId, { name: r.actorName, party: r.party, count: 1 });
  }
  const topTopicRebels = Array.from(rebelCounts.entries())
    .map(([actorId, v]) => ({ actorId, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Bloc-linje pr. parti i dette emne.
  const topicParties = distinctParties(votings);
  const blocByParty = new Map<
    string,
    { for: number; against: number; split: number; absent: number }
  >();
  for (const p of topicParties) {
    const summary = { for: 0, against: 0, split: 0, absent: 0 };
    for (const v of votings) {
      const bloc = partyBlocVote(v, p).bloc;
      summary[bloc]++;
    }
    blocByParty.set(p, summary);
  }

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
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <DashboardTile
            label="Afstemninger"
            value={votings.length}
            hint={`${cases.length} sager`}
          />
          <DashboardTile
            label="Vedtaget"
            value={vedtagetCount}
            hint={`${forkastetCount} forkastet`}
            tone="for"
          />
          <DashboardTile
            label="Mest aktive parti"
            value={
              topParty
                ? (PARTIES[topParty as PartyKey]?.short ?? topParty)
                : "–"
            }
            hint={
              topParty
                ? (PARTIES[topParty as PartyKey]?.name ?? "")
                : "Ingen data"
            }
            color={topParty ? PARTIES[topParty as PartyKey]?.color : undefined}
          />
          <DashboardTile
            label="Rebelstemmer"
            value={topicRebels.length}
            hint={`${rebelCounts.size} forskellige MF'ere`}
          />
        </div>
      </section>

      {timeline.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Aktivitet pr. måned</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="flex items-end gap-1.5">
                {timeline.map((m) => (
                  <div
                    key={m.month}
                    className="flex flex-1 flex-col items-center"
                    title={`${m.month}: ${m.count} afstemninger`}
                  >
                    <div
                      className="w-full rounded-t bg-blue-500/80"
                      style={{ height: `${(m.count / maxMonth) * 80 + 4}px` }}
                    />
                    <span className="mt-1 text-[10px] text-muted-foreground">
                      {m.month.slice(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </section>
      )}

      {blocByParty.size > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Partiernes linje på dette emne</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="mb-3 text-sm text-muted-foreground">
                Hvor mange afstemninger har hvert parti samlet stemt for, imod,
                været splittet eller fraværende i?
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="pb-2 pr-2">Parti</th>
                      <th className="pb-2 pr-2 text-right">FOR</th>
                      <th className="pb-2 pr-2 text-right">IMOD</th>
                      <th className="pb-2 pr-2 text-right">Splittet</th>
                      <th className="pb-2 text-right">Fraværende</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(blocByParty.entries())
                      .sort(
                        ([, a], [, b]) =>
                          b.for + b.against - (a.for + a.against),
                      )
                      .map(([p, s]) => {
                        const info = PARTIES[p as PartyKey];
                        return (
                          <tr key={p} className="border-t border-border">
                            <td className="py-2 pr-2">
                              <Link
                                href={`/parti/${p}`}
                                className="font-semibold hover:underline"
                                style={{ color: info?.color }}
                              >
                                {info?.short ?? p}
                              </Link>
                            </td>
                            <td className="py-2 pr-2 text-right text-green-700">
                              {s.for}
                            </td>
                            <td className="py-2 pr-2 text-right text-red-700">
                              {s.against}
                            </td>
                            <td className="py-2 pr-2 text-right text-amber-700">
                              {s.split}
                            </td>
                            <td className="py-2 text-right text-muted-foreground">
                              {s.absent}
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

      {topTopicRebels.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Rebeller på emnet</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="mb-3 text-sm text-muted-foreground">
                MF&apos;ere der oftest stemte imod deres partis flertal på dette
                emne.
              </p>
              <ul className="divide-y divide-border">
                {topTopicRebels.map((r) => {
                  const info = PARTIES[r.party as PartyKey];
                  return (
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
                        <span
                          className="rounded px-2 py-0.5 text-xs font-semibold"
                          style={{
                            backgroundColor: info?.color,
                            color: info?.textColor,
                          }}
                        >
                          {info?.short ?? r.party}
                        </span>
                        <span className="min-w-[2rem] text-right font-semibold">
                          {r.count}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        </section>
      )}

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
                {votings.slice(0, 30).map((v) => {
                  const sag = getVotingCase(v);
                  return (
                    <li key={v.id}>
                      <Link
                        href={`/afstemning/${v.id}`}
                        className="block py-3 transition hover:bg-muted/40"
                      >
                        <p className="line-clamp-2 font-medium">
                          {sag?.titelkort ??
                            sag?.titel ??
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
            )}
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              Se også{" "}
              <Link href="/partier/matrix" className="underline">
                enigheds-matrix mellem partier
              </Link>
              {" eller "}
              <Link href="/analyse/rebeller" className="underline">
                alle rebeller
              </Link>
              .
            </p>
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
              <ul className="divide-y divide-border">
                {cases.slice(0, 20).map((c) => (
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
            )}
          </CardBody>
        </Card>
      </section>
    </div>
  );
}

function DashboardTile({
  label,
  value,
  hint,
  tone,
  color,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "for" | "against";
  color?: string;
}) {
  const valueColor =
    color ??
    (tone === "for"
      ? "#15803d"
      : tone === "against"
        ? "#b91c1c"
        : "#1f2937");
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold" style={{ color: valueColor }}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
