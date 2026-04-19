import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PoliticianCard } from "@/components/PoliticianCard";
import { SearchBar } from "@/components/SearchBar";
import { fetchCurrentMembers } from "@/lib/oda";
import { PARTIES, resolveParty } from "@/lib/parties";

export const revalidate = 3600;

export const metadata = {
  title: "Alle folketingsmedlemmer",
};

export default async function PoliticiansPage() {
  const members = await fetchCurrentMembers(200).catch(() => []);

  // Gruppér efter parti
  const byParty = new Map<string, typeof members>();
  for (const m of members) {
    const key = m.gruppenavnkort ?? "Ukendt";
    const arr = byParty.get(key) ?? [];
    arr.push(m);
    byParty.set(key, arr);
  }

  // Sortér partier efter officiel rækkefølge (kendte først)
  const partyOrder = Object.keys(PARTIES).filter((k) => k !== "UNKNOWN" && k !== "UFG");
  const sortedParties = Array.from(byParty.entries()).sort(([a], [b]) => {
    const ai = partyOrder.indexOf(resolveParty(a).key);
    const bi = partyOrder.indexOf(resolveParty(b).key);
    if (ai === -1 && bi === -1) return a.localeCompare(b, "da");
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Alle folketingsmedlemmer
        </h1>
        <p className="mt-2 text-muted-foreground">
          {members.length} medlemmer fordelt på {byParty.size} partier. Klik en
          politiker for at se deres stemmehistorik.
        </p>
        <div className="mt-4 max-w-xl">
          <SearchBar />
        </div>
      </section>

      {members.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              Kunne ikke hente medlemmer fra ODA lige nu. Prøv igen om lidt.
            </p>
          </CardBody>
        </Card>
      ) : (
        sortedParties.map(([party, list]) => (
          <section key={party}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {resolveParty(party).name}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({list.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="grid gap-3 sm:grid-cols-2">
                  {list
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
              </CardBody>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
