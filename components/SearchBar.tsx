"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { slugify } from "@/lib/utils";

export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/sog?q=${encodeURIComponent(q)}&slug=${slugify(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Søg efter politiker eller emne, fx 'Mette Frederiksen' eller 'klima'"
          aria-label="Søg"
          className="h-12 w-full rounded-lg border border-input bg-white pl-11 pr-4 text-base shadow-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </form>
  );
}
