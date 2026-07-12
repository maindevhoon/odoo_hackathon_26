# TransitOps 🚚💨

### Smart Transport Operations & Trusted Worker-Mobility Platform
*A two-sided system built for next-generation logistics management, operational compliance, and gig-worker progression.*

---

## 🚀 The TransitOps Vision
Logistics companies struggle to find reliable, pre-vetted drivers for high-responsibility cargo, while drivers face low upward mobility in repetitive, dead-end gig work. 

**TransitOps** bridges this gap:
* **For Fleet Operations:** A clean, Tesla-inspired admin dashboard to track vehicles, dispatch trips, manage maintenance, log costs, analyze ROI, and post tier-gated weekly contracts.
* **For Workers (Drivers):** A professional mobility passport. By executing trips safely, drivers accumulate XP, rise through progression tiers (Bronze → Silver → Gold → Platinum), and unlock high-paying, long-haul weekly contracts.

---

## 🛠️ The Tech Stack

TransitOps is built as a highly scalable **monorepo** via `pnpm workspaces`:

```
apps/
  admin/       # React + Vite + TypeScript + Tailwind CSS + Recharts (Online Web Dashboard)
  driver/      # Expo (React Native) + TS + expo-router + expo-sqlite (Offline-First Mobile App)
packages/
  shared/      # Common business service logic, validation helpers, type definitions, Supabase clients
supabase/      # DB Schema Migrations, Row-Level Security (RLS) policies, PG triggers, and RPC transactions
```

* **Database & Realtime:** Supabase (PostgreSQL) + Auth + Realtime.
* **Offline-First Synchronization:** On-device `expo-sqlite` on the driver client mirroring Supabase tables, paired with an offline mutation queue and sync engine.
* **Visualization:** Custom charts and graphs powered by `Recharts` (web dashboard).

---

## 🌟 Core Features & Progression Mechanics

### 1. Driver Progression Tiers & Gated Contracts
Drivers gain XP upon completing contracts based on their performance, which determines their qualified tier:
* **🥉 Bronze Tier (0 XP):** Local light cargo & short routes.
* **🥈 Silver Tier (500 XP):** Mid-haul routes + specialized/refrigerated cargo.
* **🥇 Gold Tier (1500 XP):** Van + high-value goods.
* **👑 Platinum Tier (3500 XP):** Long-haul / heavy truck logistics.

**Realtime Leaderboards** rank drivers dynamically by XP. Contract postings enforce strict **tier gates** via PostgreSQL RPCs: a driver cannot accept or be assigned a contract above their progression level.

### 2. Transactional Business Rules & Safety Gates
All core status transitions affecting multiple database tables run atomically through Supabase RPCs:
* **Vehicles in Shop/Retired:** Excluded from selection dropdowns and blocked from assignment.
* **Driver Expirations & Suspensions:** Drivers with expired licenses or suspended statuses are blocked from dispatches.
* **Double Booking Prevention:** Drivers or vehicles already active on a trip cannot be dispatched.
* **Load Constraints:** Live cargo weight bar validation dynamically alerts operators, preventing over-capacity dispatches.
* **Active Maintenance:** Vehicles entering maintenance automatically transition to `in_shop`. Closing maintenance returns them to `available`.

### 3. Financial Analytics & ROI Reporting
* **Fleet Utilization:** Realtime SVG visualization widget showing active vs available vehicles.
* **Vehicle ROI:** Calculated automatically via:
  $$\text{ROI} = \frac{\text{Revenue} - (\text{Fuel Cost} + \text{Maintenance Cost})}{\text{Acquisition Cost}} \times 100$$
* **Fuel Efficiency Tracker:** Evaluates performance based on kilometers traveled per liter (km/L).
* **Exporting:** Integrated client-side export utility to compile and download CSV reports.

---

## 📁 Repository Map

### Core Codebases
* **[apps/admin](file:///Users/dev/Documents/odoo-hack-26/apps/admin):** Admin web dashboard.
* **[apps/driver](file:///Users/dev/Documents/odoo-hack-26/apps/driver):** Driver mobile app codebase.
* **[packages/shared](file:///Users/dev/Documents/odoo-hack-26/packages/shared):** Shared models, services, and validation helpers.
* **[supabase/migrations](file:///Users/dev/Documents/odoo-hack-26/supabase/migrations):** Database migrations.

### Architecture & Design Docs
* **[DESIGN.md](file:///Users/dev/Documents/odoo-hack-26/DESIGN.md):** UI Design specification outlining the Tesla-inspired dark-navy visual system.
* **[AGENTS.md](file:///Users/dev/Documents/odoo-hack-26/AGENTS.md):** Main project build instructions and requirements.
* **[handoff.md](file:///Users/dev/Documents/odoo-hack-26/handoff.md):** Comprehensive phase-by-phase implementation log.
* **[plan.md](file:///Users/dev/Documents/odoo-hack-26/plan.md):** Overall monorepo development strategy.

---

## 🚀 Setup & Local Installation

### Prerequisites
* Node.js (v18+)
* `pnpm` (installed globally: `npm i -g pnpm`)
* Supabase CLI / Docker (if running database locally)

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
   * In `apps/admin/`, create a `.env` file based on `.env.example`:
     ```env
     VITE_SUPABASE_URL=https://yjpefmarjxmjnxgoxkql.supabase.co
     VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
     ```

4. **Run the Admin Web Portal:**
   ```bash
   pnpm --filter admin dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Run the Driver Mobile App:**
   ```bash
   pnpm --filter driver start
   ```

---

## 📊 Evaluation & Verification Scenario

You can verify the business rules and operations by following this walk-through:
1. **Create an Available Vehicle & Eligible Driver:** Add a vehicle (e.g., limit 1000kg) and assign a driver with a valid license.
2. **Post and Assign a Contract:** Post a contract with a `Gold` tier requirement. Verify that only drivers with Gold or Platinum tier progress can be selected.
3. **Dispatch a Trip:** Create a trip with a cargo weight of 800kg and click **Dispatch**. Verify that both the vehicle and driver status transition to `On Trip`.
4. **Negative Test (Cargo Limit):** Attempt to dispatch a trip with 1200kg cargo. Verify that validation blocks the action.
5. **Complete the Trip:** Enter the final odometer reading and fuel consumption. Verify that the vehicle/driver statuses return to `Available` and a new fuel log is auto-generated.
6. **Open Maintenance:** Send the vehicle to maintenance. Verify that its status updates to `In Shop` and it is hidden from the trip dispatch selectors.
