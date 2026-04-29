import Link from "next/link";
import { ChevronRight, PiggyBank } from "lucide-react";
import { cn, formatKr } from "@/lib/utils";
import { ABCBadge } from "./ABCBadge";
import type { Medicine } from "@/lib/types";

interface Props {
  medicine: Medicine;
  variant?: "billigste" | "original" | "alternativ" | "default";
  className?: string;
  showAbc?: boolean;
}

const variantStyles: Record<NonNullable<Props["variant"]>, string> = {
  billigste: "border-brand-300 bg-brand-50/50 ring-2 ring-brand-200",
  original: "border-line bg-white",
  alternativ: "border-line bg-white",
  default: "border-line bg-white",
};

// "Billigst" og "Original" er meningsfulde for brugeren. "Generisk" er
// fagsprog uden handlingsværdi — A/B/C-mærket fortæller alt om prisen.
const variantBadge: Record<NonNullable<Props["variant"]>, string | null> = {
  billigste: "Billigst",
  original: "Original",
  alternativ: null,
  default: null,
};

export function MedicineCard({
  medicine,
  variant = "default",
  className,
  showAbc = true,
}: Props) {
  const badgeText = variantBadge[variant];
  return (
    <Link
      href={`/medicin/${medicine.varenummer}`}
      className={cn(
        "group block rounded-xl border p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-lift focus:outline-none focus:ring-4 focus:ring-brand-200",
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {badgeText ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold",
                  variant === "billigste"
                    ? "bg-brand-600 text-white"
                    : variant === "original"
                      ? "bg-slate-200 text-slate-700"
                      : "bg-amber-100 text-amber-900",
                )}
              >
                {variant === "billigste" ? <PiggyBank className="size-4" /> : null}
                {badgeText}
              </span>
            ) : null}
            {showAbc ? <ABCBadge abc={medicine.abc} withLabel={false} /> : null}
          </div>
          <h3 className="mt-2 text-xl font-semibold text-ink group-hover:text-brand-700">
            {medicine.navn}
          </h3>
          <p className="mt-0.5 text-ink-muted">
            {[medicine.styrke, medicine.form, medicine.pakning]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {medicine.firma ? (
            <p className="mt-1 text-sm text-ink-subtle">Fra {medicine.firma}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold tabular-nums text-ink">
            {formatKr(medicine.prisKr)}
          </div>
          {medicine.prisPrEnhedKr !== null ? (
            <div className="mt-0.5 text-sm text-ink-subtle">
              {formatKr(medicine.prisPrEnhedKr)} pr. stk
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="text-sm text-ink-subtle">Varenr. {medicine.varenummer}</span>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
          Se detaljer
          <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
