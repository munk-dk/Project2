import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PartyTag } from "@/components/PartyTag";
import { VOTE_LABEL, VOTE_TONE, type VoteType } from "@/lib/types";
import type { Rebel } from "@/lib/analytics";

export function RebelList({ rebels }: { rebels: Rebel[] }) {
  if (rebels.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ingen rebeller i denne afstemning — alle fulgte partilinjen.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {rebels.map((r) => (
        <li
          key={`${r.actorId}-${r.voteType}`}
          className="flex items-center justify-between gap-3 py-2 text-sm"
        >
          <div className="min-w-0 flex-1">
            <Link
              href={`/politiker/${r.actorId}`}
              className="truncate font-medium hover:underline"
            >
              {r.actorName}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Partiet stemte{" "}
              <strong>{r.partyMajority === "for" ? "FOR" : "IMOD"}</strong>
            </p>
          </div>
          <PartyTag party={r.party} />
          <Badge tone={VOTE_TONE[r.voteType]}>{VOTE_LABEL[r.voteType]}</Badge>
        </li>
      ))}
    </ul>
  );
}
