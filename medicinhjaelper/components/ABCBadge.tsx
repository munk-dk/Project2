import { cn } from "@/lib/utils";
import { abcForklaring } from "@/lib/medicine";
import type { SubstitutionCategory } from "@/lib/types";

interface Props {
  abc: SubstitutionCategory;
  withLabel?: boolean;
  className?: string;
}

export function ABCBadge({ abc, withLabel = true, className }: Props) {
  if (!abc) return null;
  const { kort } = abcForklaring(abc);

  const styles: Record<"A" | "B" | "C", string> = {
    A: "bg-brand-100 text-brand-800 border-brand-300",
    B: "bg-amber-100 text-amber-900 border-amber-300",
    C: "bg-slate-100 text-slate-700 border-slate-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold",
        styles[abc],
        className,
      )}
      title={`Kategori ${abc}: ${kort}`}
    >
      <span className="font-bold">{abc}</span>
      {withLabel ? <span>{kort}</span> : null}
    </span>
  );
}

export function ABCExplainer() {
  return (
    <div className="rounded-xl border border-line bg-surface-soft p-5">
      <h3 className="text-lg font-semibold text-ink">Hvad betyder A, B og C?</h3>
      <p className="mt-1 text-ink-muted">
        Lægemiddelstyrelsen mærker pakninger inden for samme gruppe efter pris.
      </p>
      <ul className="mt-4 space-y-3">
        <li className="flex gap-3">
          <ABCBadge abc="A" withLabel={false} />
          <span className="text-ink">
            <strong className="font-semibold">Billigst.</strong> Apoteket skal som
            udgangspunkt tilbyde dig denne pakning.
          </span>
        </li>
        <li className="flex gap-3">
          <ABCBadge abc="B" withLabel={false} />
          <span className="text-ink">
            <strong className="font-semibold">Tæt på billigst.</strong> Inden for 5 kr
            af A — apoteket må udlevere uden ekstra besked.
          </span>
        </li>
        <li className="flex gap-3">
          <ABCBadge abc="C" withLabel={false} />
          <span className="text-ink">
            <strong className="font-semibold">Dyrere.</strong> Mere end 5 kr dyrere.
            Bed apoteket skifte til den billigste — det er din ret.
          </span>
        </li>
      </ul>
    </div>
  );
}
