-- ============================================================
-- TransitOps — 0001_init.sql
-- Full schema: enums, tables, constraints, RLS skeleton, seed
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────
create type public.user_role as enum (
  'fleet_manager', 'safety_officer', 'financial_analyst', 'driver'
);

create type public.vehicle_status as enum (
  'available', 'on_trip', 'in_shop', 'retired'
);

create type public.vehicle_type as enum (
  'van', 'truck', 'pickup', 'motorcycle', 'other'
);

create type public.driver_status as enum (
  'available', 'on_trip', 'off_duty', 'suspended'
);

create type public.trip_status as enum (
  'draft', 'dispatched', 'completed', 'cancelled'
);

create type public.expense_category as enum (
  'toll', 'maintenance', 'other'
);

create type public.tier as enum (
  'bronze', 'silver', 'gold', 'platinum'
);

create type public.contract_status as enum (
  'open', 'assigned', 'active', 'completed', 'cancelled', 'breached'
);

-- ─── Profiles ────────────────────────────────────────────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       public.user_role not null default 'driver',
  region     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Vehicles ────────────────────────────────────────────────
create table public.vehicles (
  id               uuid primary key default uuid_generate_v4(),
  reg_no           text not null unique,
  name_model       text not null,
  type             public.vehicle_type not null default 'van',
  max_load_kg      numeric(10,2) not null check (max_load_kg > 0),
  odometer         numeric(10,2) not null default 0,
  acquisition_cost numeric(12,2) not null default 0,
  status           public.vehicle_status not null default 'available',
  region           text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── Drivers ─────────────────────────────────────────────────
create table public.drivers (
  id               uuid primary key default uuid_generate_v4(),
  profile_id       uuid references public.profiles(id) on delete set null,
  name             text not null,
  license_no       text not null unique,
  license_category text not null default 'B',
  license_expiry   date not null,
  contact          text not null default '',
  safety_score     numeric(5,2) not null default 100 check (safety_score >= 0 and safety_score <= 100),
  status           public.driver_status not null default 'available',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── Trips ───────────────────────────────────────────────────
create table public.trips (
  id               uuid primary key default uuid_generate_v4(),
  source           text not null,
  destination      text not null,
  vehicle_id       uuid not null references public.vehicles(id),
  driver_id        uuid not null references public.drivers(id),
  cargo_weight_kg  numeric(10,2) not null check (cargo_weight_kg >= 0),
  planned_distance numeric(10,2) not null default 0,
  final_odometer   numeric(10,2),
  fuel_consumed    numeric(10,2),
  revenue          numeric(12,2) not null default 0,
  status           public.trip_status not null default 'draft',
  contract_id      uuid,                          -- FK added after contracts table
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── Maintenance Logs ─────────────────────────────────────────
create table public.maintenance_logs (
  id          uuid primary key default uuid_generate_v4(),
  vehicle_id  uuid not null references public.vehicles(id),
  type        text not null,
  description text not null default '',
  cost        numeric(12,2) not null default 0,
  opened_at   timestamptz not null default now(),
  closed_at   timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── Fuel Logs ───────────────────────────────────────────────
create table public.fuel_logs (
  id          uuid primary key default uuid_generate_v4(),
  vehicle_id  uuid not null references public.vehicles(id),
  trip_id     uuid references public.trips(id) on delete set null,
  liters      numeric(10,2) not null check (liters > 0),
  cost        numeric(12,2) not null check (cost >= 0),
  logged_at   timestamptz not null default now()
);

-- ─── Expenses ────────────────────────────────────────────────
create table public.expenses (
  id          uuid primary key default uuid_generate_v4(),
  vehicle_id  uuid references public.vehicles(id) on delete set null,
  trip_id     uuid references public.trips(id) on delete set null,
  category    public.expense_category not null default 'other',
  amount      numeric(12,2) not null check (amount >= 0),
  logged_at   timestamptz not null default now()
);

-- ─── Contracts ───────────────────────────────────────────────
create table public.contracts (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null,               -- profile id of posting company/manager
  title        text not null,
  vehicle_class text not null default '',
  cargo_type   text not null default '',
  region       text not null default '',
  min_tier     public.tier not null default 'bronze',
  pay          numeric(12,2) not null default 0,
  start_date   date not null,
  end_date     date not null,
  driver_id    uuid references public.drivers(id) on delete set null,
  status       public.contract_status not null default 'open',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Back-fill FK: trips → contracts
alter table public.trips
  add constraint trips_contract_id_fkey
  foreign key (contract_id) references public.contracts(id) on delete set null;

-- ─── Driver Progress ─────────────────────────────────────────
create table public.driver_progress (
  driver_id           uuid primary key references public.drivers(id) on delete cascade,
  xp                  numeric(12,2) not null default 0,
  tier                public.tier not null default 'bronze',
  contracts_completed integer not null default 0,
  contracts_breached  integer not null default 0,
  updated_at          timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────
create index idx_trips_vehicle   on public.trips(vehicle_id);
create index idx_trips_driver    on public.trips(driver_id);
create index idx_trips_status    on public.trips(status);
create index idx_vehicles_status on public.vehicles(status);
create index idx_drivers_status  on public.drivers(status);
create index idx_contracts_status on public.contracts(status);
create index idx_contracts_tier  on public.contracts(min_tier);
create index idx_maintenance_vehicle on public.maintenance_logs(vehicle_id);

-- ─── Updated_at triggers ─────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

create trigger trg_drivers_updated_at
  before update on public.drivers
  for each row execute function public.set_updated_at();

create trigger trg_trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

create trigger trg_contracts_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─── RLS: enable on all tables ───────────────────────────────
alter table public.profiles         enable row level security;
alter table public.vehicles         enable row level security;
alter table public.drivers          enable row level security;
alter table public.trips            enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.fuel_logs        enable row level security;
alter table public.expenses         enable row level security;
alter table public.contracts        enable row level security;
alter table public.driver_progress  enable row level security;

-- Temporary open policies (Phase 0) — replaced with role-gated in Phase 1
-- Authenticated users can read/write everything (tightened in Phase 1)
create policy "Phase0: authenticated full access" on public.profiles
  for all to authenticated using (true) with check (true);

create policy "Phase0: authenticated full access" on public.vehicles
  for all to authenticated using (true) with check (true);

create policy "Phase0: authenticated full access" on public.drivers
  for all to authenticated using (true) with check (true);

create policy "Phase0: authenticated full access" on public.trips
  for all to authenticated using (true) with check (true);

create policy "Phase0: authenticated full access" on public.maintenance_logs
  for all to authenticated using (true) with check (true);

create policy "Phase0: authenticated full access" on public.fuel_logs
  for all to authenticated using (true) with check (true);

create policy "Phase0: authenticated full access" on public.expenses
  for all to authenticated using (true) with check (true);

create policy "Phase0: authenticated full access" on public.contracts
  for all to authenticated using (true) with check (true);

create policy "Phase0: authenticated full access" on public.driver_progress
  for all to authenticated using (true) with check (true);

-- ─── Seed Data ───────────────────────────────────────────────
-- Vehicle: Van-05 (500 kg, Available)
insert into public.vehicles (id, reg_no, name_model, type, max_load_kg, odometer, acquisition_cost, status, region)
values (
  'aaaaaaaa-0001-0000-0000-000000000001',
  'Van-05',
  'Toyota HiAce Van',
  'van',
  500.00,
  12500.00,
  45000.00,
  'available',
  'Metro'
);

-- Vehicle: Truck-01 (5000 kg, Available)
insert into public.vehicles (id, reg_no, name_model, type, max_load_kg, odometer, acquisition_cost, status, region)
values (
  'aaaaaaaa-0001-0000-0000-000000000002',
  'Truck-01',
  'Isuzu Forward Truck',
  'truck',
  5000.00,
  45200.00,
  120000.00,
  'available',
  'Metro'
);

-- Vehicle: Pick-02 (1000 kg, In Shop)
insert into public.vehicles (id, reg_no, name_model, type, max_load_kg, odometer, acquisition_cost, status, region)
values (
  'aaaaaaaa-0001-0000-0000-000000000003',
  'Pick-02',
  'Ford Ranger Pickup',
  'pickup',
  1000.00,
  8900.00,
  60000.00,
  'in_shop',
  'North'
);

-- Driver: Alex (valid license)
insert into public.drivers (id, name, license_no, license_category, license_expiry, contact, safety_score, status)
values (
  'bbbbbbbb-0001-0000-0000-000000000001',
  'Alex Santos',
  'DL-ALEX-001',
  'B',
  '2028-12-31',
  '+63-9171234567',
  98.00,
  'available'
);

-- Driver: Maria (valid license)
insert into public.drivers (id, name, license_no, license_category, license_expiry, contact, safety_score, status)
values (
  'bbbbbbbb-0001-0000-0000-000000000002',
  'Maria Cruz',
  'DL-MARIA-002',
  'A',
  '2027-06-30',
  '+63-9189876543',
  92.00,
  'available'
);

-- Driver: Ben (expired license — for negative test)
insert into public.drivers (id, name, license_no, license_category, license_expiry, contact, safety_score, status)
values (
  'bbbbbbbb-0001-0000-0000-000000000003',
  'Ben Reyes',
  'DL-BEN-003',
  'B',
  '2024-01-01',
  '+63-9201112222',
  75.00,
  'off_duty'
);

-- Driver progress seeds
insert into public.driver_progress (driver_id, xp, tier, contracts_completed, contracts_breached)
values
  ('bbbbbbbb-0001-0000-0000-000000000001', 0, 'bronze', 0, 0),
  ('bbbbbbbb-0001-0000-0000-000000000002', 0, 'bronze', 0, 0),
  ('bbbbbbbb-0001-0000-0000-000000000003', 0, 'bronze', 0, 0);

-- Maintenance: Pick-02 in shop
insert into public.maintenance_logs (vehicle_id, type, description, cost, is_active)
values (
  'aaaaaaaa-0001-0000-0000-000000000003',
  'Engine Repair',
  'Full engine overhaul',
  8500.00,
  true
);
