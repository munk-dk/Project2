import { Info, Wallet } from "lucide-react";
import { cn, formatKr } from "@/lib/utils";
import type { Medicine } from "@/lib/types";

interface Props {
  medicine: Medicine;
  className?: string;
}

export function SubsidyExplainer({ medicine, className }: Props) {
  const harTilskud = medicine.tilskud;
  const tilskudspris = medicine.prisMedTilskudKr;
  const fuldPris = medicine.prisKr;

  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        harTilskud ? "border-brand-200 bg-brand-50/50" : "border-line bg-surface-soft",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            harTilskud ? "bg-brand-600 text-white" : "bg-slate-300 text-slate-700",
          )}
        >
          <Wallet className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-ink">
            {harTilskud ? "Du kan få tilskud" : "Ingen tilskud"}
          </h3>
          {harTilskud ? (
            <>
              <p className="mt-1 text-ink-muted">
                Hvor meget du betaler afhænger af hvor meget medicin du har købt
                i år (din CTR-saldo). Når du har købt for mere, falder din pris.
              </p>
              {tilskudspris !== null && fuldPris !== null ? (
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-line bg-white p-3">
                    <dt className="text-sm text-ink-subtle">Med tilskud betaler du</dt>
                    <dd className="mt-1 text-2xl font-bold tabular-nums text-brand-700">
                      {formatKr(tilskudspris)}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-line bg-white p-3">
                    <dt className="text-sm text-ink-subtle">Uden tilskud koster den</dt>
                    <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">
                      {formatKr(fuldPris)}
                    </dd>
                  </div>
                </dl>
              ) : null}
              <details className="group mt-4 rounded-lg bg-white p-3 text-ink-muted">
                <summary className="flex cursor-pointer items-center gap-2 font-medium text-ink">
                  <Info className="size-4" aria-hidden />
                  Sådan virker tilskud kort
                </summary>
                <ul className="mt-3 space-y-2 pl-1 text-base">
                  <li>
                    De første <strong>1.075 kr</strong> betaler du selv (voksne).
                  </li>
                  <li>
                    Mellem 1.075 og 1.825 kr får du <strong>50 %</strong> tilskud.
                  </li>
                  <li>
                    Mellem 1.825 og 4.030 kr får du <strong>75 %</strong> tilskud.
                  </li>
                  <li>
                    Over 4.030 kr får du <strong>85 %</strong> tilskud.
                  </li>
                  <li className="text-ink-subtle">
                    Beløb gælder pr. tilskudsperiode (12 måneder). Børn under 18
                    har lavere grænser. Tjek din saldo på borger.dk.
                  </li>
                </ul>
              </details>
            </>
          ) : (
            <p className="mt-1 text-ink">
              Dette præparat har ikke tilskud — du betaler{" "}
              <strong>{formatKr(fuldPris)}</strong> uanset hvor meget anden medicin
              du har købt i år. Tjek om der findes et lignende præparat med tilskud.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
