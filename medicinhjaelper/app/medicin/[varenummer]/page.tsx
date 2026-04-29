import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ABCBadge, ABCExplainer } from "@/components/ABCBadge";
import { MedicineCard } from "@/components/MedicineCard";
import { SavingsHighlight } from "@/components/SavingsHighlight";
import { SubsidyExplainer } from "@/components/SubsidyExplainer";
import {
  abcForklaring,
  getMedicine,
  getMedicineWithAlternatives,
} from "@/lib/medicine";
import { formatKr } from "@/lib/utils";
import type { SubstitutionCategory } from "@/lib/types";

export const revalidate = 3600;

interface PageProps {
  params: { varenummer: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const m = await getMedicine(params.varenummer);
  if (!m) return { title: "Medicin ikke fundet" };
  return {
    title: `${m.navn} ${m.styrke ?? ""}`.trim(),
    description: `Pris og billigere alternativer for ${m.navn}${m.styrke ? ` ${m.styrke}` : ""}.`,
  };
}

export default async function MedicinDetalje({ params }: PageProps) {
  const { main, alternatives } = await getMedicineWithAlternatives(
    params.varenummer,
  );
  if (!main) notFound();
  const m = main;

  // API'ets Substitutioner er den autoritative liste af alternativer —
  // vi viser dem alle uanset pakkestørrelse og lader pris-pr-stk gøre
  // sammenligningen retfærdig.
  const alleIGruppe = [m, ...alternatives];
  const sorteret = [...alleIGruppe].sort(
    (a, b) =>
      (a.prisKr ?? Number.POSITIVE_INFINITY) -
      (b.prisKr ?? Number.POSITIVE_INFINITY),
  );
  const billigste = sorteret.find((x) => x.prisKr !== null) ?? null;
  const billigsteKr = billigste?.prisKr ?? null;

  // Beregn A/B/C på tværs af hele gruppen
  function abc(p: number | null): SubstitutionCategory {
    if (p === null || billigsteKr === null) return null;
    const diff = p - billigsteKr;
    if (diff <= 0.5) return "A";
    if (diff <= 5) return "B";
    return "C";
  }
  for (const x of alleIGruppe) {
    x.abc = abc(x.prisKr);
  }

  const erBilligste = billigste?.varenummer === m.varenummer;
  const besparelseVsBilligste =
    !erBilligste && billigste?.prisKr != null && m.prisKr != null
      ? m.prisKr - billigste.prisKr
      : 0;

  // Alle alternativer (ekskl. main), sorteret billigste først
  const visAlternativer = sorteret.filter(
    (x) => x.varenummer !== m.varenummer,
  );

  const abcText = abcForklaring(m.abc);

  return (
    <div className="container-page py-8 sm:py-10">
      <Link
        href={`/soeg?q=${encodeURIComponent(m.indholdsstof ?? m.navn)}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-ink-muted transition hover:text-brand-700"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Tilbage til søgning
      </Link>

      <article className="space-y-6">
        <header className="rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {erBilligste ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-sm font-semibold text-white">
                Billigst i gruppen
              </span>
            ) : null}
            <ABCBadge abc={m.abc} />
            {m.recept ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                Receptpligtig
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                Håndkøb
              </span>
            )}
          </div>

          <h1 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">
            {m.navn}
            {m.styrke ? (
              <span className="ml-2 font-medium text-ink-muted">{m.styrke}</span>
            ) : null}
          </h1>

          <dl className="mt-4 grid gap-x-6 gap-y-2 text-ink sm:grid-cols-2">
            {m.form ? (
              <div>
                <dt className="inline text-ink-subtle">Form: </dt>
                <dd className="inline">{m.form}</dd>
              </div>
            ) : null}
            {m.pakning ? (
              <div>
                <dt className="inline text-ink-subtle">Pakning: </dt>
                <dd className="inline">{m.pakning}</dd>
              </div>
            ) : null}
            {m.indholdsstof ? (
              <div>
                <dt className="inline text-ink-subtle">Indholdsstof: </dt>
                <dd className="inline">{m.indholdsstof}</dd>
              </div>
            ) : null}
            {m.firma ? (
              <div>
                <dt className="inline text-ink-subtle">Producent: </dt>
                <dd className="inline">{m.firma}</dd>
              </div>
            ) : null}
            <div>
              <dt className="inline text-ink-subtle">Varenummer: </dt>
              <dd className="inline tabular-nums">{m.varenummer}</dd>
            </div>
            {m.atc ? (
              <div>
                <dt className="inline text-ink-subtle">ATC-kode: </dt>
                <dd className="inline tabular-nums">{m.atc}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-6">
            <div>
              <p className="text-sm text-ink-subtle">Pris i apoteket</p>
              <p className="text-4xl font-bold tabular-nums text-ink">
                {formatKr(m.prisKr)}
              </p>
              {m.prisPrEnhedKr !== null ? (
                <p className="mt-1 text-ink-muted">
                  Det er {formatKr(m.prisPrEnhedKr)} pr. stk
                </p>
              ) : null}
            </div>
            {m.indlaegsseddelUrl ? (
              <a
                href={m.indlaegsseddelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-ink transition hover:border-brand-400 hover:text-brand-700"
              >
                Læs indlægssedlen
                <ExternalLink className="size-4" aria-hidden />
              </a>
            ) : null}
          </div>
        </header>

        {!erBilligste && besparelseVsBilligste > 0 ? (
          <SavingsHighlight
            besparelseKr={besparelseVsBilligste}
            besparelseProcent={
              m.prisKr ? (besparelseVsBilligste / m.prisKr) * 100 : null
            }
          />
        ) : null}

        <SubsidyExplainer medicine={m} />

        {m.abc ? (
          <section className="rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8">
            <h2 className="text-xl font-bold text-ink">
              Hvad betyder mærket {m.abc}?
            </h2>
            <p className="mt-2 text-ink-muted">{abcText.lang}</p>
          </section>
        ) : null}

        <section className="rounded-2xl border-2 border-brand-200 bg-brand-50/30 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-ink">
            {erBilligste
              ? "Andre pakninger med samme virkning"
              : "Billigere alternativer med samme virkning"}
          </h2>
          <p className="mt-1 text-ink-muted">
            {erBilligste
              ? "Du har allerede den billigste — disse er dyrere pakninger i samme substitutionsgruppe."
              : "Apoteket må udskifte til disse — bare bed om det billigste."}
          </p>

          {visAlternativer.length === 0 ? (
            <p className="mt-6 rounded-xl border border-line bg-white p-5 text-ink">
              Vi kunne ikke finde alternativer til denne pakning lige nu.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {visAlternativer.map((alt) => (
                <li key={alt.varenummer}>
                  <MedicineCard
                    medicine={alt}
                    variant={
                      alt.varenummer === billigste?.varenummer
                        ? "billigste"
                        : "alternativ"
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <ABCExplainer />
      </article>
    </div>
  );
}
