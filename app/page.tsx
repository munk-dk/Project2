import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PartyTag } from "@/components/PartyTag";
import {
  fetchRecentVotings,
  fetchRecentVotingsWithVotes,
  getVotingCase,
} from "@/lib/oda";
import { findRebels } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";
import { TOPICS } from "@/lib/topics";

export const revalidate = 3600;

export default async function HomePage() {
  const [votings, votingsWithVotes] = await Promise.all([
    fetchRecentVotings(20).catch(() => []),
    fetchRecentVotingsWithVotes(15).catch(() => []),
  ]);

  // Ugens rebeller: saml rebelstemmer fra seneste afstemninger.
  const rebelCounts = new Map<number, { name: string; party: string; count: number }>();
  for (const v of votingsWithVotes) {
    for (const r of findRebels(v)) {
      const ex = rebelCounts.get(r.actorId);
      if (ex) ex.count++;
      else
        rebelCounts.set(r.actorId, {
          name: r.actorName,
          party: r.party,
          count: 1,
        });
    }
  }
  const topRebels = Array.from(rebelCounts.entries())
    .map(([actorId, v]) => ({ actorId, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm md:p-10">
        <h1 className="text-2xl font-bold tracking-tight md:text-4xl">
          Folketingets afstemninger – for alle
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground md:text-lg">
          Søg en politiker og se hvordan de har stemt. Søg et emne og se hvor
          partierne står. Gratis og baseret på åbne data fra Folketinget.
        </p>
        <div className="mt-6 max-w-2xl">
          <SearchBar />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link
            href="/partier"
            className="rounded-full border border-border bg-white px-3 py-1.5 font-medium text-foreground transition hover:bg-muted/40"
          >
            Sådan stemmer partierne →
          </Link>
          <Link
            href="/politikere"
            className="rounded-full border border-border bg-white px-3 py-1.5 font-medium text-foreground transition hover:bg-muted/40"
          >
            Alle folketingsmedlemmer →
          </Link>
          <Link
            href="/emner"
            className="rounded-full border border-border bg-white px-3 py-1.5 font-medium text-foreground transition hover:bg-muted/40"
          >
            Alle emner →
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Analyse &amp; overblik
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/partier/matrix"
            className="group rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="text-2xl" aria-hidden>
              🧮
            </div>
            <p className="mt-2 font-medium">Enigheds-matrix</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Hvor ofte stemmer hvert partipar ens?
            </p>
          </Link>
          <Link
            href="/analyse/rebeller"
            className="group rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="text-2xl" aria-hidden>
              🚩
            </div>
            <p className="mt-2 font-medium">Rebeller</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              MF&apos;ere der stemmer imod partilinjen.
            </p>
          </Link>
          <Link
            href="/partier"
            className="group rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="text-2xl" aria-hidden>
              📊
            </div>
            <p className="mt-2 font-medium">Parti-DNA</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Vælg et parti og se linje pr. emne.
            </p>
          </Link>
          <Link
            href="/emner"
            className="group rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="text-2xl" aria-hidden>
              📌
            </div>
            <p className="mt-2 font-medium">Emne-dashboards</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Nøgletal, linje og rebeller pr. emne.
            </p>
          </Link>
        </div>
      </section>

      {topRebels.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Ugens rebeller</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="mb-3 text-sm text-muted-foreground">
                Folketingsmedlemmer der oftest har stemt imod deres partis
                flertal i de seneste afstemninger.
              </p>
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
                        {r.count}×
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-right">
                <Link
                  href="/analyse/rebeller"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Se alle rebeller →
                </Link>
              </div>
            </CardBody>
          </Card>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Udforsk efter emne
          </h2>
          <Link
            href="/emner"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Se alle emner →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {TOPICS.slice(0, 8).map((t) => (
            <Link
              key={t.slug}
              href={`/emne/${t.slug}`}
              className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="text-2xl" aria-hidden>
                {t.emoji}
              </div>
              <p className="mt-2 font-medium">{t.name}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {t.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Seneste afstemninger
          </h2>
          <p className="text-sm text-muted-foreground">
            {votings.length} afstemninger
          </p>
        </div>

        {votings.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-muted-foreground">
                Kunne ikke hente afstemninger lige nu. Prøv igen om lidt.
              </p>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {votings.map((v) => {
                const sag = getVotingCase(v);
                return (
                  <li key={v.id}>
                    <Link
                      href={`/afstemning/${v.id}`}
                      className="flex items-start justify-between gap-3 px-5 py-4 transition hover:bg-muted/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-medium">
                          {sag?.titelkort ??
                            sag?.titel ??
                            v.konklusion ??
                            `Afstemning #${v.id}`}
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
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Sådan bruger du Politisk Radar</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Søg på et navn</strong> for at
              se en politikers stemmehistorik.
            </p>
            <p>
              <strong className="text-foreground">Søg på et emne</strong> som
              &quot;klima&quot; eller &quot;skat&quot; for at se hvordan
              partierne samlet har stemt.
            </p>
            <p>
              <strong className="text-foreground">Klik en afstemning</strong>{" "}
              for at se hvert enkelt folketingsmedlems stemme.
            </p>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
