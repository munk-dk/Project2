"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  defaultValue?: string;
  size?: "default" | "large";
  className?: string;
}

export function SearchBar({
  defaultValue = "",
  size = "default",
  className,
}: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q.length === 0) return;
    router.push(`/søg?q=${encodeURIComponent(q)}`);
  }

  const isLarge = size === "large";

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Søg medicin"
      className={cn("w-full", className)}
    >
      <label htmlFor="medicin-soeg" className="sr-only">
        Hvad hedder din medicin?
      </label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border-2 border-line bg-white shadow-soft transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100",
          isLarge ? "px-5 py-4" : "px-4 py-3",
        )}
      >
        <Search
          aria-hidden
          className={cn("shrink-0 text-ink-subtle", isLarge ? "size-7" : "size-5")}
        />
        <input
          id="medicin-soeg"
          name="q"
          type="search"
          inputMode="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder={
            isLarge
              ? "Skriv navnet på din medicin — fx Panodil, Ibuprofen…"
              : "Søg medicin"
          }
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={cn(
            "w-full bg-transparent placeholder:text-ink-subtle focus:outline-none",
            isLarge ? "text-xl" : "text-base",
          )}
        />
        <button
          type="submit"
          className={cn(
            "shrink-0 rounded-lg bg-brand-600 font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-200 active:bg-brand-800",
            isLarge ? "px-6 py-3 text-lg" : "px-4 py-2 text-base",
          )}
        >
          Søg
        </button>
      </div>
    </form>
  );
}
