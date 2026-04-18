"use client";

import { useMemo, useState } from "react";
import { resolveParty } from "@/lib/parties";
import { percent } from "@/lib/utils";
import { PartyTag } from "./PartyTag";
import type { PartyVoteStats } from "@/lib/types";

type SortKey = "party" | "for" | "against" | "abstain" | "absent" | "total";

export function PartyComparisonTable({
  rows,
}: {
  rows: PartyVoteStats[];
}) {
  const [sort, setSort] = useState<SortKey>("for");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = sort === "party" ? resolveParty(a.party).name : a[sort];
      const bv = sort === "party" ? resolveParty(b.party).name : b[sort];
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sort, dir]);

  function header(label: string, key: SortKey) {
    const active = sort === key;
    return (
      <th
        scope="col"
        className="cursor-pointer select-none px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        onClick={() => {
          if (active) setDir(dir === "asc" ? "desc" : "asc");
          else {
            setSort(key);
            setDir("desc");
          }
        }}
      >
        {label}
        {active ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </th>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ingen data for dette emne endnu.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/40">
          <tr>
            {header("Parti", "party")}
            {header("For", "for")}
            {header("Imod", "against")}
            {header("Afstår", "abstain")}
            {header("Fraværende", "absent")}
            {header("I alt", "total")}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((r) => (
            <tr key={r.party}>
              <td className="whitespace-nowrap px-3 py-2">
                <div className="flex items-center gap-2">
                  <PartyTag party={r.party} />
                  <span>{resolveParty(r.party).name}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                {r.for} <span className="text-xs text-muted-foreground">({percent(r.for, r.total)}%)</span>
              </td>
              <td className="px-3 py-2">
                {r.against} <span className="text-xs text-muted-foreground">({percent(r.against, r.total)}%)</span>
              </td>
              <td className="px-3 py-2">
                {r.abstain} <span className="text-xs text-muted-foreground">({percent(r.abstain, r.total)}%)</span>
              </td>
              <td className="px-3 py-2">
                {r.absent} <span className="text-xs text-muted-foreground">({percent(r.absent, r.total)}%)</span>
              </td>
              <td className="px-3 py-2 font-medium">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
