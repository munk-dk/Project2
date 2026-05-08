"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SearchType } from "@/lib/types";

const TYPES: { value: SearchType; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "name", label: "Navn" },
  { value: "ident", label: "Ident" },
  { value: "chip", label: "Chip" },
  { value: "feiid", label: "FEI ID" },
  { value: "ueln", label: "UELN" },
];

export function SearchBar({
  initialQuery = "",
  initialType = "all",
  size = "md",
}: {
  initialQuery?: string;
  initialType?: SearchType;
  size?: "md" | "lg";
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [type, setType] = useState<SearchType>(initialType);

  const padding = size === "lg" ? "py-3 px-4 text-base" : "py-2 px-3 text-sm";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = q.trim();
        if (!trimmed) return;
        const sp = new URLSearchParams({ q: trimmed, type });
        router.push(`/search?${sp.toString()}`);
      }}
      className="flex flex-col gap-3 sm:flex-row"
    >
      <div className="flex flex-1 overflow-hidden rounded-md border border-border bg-white shadow-sm focus-within:ring-2 focus-within:ring-brand-400">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as SearchType)}
          className={`border-r border-border bg-muted px-3 ${padding}`}
          aria-label="Søgetype"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søg på navn, ident, chip, FEI ID eller UELN…"
          className={`flex-1 bg-white outline-none ${padding}`}
        />
      </div>
      <button
        type="submit"
        className={`rounded-md bg-brand-600 font-medium text-white transition hover:bg-brand-700 ${padding}`}
      >
        Søg
      </button>
    </form>
  );
}
