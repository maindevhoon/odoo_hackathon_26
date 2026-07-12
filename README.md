# TransitOps

## Smart Transport Operations and Trusted Worker-Mobility Platform

A comprehensive two-sided system built for next-generation logistics management, operational compliance, and gig-worker progression.

---

## TransitOps Vision

Logistics companies struggle to find reliable, pre-vetted drivers for high-responsibility cargo, while drivers face low upward mobility in repetitive, dead-end gig work.

**TransitOps** bridges this gap:

* **For Fleet Operations:** A comprehensive admin dashboard to track vehicles, dispatch trips, manage maintenance, log costs, analyze ROI, and post tier-gated weekly contracts.
* **For Workers (Drivers):** A professional mobility platform. By executing trips safely, drivers accumulate XP, rise through progression tiers (Bronze → Silver → Gold → Platinum), and unlock access to higher-value contracts.

---

## Technology Stack

TransitOps is built as a highly scalable **monorepo** via `pnpm workspaces`:

```
apps/
  admin/       # React + Vite + TypeScript + Tailwind CSS + Recharts (Web Dashboard)
  driver/      # Expo (React Native) + TypeScript + expo-router + expo-sqlite (Mobile App)
packages/
  shared/      # Common business service logic, validation helpers, type definitions, Supabase clients
supabase/      # Database schema migrations, Row-Level Security (RLS) policies, PostgreSQL triggers, and RPC transactions
```

* **Database and Realtime Services:** Supabase (PostgreSQL) with authentication and Realtime capabilities.
* **Offline-First Synchronization:** On-device `expo-sqlite` on the driver client mirrors Supabase tables, paired with an offline mutation queue and sync engine.
* **Data Visualization:** Custom charts and graphs powered by Recharts for the web dashboard.

---

## Core Features and Progression Mechanics

### 1. Driver Progression Tiers and Gated Contracts

Drivers gain experience points (XP) upon completing contracts based on their performance, which determines their qualified tier:

* **Bronze Tier (0 XP):** Local light cargo and short routes.
* **Silver Tier (500 XP):** Mid-haul routes with specialized or refrigerated cargo.
* **Gold Tier (1500 XP):** Van operations and high-value goods.
* **Platinum Tier (3500 XP):** Long-haul and heavy truck logistics.

Realtime leaderboards rank drivers dynamically by XP. Contract postings enforce strict tier gates via PostgreSQL remote procedure calls (RPCs): a driver cannot accept or be assigned a contract above their current progression level.

### 2. Transactional Business Rules and Safety Gates

All core status transitions affecting multiple database tables run atomically through Supabase RPCs:

* **Vehicles in Maintenance or Retired:** Excluded from selection dropdowns and blocked from assignment.
* **Driver License Expirations and Suspensions:** Drivers with expired licenses or suspended statuses are blocked from dispatches.
* **Double Booking Prevention:** Drivers or vehicles already active on a trip cannot be dispatched to another trip.
* **Load Constraints:** Live cargo weight validation dynamically prevents over-capacity dispatches.
* **Active Maintenance Management:** Vehicles entering maintenance automatically transition to `in_shop` status. Closing maintenance returns them to `available`.

### 3. Financial Analytics and ROI Reporting

* **Fleet Utilization:** Realtime visualization showing active versus available vehicles.
* **Vehicle Return on Investment (ROI):** Calculated automatically using the formula: Revenue minus (Fuel Cost plus Maintenance Cost) divided by Acquisition Cost, multiplied by 100.
* **Fuel Efficiency Tracking:** Evaluates performance based on kilometers traveled per liter (km/L).
* **Report Export:** Integrated client-side export utility to compile and download CSV reports.

---

## Repository Structure

### Core Codebases

* **apps/admin:** Admin web dashboard for fleet management.
* **apps/driver:** Driver mobile app for contract acceptance and trip execution.
* **packages/shared:** Shared models, services, and validation helpers.
* **supabase/migrations:** Database schema migrations and initialization scripts.

### Architecture and Design Documentation

* **DESIGN.md:** UI design specification and visual system standards.
* **AGENTS.md:** Primary project build instructions and technical requirements.
* **handoff.md:** Comprehensive phase-by-phase implementation log.
* **plan.md:** Overall monorepo development strategy and roadmap.

---

## Setup and Local Installation

### Prerequisites

* Node.js (version 18 or higher)
* `pnpm` (installed globally: `npm install -g pnpm`)
* Supabase CLI or Docker (optional, for local database setup)

### Installation Steps

1. **Clone the Repository:**
   ```bash
   git clone <repo-url>
   cd odoo-hack-26
   ```

2. **Install Dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**
   * In the `apps/admin/` directory, create a `.env` file based on `.env.example`:
     ```env
     VITE_SUPABASE_URL=<your-project-url>.supabase.co
     VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
     ```

4. **Run the Admin Web Portal:**
   ```bash
   pnpm --filter admin dev
   ```
   Open `http://localhost:5173` in your web browser.

5. **Run the Driver Mobile App:**
   ```bash
   pnpm --filter driver start
   ```

---

## Evaluation and Verification Scenario

You can verify the business rules and operations by following this comprehensive walk-through:

1. **Create an Available Vehicle and Eligible Driver:** Add a vehicle (for example, with a 1000kg load limit) and assign a driver with a valid license.
2. **Post and Assign a Contract:** Post a contract with a Gold tier requirement. Verify that only drivers with Gold or Platinum tier progress can be selected.
3. **Dispatch a Trip:** Create a trip with a cargo weight of 800kg and dispatch it. Verify that both the vehicle and driver status transition to "On Trip".
4. **Negative Test (Cargo Limit):** Attempt to dispatch a trip with 1200kg cargo. Verify that validation blocks the action.
5. **Complete the Trip:** Enter the final odometer reading and fuel consumption. Verify that the vehicle and driver statuses return to "Available" and a new fuel log is auto-generated.
6. **Initiate Maintenance:** Send the vehicle to maintenance. Verify that its status updates to "In Shop" and it is hidden from the trip dispatch selectors.
