import { resolveParty } from "@/lib/parties";
import { percent } from "@/lib/utils";
import type { VoteStats } from "@/lib/types";
import { PartyTag } from "./PartyTag";

export function PartyVoteBar({
  party,
  stats,
}: {
  party: string;
  stats: VoteStats;
}) {
  const info = resolveParty(party);
  const pFor = percent(stats.for, stats.total);
  const pAgainst = percent(stats.against, stats.total);
  const pAbstain = percent(stats.abstain, stats.total);
  const pAbsent = percent(stats.absent, stats.total);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PartyTag party={party} />
          <span className="text-sm font-medium">{info.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {stats.total} stemmer
        </span>
      </div>
      <div
        className="flex h-6 w-full overflow-hidden rounded-md bg-gray-100"
        role="img"
        aria-label={`${info.name} stemmer: ${pFor}% for, ${pAgainst}% imod, ${pAbstain}% afstår, ${pAbsent}% fraværende`}
      >
        {pFor > 0 && (
          <div
            className="flex items-center justify-center bg-green-500 text-[10px] font-semibold text-white"
            style={{ width: `${pFor}%` }}
          >
            {pFor >= 8 ? `${pFor}%` : ""}
          </div>
        )}
        {pAgainst > 0 && (
          <div
            className="flex items-center justify-center bg-red-500 text-[10px] font-semibold text-white"
            style={{ width: `${pAgainst}%` }}
          >
            {pAgainst >= 8 ? `${pAgainst}%` : ""}
          </div>
        )}
        {pAbstain > 0 && (
          <div
            className="flex items-center justify-center bg-amber-400 text-[10px] font-semibold text-amber-900"
            style={{ width: `${pAbstain}%` }}
          >
            {pAbstain >= 8 ? `${pAbstain}%` : ""}
          </div>
        )}
        {pAbsent > 0 && (
          <div
            className="flex items-center justify-center bg-gray-300 text-[10px] font-semibold text-gray-700"
            style={{ width: `${pAbsent}%` }}
          >
            {pAbsent >= 8 ? `${pAbsent}%` : ""}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>For: {stats.for}</span>
        <span>Imod: {stats.against}</span>
        <span>Afstår: {stats.abstain}</span>
        <span>Fraværende: {stats.absent}</span>
      </div>
    </div>
  );
}
