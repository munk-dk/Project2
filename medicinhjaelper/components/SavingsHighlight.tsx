import { PiggyBank } from "lucide-react";
import { cn, formatKr, formatPercent } from "@/lib/utils";

interface Props {
  besparelseKr: number;
  besparelseProcent?: number | null;
  /** Mindre version til at sætte ind i et kort */
  compact?: boolean;
  className?: string;
}

export function SavingsHighlight({
  besparelseKr,
  besparelseProcent,
  compact = false,
  className,
}: Props) {
  if (besparelseKr <= 0) return null;

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-brand-800",
          className,
        )}
      >
        <PiggyBank className="size-4" aria-hidden />
        <span className="text-sm font-semibold">
          Spar {formatKr(besparelseKr, { whole: true })}
          {besparelseProcent ? ` (${formatPercent(besparelseProcent)})` : ""}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border-2 border-brand-300 bg-brand-50 p-5",
        className,
      )}
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
        <PiggyBank className="size-6" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-brand-900">
          Du kan spare {formatKr(besparelseKr, { whole: true })}
          {besparelseProcent
            ? ` — det er ${formatPercent(besparelseProcent)} billigere`
            : ""}
        </p>
        <p className="mt-1 text-brand-800">
          ved at vælge det billigste alternativ med samme virkning.
        </p>
      </div>
    </div>
  );
}
