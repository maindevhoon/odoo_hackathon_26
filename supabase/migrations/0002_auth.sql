-- ============================================================
-- TransitOps — 0002_auth.sql
-- Auto-create profiles trigger, get_my_role helper, RLS policies
-- ============================================================

-- ─── Auto-create profile on signup ───────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, region)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'driver'),
    new.raw_user_meta_data->>'region'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Helper: get current user's role ─────────────────────────
create or replace function public.get_my_role()
returns public.user_role language sql stable security definer as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ─── Drop Phase 0 open policies ──────────────────────────────
drop policy if exists "Phase0: authenticated full access" on public.profiles;
drop policy if exists "Phase0: authenticated full access" on public.vehicles;
drop policy if exists "Phase0: authenticated full access" on public.drivers;
drop policy if exists "Phase0: authenticated full access" on public.trips;
drop policy if exists "Phase0: authenticated full access" on public.maintenance_logs;
drop policy if exists "Phase0: authenticated full access" on public.fuel_logs;
drop policy if exists "Phase0: authenticated full access" on public.expenses;
drop policy if exists "Phase0: authenticated full access" on public.contracts;
drop policy if exists "Phase0: authenticated full access" on public.driver_progress;

-- ─── profiles ────────────────────────────────────────────────
-- Users can always read their own profile
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());

-- fleet_manager can read all profiles
create policy "profiles: fleet_manager read all" on public.profiles
  for select to authenticated using (public.get_my_role() = 'fleet_manager');

-- Users can update their own profile (name, region only)
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- fleet_manager can insert profiles (for creating staff accounts)
create policy "profiles: fleet_manager insert" on public.profiles
  for insert to authenticated with check (public.get_my_role() = 'fleet_manager');

-- ─── vehicles ────────────────────────────────────────────────
-- All staff can read vehicles
create policy "vehicles: staff read" on public.vehicles
  for select to authenticated
  using (public.get_my_role() in ('fleet_manager', 'safety_officer', 'financial_analyst'));

-- Only fleet_manager can write
create policy "vehicles: fleet_manager write" on public.vehicles
  for all to authenticated
  using (public.get_my_role() = 'fleet_manager')
  with check (public.get_my_role() = 'fleet_manager');

-- Drivers can read vehicles (for trip selection on mobile)
create policy "vehicles: driver read" on public.vehicles
  for select to authenticated using (public.get_my_role() = 'driver');

-- ─── drivers ─────────────────────────────────────────────────
-- fleet_manager + safety_officer: full CRUD
create policy "drivers: fleet_manager + safety write" on public.drivers
  for all to authenticated
  using (public.get_my_role() in ('fleet_manager', 'safety_officer'))
  with check (public.get_my_role() in ('fleet_manager', 'safety_officer'));

-- financial_analyst: read only
create policy "drivers: financial_analyst read" on public.drivers
  for select to authenticated using (public.get_my_role() = 'financial_analyst');

-- Driver: read their own driver record
create policy "drivers: read own" on public.drivers
  for select to authenticated using (profile_id = auth.uid());

-- Driver: update their own status
create policy "drivers: update own status" on public.drivers
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ─── trips ───────────────────────────────────────────────────
-- fleet_manager: full access
create policy "trips: fleet_manager full" on public.trips
  for all to authenticated
  using (public.get_my_role() = 'fleet_manager')
  with check (public.get_my_role() = 'fleet_manager');

-- safety_officer + financial_analyst: read
create policy "trips: staff read" on public.trips
  for select to authenticated
  using (public.get_my_role() in ('safety_officer', 'financial_analyst'));

-- Driver: read their own trips
create policy "trips: driver read own" on public.trips
  for select to authenticated
  using (driver_id in (select id from public.drivers where profile_id = auth.uid()));

-- Driver: update their own active trips (complete/fuel)
create policy "trips: driver update own" on public.trips
  for update to authenticated
  using (driver_id in (select id from public.drivers where profile_id = auth.uid()))
  with check (driver_id in (select id from public.drivers where profile_id = auth.uid()));

-- ─── maintenance_logs ─────────────────────────────────────────
-- fleet_manager + safety_officer: full access
create policy "maintenance: fleet + safety full" on public.maintenance_logs
  for all to authenticated
  using (public.get_my_role() in ('fleet_manager', 'safety_officer'))
  with check (public.get_my_role() in ('fleet_manager', 'safety_officer'));

-- financial_analyst: read only
create policy "maintenance: financial read" on public.maintenance_logs
  for select to authenticated using (public.get_my_role() = 'financial_analyst');

-- ─── fuel_logs ───────────────────────────────────────────────
-- fleet_manager + financial_analyst: full access
create policy "fuel_logs: fleet + financial full" on public.fuel_logs
  for all to authenticated
  using (public.get_my_role() in ('fleet_manager', 'financial_analyst'))
  with check (public.get_my_role() in ('fleet_manager', 'financial_analyst'));

-- safety_officer: read
create policy "fuel_logs: safety read" on public.fuel_logs
  for select to authenticated using (public.get_my_role() = 'safety_officer');

-- Driver: create fuel logs for their own trips
create policy "fuel_logs: driver create" on public.fuel_logs
  for insert to authenticated
  with check (
    trip_id in (
      select t.id from public.trips t
      join public.drivers d on d.id = t.driver_id
      where d.profile_id = auth.uid()
    )
    or trip_id is null
  );

create policy "fuel_logs: driver read own" on public.fuel_logs
  for select to authenticated
  using (
    trip_id in (
      select t.id from public.trips t
      join public.drivers d on d.id = t.driver_id
      where d.profile_id = auth.uid()
    )
  );

-- ─── expenses ─────────────────────────────────────────────────
-- fleet_manager + financial_analyst: full access
create policy "expenses: fleet + financial full" on public.expenses
  for all to authenticated
  using (public.get_my_role() in ('fleet_manager', 'financial_analyst'))
  with check (public.get_my_role() in ('fleet_manager', 'financial_analyst'));

-- Others: read
create policy "expenses: others read" on public.expenses
  for select to authenticated
  using (public.get_my_role() in ('safety_officer', 'driver'));

-- ─── contracts ────────────────────────────────────────────────
-- fleet_manager: full access
create policy "contracts: fleet_manager full" on public.contracts
  for all to authenticated
  using (public.get_my_role() = 'fleet_manager')
  with check (public.get_my_role() = 'fleet_manager');

-- Driver: read contracts they qualify for (tier >= min_tier)
create policy "contracts: driver read qualified" on public.contracts
  for select to authenticated
  using (
    public.get_my_role() = 'driver' and
    status in ('open', 'assigned') and
    exists (
      select 1
      from public.driver_progress dp
      join public.drivers d on d.id = dp.driver_id
      where d.profile_id = auth.uid()
        and (
          (dp.tier = 'bronze') or
          (dp.tier = 'silver'   and min_tier in ('bronze', 'silver')) or
          (dp.tier = 'gold'     and min_tier in ('bronze', 'silver', 'gold')) or
          (dp.tier = 'platinum')
        )
    )
  );

-- Driver: update their own assigned contract (accept)
create policy "contracts: driver update own" on public.contracts
  for update to authenticated
  using (
    driver_id in (select id from public.drivers where profile_id = auth.uid())
  );

-- ─── driver_progress ─────────────────────────────────────────
-- fleet_manager + safety_officer: read all
create policy "progress: staff read" on public.driver_progress
  for select to authenticated
  using (public.get_my_role() in ('fleet_manager', 'safety_officer'));

-- Driver: read own progress
create policy "progress: driver read own" on public.driver_progress
  for select to authenticated
  using (
    driver_id in (select id from public.drivers where profile_id = auth.uid())
  );

-- Only system (RPC) should update progress — no direct client write
