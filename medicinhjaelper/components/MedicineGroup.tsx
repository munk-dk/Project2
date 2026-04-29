import { MedicineCard } from "./MedicineCard";
import { SavingsHighlight } from "./SavingsHighlight";
import type { MedicineGroupData } from "@/lib/types";

interface Props {
  group: MedicineGroupData;
}

export function MedicineGroup({ group }: Props) {
  const visBesparelse =
    group.maxBesparelseKr >= 1 && group.alternativer.length > 0;

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-ink sm:text-2xl">
            {group.overskrift}
          </h2>
          <p className="mt-0.5 text-ink-muted">
            Samme virkning — vælg den der passer din pung.
            {group.atc ? (
              <span className="ml-2 text-sm text-ink-subtle">
                ATC {group.atc}
              </span>
            ) : null}
          </p>
        </div>
        {visBesparelse ? (
          <SavingsHighlight
            besparelseKr={group.maxBesparelseKr}
            besparelseProcent={group.besparelseProcent}
            compact
          />
        ) : null}
      </header>

      {group.original ? (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-subtle">
            Originalpræparat
          </h3>
          <MedicineCard
            medicine={group.original}
            variant={
              group.billigste === group.original ? "billigste" : "original"
            }
          />
        </div>
      ) : null}

      {group.alternativer.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-subtle">
            {group.original ? "Andre pakninger med samme virkning" : "Tilgængelige pakninger"}
            <span className="ml-2 font-normal normal-case text-ink-subtle">
              · sorteret billigste først
            </span>
          </h3>
          <ul className="space-y-3">
            {group.alternativer.map((m) => (
              <li key={m.varenummer}>
                <MedicineCard
                  medicine={m}
                  variant={
                    group.billigste?.varenummer === m.varenummer
                      ? "billigste"
                      : "alternativ"
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
