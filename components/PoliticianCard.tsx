import Link from "next/link";
import { initials } from "@/lib/utils";
import { resolveParty } from "@/lib/parties";
import { PartyTag } from "./PartyTag";
import type { VoteStats } from "@/lib/types";

export function PoliticianCard({
  id,
  name,
  party,
  constituency,
  stats,
}: {
  id: number;
  name: string;
  party?: string | null;
  constituency?: string | null;
  stats?: VoteStats;
}) {
  const info = resolveParty(party);
  return (
    <Link
      href={`/politiker/${id}`}
      className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
    >
      <div
        aria-hidden
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-base font-semibold"
        style={{ backgroundColor: info.color, color: info.textColor }}
      >
        {initials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{name}</p>
          <PartyTag party={party} />
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {constituency ?? info.name}
        </p>
        {stats && (
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.total} stemmer · {stats.for} for · {stats.against} imod
          </p>
        )}
      </div>
    </Link>
  );
}
