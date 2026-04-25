import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { MedicineGroup } from "@/components/MedicineGroup";
import { groupMedicines, searchMedicine } from "@/lib/medicine";

export const revalidate = 3600;

interface SearchPageProps {
  searchParams: { q?: string };
}

export function generateMetadata({ searchParams }: SearchPageProps): Metadata {
  const q = searchParams.q?.trim();
  return {
    title: q ? `Søgning på "${q}"` : "Søg medicin",
    description: q
      ? `Resultater for "${q}" — find det billigste alternativ med samme virkning.`
      : "Søg din medicin og find billigere alternativer.",
  };
}

export default async function SoegPage({ searchParams }: SearchPageProps) {
  const q = searchParams.q?.trim() ?? "";

  if (q.length < 2) {
    return (
      <div className="container-page py-10">
        <SearchBar defaultValue={q} />
        <div className="mt-8 rounded-xl border border-line bg-white p-6 text-center text-ink-muted shadow-soft">
          Skriv mindst to bogstaver — fx <strong>Panodil</strong> eller{" "}
          <strong>Ibuprofen</strong>.
        </div>
      </div>
    );
  }

  const resultater = await searchMedicine(q);
  const grupper = groupMedicines(resultater);

  return (
    <div className="container-page py-8 sm:py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-ink-muted transition hover:text-brand-700"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Tilbage
      </Link>

      <SearchBar defaultValue={q} />

      <div className="mt-6 mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">
          Resultater for &ldquo;{q}&rdquo;
        </h1>
        {resultater.length > 0 ? (
          <p className="text-ink-muted">
            {resultater.length} pakninger i {grupper.length}{" "}
            {grupper.length === 1 ? "gruppe" : "grupper"}
          </p>
        ) : null}
      </div>

      {resultater.length === 0 ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 size-5 shrink-0 text-amber-700"
              aria-hidden
            />
            <div>
              <h2 className="text-lg font-semibold text-amber-900">
                Vi fandt ingen resultater
              </h2>
              <p className="mt-1 text-amber-900/80">
                Prøv at søge på det aktive indholdsstof — fx{" "}
                <em>paracetamol</em> i stedet for et bestemt mærke. Du kan
                også prøve det 6-cifrede varenummer fra pakningen.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {grupper.map((g) => (
            <MedicineGroup key={g.key} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
