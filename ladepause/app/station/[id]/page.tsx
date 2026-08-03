import Link from "next/link";
import { notFound } from "next/navigation";
import { getStation } from "@/lib/stations";
import { TagList } from "@/components/TagBadge";
import type { Poi, PoiCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<PoiCategory, { emoji: string; label: string }> = {
  cafe: { emoji: "☕", label: "Café" },
  restaurant: { emoji: "🍽️", label: "Restaurant" },
  supermarket: { emoji: "🛒", label: "Supermarked" },
  bakery: { emoji: "🥐", label: "Bager" },
  playground: { emoji: "🛝", label: "Legeplads" },
  toilet: { emoji: "🚻", label: "Toilet" },
  dog_area: { emoji: "🐕", label: "Hundeområde" },
  park: { emoji: "🌳", label: "Grønt område" },
  other: { emoji: "📍", label: "Sted" },
};

export default function StationPage({ params }: { params: { id: string } }) {
  const station = getStation(params.id);
  if (!station) notFound();

  return (
    <div>
      <Link href="/" className="mb-4 inline-block text-sm text-brand hover:underline">
        ← Alle stationer
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{station.name}</h1>
          <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {station.country}
          </span>
        </div>
        <p className="text-sm text-slate-500">{station.address}</p>

        {/* Statisk ladeinfo */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-700">
          <Fact label="Effekt" value={station.powerKw ? `${station.powerKw} kW` : "—"} />
          <Fact label="Standere" value={station.connectorCount?.toString() ?? "—"} />
          <Fact label="Stik" value={station.connectorType ?? "—"} />
          <Fact label="Operatør" value={station.operator} />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Statisk info — ikke live-status for ledige ladere.
        </p>

        {/* Resumé */}
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">
            Godt til pause
          </h2>
          {station.summary ? (
            <>
              <p className="text-slate-800">{station.summary.summaryText}</p>
              <div className="mt-3">
                <TagList tags={station.summary.tags} />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {station.summary.generatedBy === "placeholder"
                  ? "Eksempel-resumé (pladsholder)."
                  : `Genereret med ${station.summary.model}.`}
              </p>
            </>
          ) : (
            <p className="italic text-slate-400">Intet resumé endnu.</p>
          )}
        </div>

        {/* POI'er */}
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">
            Inden for gåafstand
          </h2>
          {station.pois.length ? (
            <ul className="divide-y divide-slate-100">
              {station.pois.map((poi) => (
                <PoiRow key={poi.id} poi={poi} />
              ))}
            </ul>
          ) : (
            <p className="italic text-slate-400">Ingen registrerede steder i nærheden.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function PoiRow({ poi }: { poi: Poi }) {
  const cat = CATEGORY_LABELS[poi.category] ?? CATEGORY_LABELS.other;
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-2">
        <span aria-hidden>{cat.emoji}</span>
        <div>
          <div className="text-sm font-medium text-slate-800">{poi.name}</div>
          <div className="text-xs text-slate-500">
            {cat.label}
            {poi.rating != null && ` · ★ ${poi.rating}`}
            {poi.userRatingsTotal != null && ` (${poi.userRatingsTotal})`}
          </div>
        </div>
      </div>
      <span className="shrink-0 text-sm text-slate-500">~{poi.distanceMeters} m</span>
    </li>
  );
}
