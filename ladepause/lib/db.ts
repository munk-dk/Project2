import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/**
 * SQLite er PoC'ens operationelle datalager. Vi holder det bevidst simpelt
 * (jf. briefen: "SQLite til at starte med for enkelhedens skyld"). Skemaet er
 * struktureret, så det er nemt at flytte til Postgres/Supabase + PostGIS senere:
 * ét stations-tabel, ét POI-tabel, ét summaries-tabel.
 *
 * Databasefilen er gitignored — den bygges ved at køre pipeline-scriptsene.
 */

export const DB_PATH = path.join(process.cwd(), "data", "ladepause.db");

let cached: Database.Database | null = null;

export function getDb(): Database.Database {
  if (cached) return cached;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  cached = db;
  return db;
}

/** Returnerer true hvis databasefilen findes (så webappen kan vælge datakilde). */
export function dbExists(): boolean {
  return fs.existsSync(DB_PATH);
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stations (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      address         TEXT NOT NULL,
      city            TEXT NOT NULL,
      country         TEXT NOT NULL,
      lat             REAL NOT NULL,
      lng             REAL NOT NULL,
      connector_count INTEGER,
      connector_type  TEXT,
      power_kw        REAL,
      operator        TEXT NOT NULL,
      source          TEXT NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pois (
      id                 TEXT PRIMARY KEY,
      station_id         TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
      name               TEXT NOT NULL,
      category           TEXT NOT NULL,
      lat                REAL NOT NULL,
      lng                REAL NOT NULL,
      distance_meters    INTEGER NOT NULL,
      rating             REAL,
      user_ratings_total INTEGER,
      source             TEXT NOT NULL,
      reviews_json       TEXT,
      raw_json           TEXT,
      fetched_at         TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pois_station ON pois(station_id);

    CREATE TABLE IF NOT EXISTS summaries (
      station_id      TEXT PRIMARY KEY REFERENCES stations(id) ON DELETE CASCADE,
      summary_text    TEXT NOT NULL,
      tags_json       TEXT NOT NULL,
      model           TEXT NOT NULL,
      prompt_version  TEXT NOT NULL,
      generated_by    TEXT NOT NULL,
      generated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
