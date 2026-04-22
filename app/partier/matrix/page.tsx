import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { AgreementMatrix } from "@/components/AgreementMatrix";
import { fetchRecentVotingsWithVotes } from "@/lib/oda";
import { agreementMatrix, distinctParties } from "@/lib/analytics";
import { PARTIES, type PartyKey } from "@/lib/parties";

export const revalidate = 3600;

export const metadata = {
  title: "Enigheds-matrix",
};

// Foretrukken rækkefølge: de største partier først, så mindre/øvrige.
const PARTY_ORDER: PartyKey[] = [
  "S",
  "V",
  "M",
  "SF",
  "DF",
  "DD",
  "LA",
  "KF",
  "EL",
  "RV",
  "ALT",
];

export default async function MatrixPage() {
  const votings = await fetchRecentVotingsWithVotes(15).catch(() => []);
  const parties = distinctParties(votings).filter((p) => p !== "UFG");
  const ordered = PARTY_ORDER.filter((p) => parties.includes(p));
  // Tilføj evt. partier vi ikke har i PARTY_ORDER til sidst.
  for (const p of parties) {
    if (!ordered.includes(p as PartyKey)) ordered.push(p as PartyKey);
  }
  const cells = agreementMatrix(votings, ordered);

  // Find tætteste og fjerneste par (ekskl. diagonalen)
  const pairs = cells.filter((c) => c.a !== c.b && c.compared > 0);
  const closest = [...pairs].sort((a, b) => b.percent - a.percent).slice(0, 5);
  const farthest = [...pairs].sort((a, b) => a.percent - b.percent).slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Analyse
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          Enigheds-matrix
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Hvor ofte stemmer to partier ens? Tallet er den procentdel af{" "}
          {votings.length} seneste afstemninger hvor begge partier samlet stemte
          ens (enten for, imod eller begge splittet). Fraværende afstemninger
          tælles ikke med.
        </p>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Matrix</CardTitle>
          </CardHeader>
          <CardBody>
            {ordered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ingen partidata tilgængelig.
              </p>
            ) : (
              <AgreementMatrix parties={ordered} cells={cells} />
            )}
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mest enige partipar</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-border">
              {closest.map((c) => (
                <li key={`c-${c.a}-${c.b}`} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <strong style={{ color: PARTIES[c.a as PartyKey]?.color }}>
                      {PARTIES[c.a as PartyKey]?.short ?? c.a}
                    </strong>
                    {" + "}
                    <strong style={{ color: PARTIES[c.b as PartyKey]?.color }}>
                      {PARTIES[c.b as PartyKey]?.short ?? c.b}
                    </strong>
                  </span>
                  <span className="font-semibold">{c.percent}%</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mest uenige partipar</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="divide-y divide-border">
              {farthest.map((c) => (
                <li key={`f-${c.a}-${c.b}`} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <strong style={{ color: PARTIES[c.a as PartyKey]?.color }}>
                      {PARTIES[c.a as PartyKey]?.short ?? c.a}
                    </strong>
                    {" + "}
                    <strong style={{ color: PARTIES[c.b as PartyKey]?.color }}>
                      {PARTIES[c.b as PartyKey]?.short ?? c.b}
                    </strong>
                  </span>
                  <span className="font-semibold">{c.percent}%</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </section>

      <section>
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              Se også{" "}
              <Link href="/partier" className="underline">
                samlet partioversigt
              </Link>
              {" eller "}
              <Link href="/analyse/rebeller" className="underline">
                rebeller pr. afstemning
              </Link>
              .
            </p>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
