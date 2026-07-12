# TransitOps — Project Plan

Smart Transport Operations Platform. Full spec in
`problem_statement/TransitOps Smart Transport Operations Platform.md`.
Build guide for coding agents: `AGENTS.md` (untracked).

## Context

8-hour hackathon build. Beyond the base spec (vehicle/driver/trip/maintenance/fuel management,
RBAC, KPI dashboard, enforced business rules) we add a **core differentiator**: drivers are gig
workers with a **progression path** — they earn XP from quality-weighted completed work, climb
**tiers** (Bronze → Silver → Gold → Platinum), and unlock **tier-gated weekly contracts**
(a ~1-week contract is the unit of work, not per-trip freelancing). This gives drivers upward
mobility and lets companies source pre-vetted quality drivers.

Hackathon constraints on top of the spec:
- **Offline-first, on-device DB** — must mostly work offline; online allowed where it adds value.
- **Two clients, one backend:**
  - **Admin dashboard = web on PC** (Fleet Manager, Safety Officer, Financial Analyst): CRUD,
    dispatch, maintenance, KPIs, reports, contract posting.
  - **Driver app = mobile** (Expo/React Native): offline-first, on-device SQLite; tier-gated
    contract board, run trips, log fuel, view XP/tier/leaderboard.

## Stack

Monorepo (pnpm workspaces):
```
apps/admin      Vite + React + TS, React Router, Tailwind + shadcn/ui, Recharts   (web, PC)
apps/driver     Expo (RN) + TS, expo-router, NativeWind, victory-native, expo-sqlite  (mobile)
packages/shared TS types + business-rule services + Supabase client (used by both)
supabase/       SQL migrations, RLS policies, RPC functions, seed
```
- **Backend:** Supabase — Postgres, Auth (email/password), RLS for RBAC, Realtime for contract
  board + leaderboard.
- **Driver offline:** expo-sqlite = local source of truth for reads + offline write queue; sync
  worker pushes/pulls to Supabase on reconnect.

## Deployment (post-hackathon)

Target: user's **personal Google Cloud VM** for 100% uptime. Build against Supabase cloud now;
migrate later to **self-hosted Supabase (Docker Compose)** on the VM — client code is identical,
only the URL/anon key change. Admin static build served via nginx on the same VM.

## Data model

Base: `profiles`/roles, `vehicles`, `drivers`, `trips`, `maintenance_logs`, `fuel_logs`, `expenses`.
Differentiator: `contracts` (weekly, `min_tier` gate, status open→assigned→active→completed/
cancelled/breached), `driver_progress` (`xp`, `tier`). Trips gain `contract_id`. SQLite mirror adds
`updated_at`/`synced` + a `mutation_queue`. Full field list in `AGENTS.md` §3.

## Mandatory business rules (graded)

Enforced once in `packages/shared/services/`, transactional for multi-row writes:
unique reg#; Retired/In-Shop excluded from dispatch; expired-license/Suspended drivers blocked;
no double-booking; cargo ≤ capacity; dispatch→both On Trip; complete→both Available;
cancel→restore; active maintenance→In Shop; close maintenance→Available (unless Retired).
Trip lifecycle: Draft → Dispatched → Completed → Cancelled.

## Build order

- **Phase 0** — Scaffold: monorepo, both apps boot, Supabase migrations + RLS + seed
  (Van-05 500kg, driver Alex), SQLite schema/migration runner.
- **Phase 1** — Auth + RBAC (both clients; offline session on driver).
- **Phase 2** — Vehicle & Driver CRUD (admin) + search/filter/sort.
- **Phase 3** — Trip management + all business rules (the graded core).
- **Phase 4** — Maintenance + Fuel/Expense with auto status transitions.
- **Phase 5** — Dashboard + Reports (KPIs, ROI, fuel efficiency, utilization, CSV, charts).
- **Phase 6** — Contracts + Tiers + Leaderboard (Realtime differentiator).
- **Phase 7** — Offline hardening + polish (airplane-mode sync, dark mode, states).

## KPI / report formulas

- Fleet Utilization % = on_trip / (total − retired) × 100
- Fuel Efficiency = distance / fuel consumed
- Operational Cost (per vehicle) = Σ fuel + Σ maintenance (+ expenses)
- Vehicle ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost

## Verification (demo script)

Spec Step 1–9 walkthrough (register → dispatch → complete → maintenance → reports) plus negative
tests (600kg blocked, expired-license blocked, double-booking blocked, Retired/In-Shop hidden),
contract/tier realtime test, and airplane-mode offline sync test. Details in `AGENTS.md` §10.
