import { getDb } from "./db";
import type { Poi, Station, Summary } from "./types";

/**
 * Skrive-helpers til pipelinen. Holdt adskilt fra stations.ts (som er read-only
 * for webappen) så det er tydeligt hvem der skriver hvad.
 */

export function upsertStations(stations: Station[]): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO stations
      (id, name, address, city, country, lat, lng, connector_count, connector_type, power_kw, operator, source)
    VALUES
      (@id, @name, @address, @city, @country, @lat, @lng, @connectorCount, @connectorType, @powerKw, @operator, @source)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, address=excluded.address, city=excluded.city, country=excluded.country,
      lat=excluded.lat, lng=excluded.lng, connector_count=excluded.connector_count,
      connector_type=excluded.connector_type, power_kw=excluded.power_kw,
      operator=excluded.operator, source=excluded.source
  `);
  const tx = db.transaction((rows: Station[]) => {
    for (const s of rows) stmt.run(s);
  });
  tx(stations);
}

export function getAllStations(): Station[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM stations ORDER BY country, city").all() as Array<
    Record<string, unknown>
  >;
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    address: r.address as string,
    city: r.city as string,
    country: r.country as Station["country"],
    lat: r.lat as number,
    lng: r.lng as number,
    connectorCount: r.connector_count as number | null,
    connectorType: r.connector_type as string | null,
    powerKw: r.power_kw as number | null,
    operator: r.operator as string,
    source: r.source as Station["source"],
  }));
}

/** Erstatter alle POI'er for en station (idempotent genkørsel). */
export function replacePoisForStation(stationId: string, pois: Poi[]): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM pois WHERE station_id = ?");
  const ins = db.prepare(`
    INSERT INTO pois
      (id, station_id, name, category, lat, lng, distance_meters, rating, user_ratings_total, source, reviews_json)
    VALUES
      (@id, @stationId, @name, @category, @lat, @lng, @distanceMeters, @rating, @userRatingsTotal, @source, @reviewsJson)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, category=excluded.category, distance_meters=excluded.distance_meters,
      rating=excluded.rating, user_ratings_total=excluded.user_ratings_total,
      source=excluded.source, reviews_json=excluded.reviews_json
  `);
  const tx = db.transaction((rows: Poi[]) => {
    del.run(stationId);
    for (const p of rows) {
      ins.run({
        ...p,
        rating: p.rating ?? null,
        userRatingsTotal: p.userRatingsTotal ?? null,
        reviewsJson: p.reviews ? JSON.stringify(p.reviews) : null,
      });
    }
  });
  tx(pois);
}

export function getPoisForStation(stationId: string): Poi[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM pois WHERE station_id = ? ORDER BY distance_meters")
    .all(stationId) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    stationId: r.station_id as string,
    name: r.name as string,
    category: r.category as Poi["category"],
    lat: r.lat as number,
    lng: r.lng as number,
    distanceMeters: r.distance_meters as number,
    rating: r.rating as number | null,
    userRatingsTotal: r.user_ratings_total as number | null,
    source: r.source as Poi["source"],
    reviews: r.reviews_json ? (JSON.parse(r.reviews_json as string) as string[]) : undefined,
  }));
}

export function upsertSummary(summary: Summary): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO summaries
      (station_id, summary_text, tags_json, model, prompt_version, generated_by, generated_at)
    VALUES
      (@stationId, @summaryText, @tagsJson, @model, @promptVersion, @generatedBy, @generatedAt)
    ON CONFLICT(station_id) DO UPDATE SET
      summary_text=excluded.summary_text, tags_json=excluded.tags_json, model=excluded.model,
      prompt_version=excluded.prompt_version, generated_by=excluded.generated_by,
      generated_at=excluded.generated_at
  `).run({
    stationId: summary.stationId,
    summaryText: summary.summaryText,
    tagsJson: JSON.stringify(summary.tags),
    model: summary.model,
    promptVersion: summary.promptVersion,
    generatedBy: summary.generatedBy,
    generatedAt: summary.generatedAt,
  });
}
