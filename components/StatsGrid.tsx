import { percent } from "@/lib/utils";
import type { VoteStats } from "@/lib/types";

interface Metric {
  label: string;
  value: number;
  tone: "for" | "against" | "abstain" | "absent";
}

const TONE_BG: Record<Metric["tone"], string> = {
  for: "bg-green-50 border-green-100",
  against: "bg-red-50 border-red-100",
  abstain: "bg-amber-50 border-amber-100",
  absent: "bg-gray-50 border-gray-200",
};

const TONE_TEXT: Record<Metric["tone"], string> = {
  for: "text-green-800",
  against: "text-red-800",
  abstain: "text-amber-800",
  absent: "text-gray-700",
};

export function StatsGrid({ stats }: { stats: VoteStats }) {
  const metrics: Metric[] = [
    { label: "For", value: stats.for, tone: "for" },
    { label: "Imod", value: stats.against, tone: "against" },
    { label: "Afstår", value: stats.abstain, tone: "abstain" },
    { label: "Fraværende", value: stats.absent, tone: "absent" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className={`rounded-lg border p-4 ${TONE_BG[m.tone]}`}
        >
          <p className={`text-xs font-medium uppercase tracking-wide ${TONE_TEXT[m.tone]}`}>
            {m.label}
          </p>
          <p className="mt-1 text-2xl font-bold">{m.value}</p>
          <p className="text-xs text-muted-foreground">
            {percent(m.value, stats.total)}%
          </p>
        </div>
      ))}
    </div>
  );
}
