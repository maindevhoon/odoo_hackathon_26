import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('transitops.db');
  }
  return dbInstance;
}

/**
 * Local SQLite mirror of the driver-relevant Supabase tables, plus a
 * mutation_queue for offline writes. Every mirrored row keeps `updated_at`
 * and `synced` so pull/push can reason about staleness.
 */
export function initDb(): void {
  const db = getDb();

  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS driver_progress (
      driver_id TEXT PRIMARY KEY,
      xp INTEGER NOT NULL,
      tier TEXT NOT NULL,
      contracts_completed INTEGER NOT NULL,
      contracts_breached INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS leaderboard (
      driver_id TEXT PRIMARY KEY,
      driver_name TEXT,
      xp INTEGER NOT NULL,
      tier TEXT NOT NULL,
      rank INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      title TEXT NOT NULL,
      vehicle_class TEXT,
      cargo_type TEXT,
      region TEXT,
      min_tier TEXT NOT NULL,
      pay REAL NOT NULL,
      start_date TEXT,
      end_date TEXT,
      driver_id TEXT,
      status TEXT NOT NULL,
      created_at TEXT,
      updated_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      source TEXT,
      destination TEXT,
      vehicle_id TEXT,
      vehicle_reg_no TEXT,
      driver_id TEXT,
      cargo_weight_kg REAL,
      planned_distance REAL,
      final_odometer REAL,
      fuel_consumed REAL,
      revenue REAL,
      status TEXT NOT NULL,
      contract_id TEXT,
      created_at TEXT,
      updated_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS fuel_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT,
      trip_id TEXT,
      liters REAL,
      cost REAL,
      logged_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS mutation_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );
  `);
}
