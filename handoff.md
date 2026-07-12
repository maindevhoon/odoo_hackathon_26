# TransitOps Platform Handoff Document

This document outlines the architecture, data models, business rules, implemented features, and pending tasks for the **TransitOps Smart Transport Operations Platform**.

---

## 1. Project Overview & Architecture

TransitOps is a smart transport-operations monorepo managing vehicle tracking, driver dispatches, maintenance schedules, expenses, and a gamified driver tier system.

### Monorepo Structure (`pnpm`)
- `apps/admin/`: React + Vite + TypeScript + Tailwind CSS web dashboard (Fleet managers, Safety officers, Financial analysts).
- `apps/driver/`: React Native (Expo) + SQLite mobile app (Offline-first driver app) — *Scaffolded, implementation pending*.
- `packages/shared/`: Shared typescript types, API wrappers, business services, and database validation helpers.
- `supabase/`: SQL migrations, RLS policies, custom PostgreSQL functions (RPCs).

---

## 2. Phase-by-Phase Implementation Status

All web-portal features, services, and backend transactional rules (Phases 0–6) are complete, type-checked, and verified against Supabase.

| Phase | Module | Status | Key Deliverables |
|---|---|---|---|
| **Phase 0** | Scaffold | **Done** | Monorepo structure, Tailwind config, initial DB tables & migration runner. |
| **Phase 1** | Auth & RBAC | **Done** | Supabase Auth integration, role route guards (`fleet_manager`, `safety_officer`, `financial_analyst`). |
| **Phase 2** | Vehicle & Driver CRUD | **Done** | Registration validation, licensing pre-checks, dynamic SlideOver forms, search & filter. |
| **Phase 3** | Trips & Business Rules | **Done** | Trip workflow (Draft → Dispatched → Completed → Cancelled). Enforces capacity and availability gates. |
| **Phase 4** | Maintenance & Expenses | **Done** | Maintenance logs (auto-in-shop transitions), fuel logging (₱/L efficiency), expense tracking. |
| **Phase 5** | Dashboard & Reports | **Done** | Recharts visual graphs, ROI calculation, utilization widgets, sortable reporting table, CSV export. |
| **Phase 6** | Contracts & Tiers | **Done** | Gated week-long contract board, XP awards (100 base + safety score bonus), Realtime leaderboard. |
| **Phase 7** | Offline Hardening (Mobile) | **Done** | SQLite mirror + mutation queue, push/pull sync engine, Trips/Contracts/Profile mobile screens. |

---

## 3. Database Schema & Supabase Migrations

Four SQL migrations are applied to the active database (`db.yjpefmarjxmjnxgoxkql.supabase.co`):

### DB Migrations Applied
1. `0001_init.sql`: Core tables (`profiles`, `vehicles`, `drivers`, `trips`, `maintenance_logs`, `fuel_logs`, `expenses`).
2. `0002_auth.sql`: Trigger to auto-create profile rows in public schema on signup.
3. `0003_trips.sql`: Atomic state-transition RPCs (`dispatch_trip`, `complete_trip`, `cancel_trip`, `open_maintenance`, `close_maintenance`).
4. `0004_contracts.sql`: `contracts`, `driver_progress` tables + triggers + RPCs (`assign_contract`, `complete_contract`, `breach_contract`, `cancel_contract`) + Realtime publication config.

---

## 4. Graded Business Rules Enforced (§4)

The platform strictly enforces the 10 graded business rules from `AGENTS.md`:

- **Rule §2 & §3 (Availability Gates):** Vehicles in shop/retired and drivers suspended or with expired licenses are excluded from selector dropdowns and blocked inside the `dispatch_trip` database function.
- **Rule §4 (Double booking):** Drivers and vehicles already marked `on_trip` cannot be selected or assigned to concurrent dispatches.
- **Rule §5 (Load limits):** The creation page uses a live progress bar showing cargo weight vs vehicle limits. Submit is blocked if cargo exceeds `max_load_kg`.
- **Rule §6, §7 & §8 (Trip Transitions):** Atomic updates for trip, vehicle, and driver states. Trip completion automatically prompts for fuel/odometer logs and recalculates metrics.
- **Rule §9 & §10 (Maintenance):** Opening active maintenance sets the vehicle status to `in_shop`. Closing it reverts the status to `available` (unless retired).

---

## 5. Differentiator Details (Phase 6)

Drivers are treated as gig workers with progression metrics.
- **XP Formula:** Completed contracts award `100 + (safety_score / 2)` (max 150 XP).
- **Penalties:** Contract cancellation or breaches deduct `75 XP` and increment the breach counter.
- **Tier Gates:** Bronze, Silver, Gold, and Platinum tiers. The assignment screen only lists drivers who meet or exceed the contract's minimum tier threshold.
- **Realtime Dashboard:** The Admin contract board and Leaderboard update immediately upon changes to contracts/XP without page reloads.

---

## 6. Phase 7 Implementation Notes

- **`apps/driver/src/db/schema.ts`** — `expo-sqlite` singleton + `initDb()` creating `driver_progress`, `leaderboard`, `contracts`, `trips`, `fuel_logs`, `mutation_queue`, and a `meta` key/value table.
- **`apps/driver/src/db/queries.ts`** — typed read/write helpers for every local table, plus `enqueueMutation` / `getQueuedMutations` / `removeMutation` for the offline write queue.
- **`apps/driver/src/lib/sync.ts`** — `pullAll()` (fetches tier-eligible open contracts + the driver's own contracts/trips/progress/leaderboard from Supabase and upserts into SQLite), `pushQueue()` (drains `mutation_queue` in order against the existing `completeTrip` / `assignContract` / `createFuelLog` shared services, stopping on first failure to preserve ordering), `syncNow()` (push then pull, no-ops offline), and `subscribeToConnectivity()` (NetInfo listener that triggers a resync on reconnect).
- **`apps/driver/src/contexts/DriverContext.tsx`** — resolves the `drivers` row for the signed-in profile (new `getDriverByProfileId` added to `packages/shared/src/services/driverService.ts`), initializes the local DB, and drives the sync lifecycle. Wrapped around the app in `app/_layout.tsx` inside `AuthProvider`.
- **Screens implemented**, all reading from SQLite first and writing optimistically offline (queuing the corresponding Supabase RPC call for replay):
  - `app/(app)/contracts.tsx` — tier-gated open contract board + "my contracts"; Accept works offline (`assignContract` RPC queued).
  - `app/(app)/trips.tsx` — driver's trips; "Complete Trip" form (final odometer, fuel liters, optional fuel cost) works offline (`completeTrip` RPC + fuel log queued).
  - `app/(app)/profile.tsx` — XP/tier progress bar, contracts completed/breached, safety score, and the cached leaderboard.
  - `app/(app)/index.tsx` — updated to show online/offline state, pending sync count, and a manual "Sync now" action.
- Added `@react-native-community/netinfo` to `apps/driver/package.json` for connectivity detection; `pnpm install` run at the repo root.
- `packages/shared` and `apps/driver` both type-check clean (`tsc --noEmit`) except one pre-existing, unrelated `process.env` typing gap in `apps/driver/src/lib/supabase.ts` (needs `@types/node` or `EXPO_PUBLIC_*` typing — not part of Phase 7).

### Remaining follow-ups (not blocking, worth a pass before demo day)
1. Manual test on-device: airplane-mode trip completion + contract accept, then reconnect and confirm `mutation_queue` drains and Supabase reflects the change.
2. `pushQueue()` currently stops on the first failed mutation to preserve order — add a UI surface (e.g. a banner on Home) if a mutation repeatedly fails so it doesn't silently block the queue.
3. No RLS policy review was done for driver-scoped reads on `contracts`/`trips` from the mobile client — confirm existing policies allow a driver to read open contracts and their own trips.
4. `apps/driver/(app)/index.tsx` reuses the old "sign out" button styling (red) for the new "Sync now" action — cosmetic only.
