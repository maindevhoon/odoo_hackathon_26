import { getDb } from './schema';
import type { ContractRow, TripRow, DriverProgressRow } from '@transitops/shared';

// ─── meta (key/value) ──────────────────────────────────────────
export function getMeta(key: string): string | null {
  const row = getDb().getFirstSync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  getDb().runSync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value]);
}

// ─── driver_progress ───────────────────────────────────────────
export function upsertDriverProgress(p: DriverProgressRow): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO driver_progress
     (driver_id, xp, tier, contracts_completed, contracts_breached, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [p.driver_id, p.xp, p.tier, p.contracts_completed, p.contracts_breached, p.updated_at]
  );
}

export function getLocalDriverProgress(driverId: string) {
  return getDb().getFirstSync<{
    driver_id: string; xp: number; tier: string; contracts_completed: number; contracts_breached: number;
  }>('SELECT * FROM driver_progress WHERE driver_id = ?', [driverId]);
}

// ─── leaderboard ────────────────────────────────────────────────
export function replaceLeaderboard(rows: DriverProgressRow[]): void {
  const db = getDb();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM leaderboard');
    rows.forEach((r, i) => {
      db.runSync(
        'INSERT INTO leaderboard (driver_id, driver_name, xp, tier, rank) VALUES (?, ?, ?, ?, ?)',
        [r.driver_id, r.driver?.name ?? 'Driver', r.xp, r.tier, i + 1]
      );
    });
  });
}

export function getLocalLeaderboard() {
  return getDb().getAllSync<{ driver_id: string; driver_name: string; xp: number; tier: string; rank: number }>(
    'SELECT * FROM leaderboard ORDER BY rank ASC'
  );
}

// ─── contracts ──────────────────────────────────────────────────
export function upsertContracts(rows: ContractRow[]): void {
  const db = getDb();
  db.withTransactionSync(() => {
    rows.forEach((c) => {
      db.runSync(
        `INSERT OR REPLACE INTO contracts
         (id, company_id, title, vehicle_class, cargo_type, region, min_tier, pay,
          start_date, end_date, driver_id, status, created_at, updated_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [c.id, c.company_id, c.title, c.vehicle_class, c.cargo_type, c.region, c.min_tier, c.pay,
         c.start_date, c.end_date, c.driver_id, c.status, c.created_at, c.updated_at]
      );
    });
  });
}

export function getLocalOpenContracts(minTierAtLeast: string[]) {
  const placeholders = minTierAtLeast.map(() => '?').join(',');
  return getDb().getAllSync<any>(
    `SELECT * FROM contracts WHERE status = 'open' AND min_tier IN (${placeholders}) ORDER BY updated_at DESC`,
    minTierAtLeast
  );
}

export function getLocalDriverContracts(driverId: string) {
  return getDb().getAllSync<any>(
    `SELECT * FROM contracts WHERE driver_id = ? ORDER BY updated_at DESC`,
    [driverId]
  );
}

export function markContractAssignedLocally(contractId: string, driverId: string): void {
  getDb().runSync(
    `UPDATE contracts SET status = 'assigned', driver_id = ?, synced = 0, updated_at = datetime('now') WHERE id = ?`,
    [driverId, contractId]
  );
}

// ─── trips ──────────────────────────────────────────────────────
export function upsertTrips(rows: TripRow[]): void {
  const db = getDb();
  db.withTransactionSync(() => {
    rows.forEach((t) => {
      db.runSync(
        `INSERT OR REPLACE INTO trips
         (id, source, destination, vehicle_id, vehicle_reg_no, driver_id, cargo_weight_kg,
          planned_distance, final_odometer, fuel_consumed, revenue, status, contract_id,
          created_at, updated_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [t.id, t.source, t.destination, t.vehicle_id, t.vehicle?.reg_no ?? null, t.driver_id,
         t.cargo_weight_kg, t.planned_distance, t.final_odometer, t.fuel_consumed, t.revenue,
         t.status, t.contract_id, t.created_at, t.updated_at]
      );
    });
  });
}

export function getLocalDriverTrips(driverId: string) {
  return getDb().getAllSync<any>(
    `SELECT * FROM trips WHERE driver_id = ? ORDER BY updated_at DESC`,
    [driverId]
  );
}

export function markTripCompletedLocally(tripId: string, finalOdometer: number, fuelConsumed: number): void {
  getDb().runSync(
    `UPDATE trips SET status = 'completed', final_odometer = ?, fuel_consumed = ?, synced = 0, updated_at = datetime('now') WHERE id = ?`,
    [finalOdometer, fuelConsumed, tripId]
  );
}

// ─── fuel_logs ────────────────────────────────────────────────
export function insertFuelLogLocally(log: { id: string; vehicle_id: string; trip_id: string | null; liters: number; cost: number; logged_at: string }): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO fuel_logs (id, vehicle_id, trip_id, liters, cost, logged_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [log.id, log.vehicle_id, log.trip_id, log.liters, log.cost, log.logged_at]
  );
}

// ─── mutation_queue ─────────────────────────────────────────────
export type MutationType = 'complete_trip' | 'assign_contract' | 'create_fuel_log';

export function enqueueMutation(type: MutationType, payload: Record<string, unknown>): void {
  getDb().runSync(
    'INSERT INTO mutation_queue (id, type, payload_json, created_at, attempts) VALUES (?, ?, ?, datetime(\'now\'), 0)',
    [`${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, JSON.stringify(payload)]
  );
}

export function getQueuedMutations() {
  return getDb().getAllSync<{ id: string; type: MutationType; payload_json: string; attempts: number }>(
    'SELECT * FROM mutation_queue ORDER BY created_at ASC'
  );
}

export function removeMutation(id: string): void {
  getDb().runSync('DELETE FROM mutation_queue WHERE id = ?', [id]);
}

export function bumpMutationAttempt(id: string, error: string): void {
  getDb().runSync('UPDATE mutation_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?', [error, id]);
}

export function getQueueSize(): number {
  const row = getDb().getFirstSync<{ n: number }>('SELECT COUNT(*) as n FROM mutation_queue');
  return row?.n ?? 0;
}
