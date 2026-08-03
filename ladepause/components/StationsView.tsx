"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TAGS, TAG_KEYS, type EnrichedStation, type TagKey } from "@/lib/types";
import { TagList } from "./TagBadge";
import { StationMap } from "./StationMap";

// Ekstra facilitets-filtre baseret på POI-kategorier (ikke tags).
const FACILITY_FILTERS = [
  { key: "playground", emoji: "🛝", label: "Legeplads" },
  { key: "toilet", emoji: "🚻", label: "Toilet" },
  { key: "supermarket", emoji: "🛒", label: "Supermarked" },
] as const;

type FacilityKey = (typeof FACILITY_FILTERS)[number]["key"];

export function StationsView({ stations }: { stations: EnrichedStation[] }) {
  const [selectedTags, setSelectedTags] = useState<Set<TagKey>>(new Set());
  const [selectedFacilities, setSelectedFacilities] = useState<Set<FacilityKey>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return stations.filter((s) => {
      const tags = new Set(s.summary?.tags ?? []);
      for (const t of selectedTags) if (!tags.has(t)) return false;

      const cats = new Set(s.pois.map((p) => p.category));
      for (const f of selectedFacilities) if (!cats.has(f)) return false;

      return true;
    });
  }, [stations, selectedTags, selectedFacilities]);

  function toggleTag(t: TagKey) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }
  function toggleFacility(f: FacilityKey) {
    setSelectedFacilities((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  }

  const mapStations = filtered.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }));

  return (
    <div>
      {/* Filtre */}
      <div className="mb-5 space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            Bedst til
          </p>
          <div className="flex flex-wrap gap-2">
            {TAG_KEYS.map((t) => (
              <FilterChip
                key={t}
                emoji={TAGS[t].emoji}
                label={TAGS[t].label}
                active={selectedTags.has(t)}
                onClick={() => toggleTag(t)}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            Faciliteter i nærheden
          </p>
          <div className="flex flex-wrap gap-2">
            {FACILITY_FILTERS.map((f) => (
              <FilterChip
                key={f.key}
                emoji={f.emoji}
                label={f.label}
                active={selectedFacilities.has(f.key)}
                onClick={() => toggleFacility(f.key)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Kort */}
      <div className="mb-5 h-72 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <StationMap stations={mapStations} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Liste */}
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-600">
          {filtered.length} af {stations.length} stationer
        </h2>
        {(selectedTags.size > 0 || selectedFacilities.size > 0) && (
          <button
            onClick={() => {
              setSelectedTags(new Set());
              setSelectedFacilities(new Set());
            }}
            className="text-xs text-brand hover:underline"
          >
            Ryd filtre
          </button>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {filtered.map((s) => (
          <li key={s.id}>
            <StationCard
              station={s}
              highlighted={s.id === selectedId}
              onHover={() => setSelectedId(s.id)}
            />
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Ingen stationer matcher filtrene. Prøv at rydde nogle.
        </p>
      )}
    </div>
  );
}

function FilterChip({
  emoji,
  label,
  active,
  onClick,
}: {
  emoji: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
        active
          ? "border-brand bg-brand text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-brand"
      }`}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}

function StationCard({
  station,
  highlighted,
  onHover,
}: {
  station: EnrichedStation;
  highlighted: boolean;
  onHover: () => void;
}) {
  const nearest = station.pois[0];
  return (
    <Link
      href={`/station/${station.id}`}
      onMouseEnter={onHover}
      className={`block h-full rounded-xl border bg-white p-4 transition hover:shadow-md ${
        highlighted ? "border-brand ring-2 ring-brand/30" : "border-slate-200"
      }`}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">{station.name}</h3>
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
          {station.country}
        </span>
      </div>
      <p className="mb-2 text-xs text-slate-500">{station.address}</p>
      {station.summary ? (
        <p className="mb-3 line-clamp-3 text-sm text-slate-700">{station.summary.summaryText}</p>
      ) : (
        <p className="mb-3 text-sm italic text-slate-400">Intet resumé endnu.</p>
      )}
      <TagList tags={station.summary?.tags ?? []} />
      {nearest && (
        <p className="mt-2 text-xs text-slate-500">
          Nærmest: {nearest.name} · ~{nearest.distanceMeters} m
        </p>
      )}
    </Link>
  );
}
