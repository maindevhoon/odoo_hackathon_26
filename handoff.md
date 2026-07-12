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
| **Phase 7** | Offline Hardening (Mobile) | **Pending** | Sync queue, SQLite synchronization, mobile ui views. |

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

## 6. Next Steps for Handoff

For the team or agent picking up the remaining work (Phase 7):

1. **Initialize Sync worker in `packages/shared`:** Write sync handlers using `updated_at` timestamps to push mutations to Supabase and pull matching logs.
2. **Setup SQLite tables in Driver App:** Establish local schemas mirroring `contracts`, `trips`, `fuel_logs`, and `driver_progress`.
3. **Write Mobile Views:** 
   - Login page.
   - Eligible contract board.
   - Active trip screen (to report fuel logs and distance offline).
   - Driver profile displaying tier progress, completed contracts, and leaderboard rankings.
