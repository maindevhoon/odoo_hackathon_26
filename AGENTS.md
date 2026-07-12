# AGENTS.md — TransitOps Build Guide

> Read this fully before writing code. It is the single source of truth for architecture,
> data model, business rules, and conventions. The product spec lives in
> `problem_statement/TransitOps Smart Transport Operations Platform.md`.

---

## 1. What we are building

**TransitOps** — a smart transport-operations platform that digitizes vehicle, driver, dispatch,
maintenance, and expense management, enforces business rules, and surfaces operational insights.

On top of the base spec we add a **core differentiator**: drivers are gig workers with a
**progression path**. They earn XP from quality-weighted completed work, climb **tiers**
(Bronze → Silver → Gold → Platinum), and unlock **tier-gated weekly contracts**. This solves both
pains in the brief: driver upward mobility, and companies sourcing pre-vetted quality drivers.
The unit of work is a **~1-week contract**, not per-trip freelancing.

### Two clients, one backend
| Client | Platform | Users | Responsibilities |
|---|---|---|---|
| `apps/admin` | **Web (PC)** | Fleet Manager, Safety Officer, Financial Analyst | CRUD, dispatch, maintenance, KPIs, reports, **posting contracts** |
| `apps/driver` | **Mobile (phone)** | Driver | Offline-first; tier-gated contract board, run trips, log fuel, view XP/tier/leaderboard |

Both talk to one **Supabase** project (Postgres + Auth + RLS + Realtime).

---

## 2. Tech stack (do not deviate without flagging)

**Monorepo** (pnpm workspaces):
```
apps/
  admin/     # Vite + React + TS, React Router, Tailwind + shadcn/ui, Recharts
  driver/    # Expo (React Native) + TS, expo-router, NativeWind, victory-native, expo-sqlite
packages/
  shared/    # TS types + business-rule services + Supabase client factory (used by BOTH apps)
supabase/    # SQL migrations, RLS policies, seed
```

- **Backend:** Supabase — Postgres, Auth (email/password), Row-Level Security for RBAC, Realtime for
  contract board + leaderboard.
- **Driver offline:** `expo-sqlite` is the on-device source of truth for reads + an offline write
  queue. A sync worker pushes queued mutations to Supabase on reconnect and pulls updates.
- **Admin** is desk-bound/online-first; local caching optional.
- **Language:** TypeScript everywhere. Strict mode on.

### Deployment (post-hackathon)
Build against **Supabase cloud** now. Later self-host **Supabase via Docker Compose** on the user's
**personal GCP VM** for 100% uptime — client code is identical, only the URL/anon key change. Admin
static build served by nginx on the same VM.

---

## 3. Data model

Postgres tables in Supabase; the driver app mirrors the read-relevant subset into SQLite.

### Base entities (from spec)
- **users** — Supabase `auth.users` + a `profiles` row (`id`, `full_name`, `role`, `region`).
- **roles** — enum: `fleet_manager | safety_officer | financial_analyst | driver`.
- **vehicles** — `id`, `reg_no` (UNIQUE), `name_model`, `type`, `max_load_kg`, `odometer`,
  `acquisition_cost`, `status` (`available | on_trip | in_shop | retired`), `region`.
- **drivers** — `id`, `profile_id`, `name`, `license_no`, `license_category`, `license_expiry`,
  `contact`, `safety_score`, `status` (`available | on_trip | off_duty | suspended`).
- **trips** — `id`, `source`, `destination`, `vehicle_id`, `driver_id`, `cargo_weight_kg`,
  `planned_distance`, `final_odometer`, `fuel_consumed`, `revenue`,
  `status` (`draft | dispatched | completed | cancelled`), `contract_id` (nullable).
- **maintenance_logs** — `id`, `vehicle_id`, `type`, `description`, `cost`, `opened_at`,
  `closed_at`, `is_active`.
- **fuel_logs** — `id`, `vehicle_id`, `trip_id?`, `liters`, `cost`, `logged_at`.
- **expenses** — `id`, `vehicle_id?`, `trip_id?`, `category` (`toll | maintenance | other`),
  `amount`, `logged_at`.

### Differentiator entities
- **contracts** — `id`, `company_id`, `title`, `vehicle_class`, `cargo_type`, `region`,
  `min_tier` (`bronze | silver | gold | platinum`), `pay`, `start_date`, `end_date`,
  `driver_id?`, `status` (`open | assigned | active | completed | cancelled | breached`).
- **driver_progress** — `driver_id` (PK), `xp`, `tier`, `contracts_completed`,
  `contracts_breached`, `updated_at`.

### Sync bookkeeping (SQLite side)
Every mirrored table has `updated_at` and a `synced` boolean. A local `mutation_queue` table
(`id`, `table`, `op`, `payload_json`, `created_at`) records offline writes for replay.

---

## 4. Mandatory business rules (MUST enforce — these are graded)

Implement **once** in `packages/shared/services/` so both clients share identical logic. Never
duplicate rule logic in UI components.

1. `reg_no` must be unique (DB constraint + friendly pre-check).
2. **Retired** or **In Shop** vehicles never appear in the dispatch selection pool.
3. Drivers with **expired license** (`license_expiry < today`) or **Suspended** status cannot be
   assigned to trips.
4. A driver or vehicle already **On Trip** cannot be assigned to another trip.
5. `cargo_weight_kg` must **not exceed** the vehicle's `max_load_kg`.
6. **Dispatch** a trip → vehicle and driver status both become **On Trip**.
7. **Complete** a trip (requires `final_odometer` + `fuel_consumed`) → both back to **Available**.
8. **Cancel** a dispatched trip → restore vehicle and driver to **Available**.
9. Creating an **active maintenance** record → vehicle status becomes **In Shop** (hidden from dispatch).
10. **Closing** maintenance → vehicle back to **Available** (unless **Retired**).

Trip lifecycle: `Draft → Dispatched → Completed → Cancelled`.

All status transitions that touch multiple rows (trip + vehicle + driver) must be **transactional**
(Postgres RPC / `rpc()` function, or a single SQLite transaction offline).

---

## 5. Differentiator logic

- **Contract board (Realtime):** admin posts a contract with a `min_tier` gate. Driver app subscribes
  and shows **only contracts the driver qualifies for** (`driver_progress.tier >= min_tier`).
- **Accept:** driver accepts → contract `open → assigned`; trips run under `contract_id`.
- **XP / tier:** on contract **completion**, roll up performance (safety_score + on-time +
  cargo-handling) into XP; recompute tier from XP thresholds. Mid-contract **breach/cancel**
  penalizes XP (reliability signal). Keep thresholds in `packages/shared/services/progress.ts`.
- **Tier unlocks:** Bronze = local light cargo; Silver = mid; Gold = van / high-value goods;
  Platinum = long-haul / truck (e.g. Amazon-truck-tier).
- **Leaderboard (Realtime):** drivers ranked by XP/tier; updates live across clients.

---

## 6. Build order (phased — pick up the lowest incomplete phase)

Each phase should end compiling and demoable. See `/Users/dev/.claude/plans/snoopy-growing-kurzweil.md`
for time budgets.

- **Phase 0 — Scaffold:** monorepo, both apps boot, Supabase project, SQL migrations + RLS + seed
  (seed the spec walkthrough: `Van-05` 500kg, driver `Alex`). SQLite schema + migration runner.
- **Phase 1 — Auth + RBAC:** Supabase email/password on both clients; role-gated routes; offline
  session persistence on driver app.
- **Phase 2 — Vehicle & Driver CRUD** (admin): full fields + search/filter/sort.
- **Phase 3 — Trip management + business rules** (admin dispatch, driver execution): the graded core —
  all rules in `shared/services/trips.ts`.
- **Phase 4 — Maintenance + Fuel/Expense:** auto status transitions; per-vehicle operational cost.
- **Phase 5 — Dashboard + Reports** (admin): KPIs, ROI, fuel efficiency, utilization; CSV export; charts.
- **Phase 6 — Contracts + Tiers + Leaderboard:** the differentiator (Realtime).
- **Phase 7 — Offline hardening + polish:** airplane-mode read/write/queue/sync; dark mode; empty/error states.

---

## 7. KPIs & report formulas (get these exact)

- **Fleet Utilization %** = vehicles `on_trip` / (total − `retired`) × 100.
- **Fuel Efficiency** = trip distance / fuel consumed (km per liter).
- **Operational Cost (per vehicle)** = Σ fuel cost + Σ maintenance cost (+ expenses).
- **Vehicle ROI** = `(Revenue − (Maintenance + Fuel)) / Acquisition Cost`.
- Dashboard KPIs: Active Vehicles, Available Vehicles, In Maintenance, Active Trips, Pending Trips,
  Drivers On Duty, Fleet Utilization %. Filters: vehicle type, status, region.

---

## 8. Conventions

- **Rule logic lives in `packages/shared`**, never in components. UI calls shared services.
- **Multi-row writes are transactional** (Supabase RPC functions in `supabase/functions.sql`).
- **Naming:** `snake_case` in DB/SQL, `camelCase` in TS; map at the data layer.
- **Enums** are TS string-literal unions mirrored to Postgres enums / `check` constraints — single
  definition in `packages/shared/types.ts`.
- **RBAC** enforced at two layers: Supabase **RLS policies** (authoritative) + client route guards (UX).
- **Env:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` per client via `.env`; never commit keys. Provide
  `.env.example`.
- **Dates** stored UTC ISO; license-expiry comparisons use date-only.
- Keep components small; colocate feature code under `apps/*/src/features/<feature>/`.

---

## 9. Definition of done (per feature)

- Compiles, no type errors, lints clean.
- Enforces every relevant business rule from §4 (with a negative-path check).
- Works offline on the driver app if it's a driver-facing write.
- Reflected in the demo seed so the spec's Step 1–9 walkthrough passes.

---

## 10. Verification (end-to-end demo script)

1. Register `Van-05` (500kg, Available) + driver `Alex` (valid license).
2. Create trip cargo 450kg → dispatch → validates ≤500 → vehicle+driver become **On Trip**.
3. Complete trip with final odometer + fuel → both back to **Available**.
4. Add `Oil Change` maintenance → vehicle → **In Shop**, hidden from dispatch; close → **Available**.
5. Reports/KPIs update (operational cost, fuel efficiency, ROI).
6. **Negative:** 600kg blocked; expired-license driver blocked; double-booking blocked;
   Retired/In-Shop vehicle absent from dispatch list.
7. **Contract/tier:** Gold-only contract invisible to a Bronze driver; completing a contract raises
   XP → tier/leaderboard update live on a second client.
8. **Offline:** airplane mode → create trip + fuel log persist locally → reconnect → sync to Supabase.
9. CSV export valid; dark mode toggles.
