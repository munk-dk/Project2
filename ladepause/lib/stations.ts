import "server-only";
import fs from "node:fs";
import path from "node:path";
import { dbExists, getDb } from "./db";
import type { EnrichedStation, Poi, Station, Summary, TagKey } from "./types";

/**
 * Datakilde for webappen. Læser fra den lokale SQLite-database hvis den findes
 * (dvs. pipelinen er kørt), ellers falder den tilbage til det committede
 * eksempeldatasæt, så appen altid kan startes og vises — også uden API-nøgler.
 */

const SAMPLE_PATH = path.join(process.cwd(), "data", "sample-enriched.json");

export interface DataSourceInfo {
  source: "database" | "sample";
  isSample: boolean;
}

export function getDataSource(): DataSourceInfo {
  const usingDb = dbExists();
  return { source: usingDb ? "database" : "sample", isSample: !usingDb };
}

export function getStations(): EnrichedStation[] {
  return dbExists() ? readFromDb() : readFromSample();
}

export function getStation(id: string): EnrichedStation | null {
  return getStations().find((s) => s.id === id) ?? null;
}

// --- SQLite ----------------------------------------------------------------

interface StationRow {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  connector_count: number | null;
  connector_type: string | null;
  power_kw: number | null;
  operator: string;
  source: string;
}

interface PoiRow {
  id: string;
  station_id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  distance_meters: number;
  rating: number | null;
  user_ratings_total: number | null;
  source: string;
  reviews_json: string | null;
}

interface SummaryRow {
  station_id: string;
  summary_text: string;
  tags_json: string;
  model: string;
  prompt_version: string;
  generated_by: string;
  generated_at: string;
}

function readFromDb(): EnrichedStation[] {
  const db = getDb();
  const stations = db.prepare("SELECT * FROM stations ORDER BY country, city").all() as StationRow[];
  const pois = db.prepare("SELECT * FROM pois").all() as PoiRow[];
  const summaries = db.prepare("SELECT * FROM summaries").all() as SummaryRow[];

  const poisByStation = new Map<string, Poi[]>();
  for (const p of pois) {
    const list = poisByStation.get(p.station_id) ?? [];
    list.push({
      id: p.id,
      stationId: p.station_id,
      name: p.name,
      category: p.category as Poi["category"],
      lat: p.lat,
      lng: p.lng,
      distanceMeters: p.distance_meters,
      rating: p.rating,
      userRatingsTotal: p.user_ratings_total,
      source: p.source as Poi["source"],
      reviews: p.reviews_json ? (JSON.parse(p.reviews_json) as string[]) : undefined,
    });
    poisByStation.set(p.station_id, list);
  }

  const summaryByStation = new Map<string, Summary>();
  for (const s of summaries) {
    summaryByStation.set(s.station_id, {
      stationId: s.station_id,
      summaryText: s.summary_text,
      tags: JSON.parse(s.tags_json) as TagKey[],
      model: s.model,
      promptVersion: s.prompt_version,
      generatedBy: s.generated_by as Summary["generatedBy"],
      generatedAt: s.generated_at,
    });
  }

  return stations.map((row) => enrich(rowToStation(row), poisByStation, summaryByStation));
}

function rowToStation(row: StationRow): Station {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    country: row.country as Station["country"],
    lat: row.lat,
    lng: row.lng,
    connectorCount: row.connector_count,
    connectorType: row.connector_type,
    powerKw: row.power_kw,
    operator: row.operator,
    source: row.source as Station["source"],
  };
}

function enrich(
  station: Station,
  poisByStation: Map<string, Poi[]>,
  summaryByStation: Map<string, Summary>,
): EnrichedStation {
  const pois = (poisByStation.get(station.id) ?? []).sort(
    (a, b) => a.distanceMeters - b.distanceMeters,
  );
  return { ...station, pois, summary: summaryByStation.get(station.id) ?? null };
}

// --- Sample-fallback -------------------------------------------------------

function readFromSample(): EnrichedStation[] {
  if (!fs.existsSync(SAMPLE_PATH)) return [];
  const raw = fs.readFileSync(SAMPLE_PATH, "utf-8");
  return JSON.parse(raw) as EnrichedStation[];
}
