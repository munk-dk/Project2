"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Badge } from "./ui/Badge";
import { formatDate } from "@/lib/utils";
import { VOTE_LABEL, VOTE_TONE, type VoteType } from "@/lib/types";

export interface VoteListItem {
  voteId: number;
  votingId: number;
  typeid: VoteType;
  title: string;
  date?: string | null;
  caseNumber?: string | null;
}

type Filter = "all" | "for" | "against" | "abstain" | "absent";

const FILTER_LABEL: Record<Filter, string> = {
  all: "Alle",
  for: "For",
  against: "Imod",
  abstain: "Afstår",
  absent: "Fraværende",
};

export function VoteList({
  votes,
  showFilter = true,
}: {
  votes: VoteListItem[];
  showFilter?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return votes;
    return votes.filter((v) => VOTE_TONE[v.typeid] === filter);
  }, [votes, filter]);

  if (votes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ingen afstemninger at vise.
      </p>
    );
  }

  return (
    <div>
      {showFilter && (
        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-white text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>
      )}

      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {filtered.map((v) => (
          <li key={v.voteId}>
            <Link
              href={`/afstemning/${v.votingId}`}
              className="flex items-start justify-between gap-3 px-4 py-3 transition hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{v.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(v.date)}
                  {v.caseNumber ? ` · ${v.caseNumber}` : ""}
                </p>
              </div>
              <Badge tone={VOTE_TONE[v.typeid]}>
                {VOTE_LABEL[v.typeid]}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Ingen stemmer matcher filteret.
        </p>
      )}
    </div>
  );
}
