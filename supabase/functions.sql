-- ============================================================
-- TransitOps — functions.sql
-- Postgres RPC functions (atomic, transactional)
-- Phase 3/4 will fill these in with full logic.
-- Phase 0: stubs exist so the DB is valid.
-- ============================================================

-- ─── dispatch_trip ────────────────────────────────────────────
-- Sets trip → dispatched, vehicle → on_trip, driver → on_trip
-- Business rules enforced inside (Phase 3 fills in full rules)
create or replace function public.dispatch_trip(p_trip_id uuid)
returns void language plpgsql security definer as $$
declare
  v_trip    public.trips%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_driver  public.drivers%rowtype;
begin
  -- Lock rows
  select * into v_trip    from public.trips    where id = p_trip_id for update;
  select * into v_vehicle from public.vehicles where id = v_trip.vehicle_id for update;
  select * into v_driver  from public.drivers  where id = v_trip.driver_id  for update;

  -- Validations (stub — Phase 3 fills in)
  if v_trip.status <> 'draft' then
    raise exception 'Trip must be in draft status to dispatch';
  end if;

  -- Transitions
  update public.trips    set status = 'dispatched' where id = p_trip_id;
  update public.vehicles set status = 'on_trip'    where id = v_trip.vehicle_id;
  update public.drivers  set status = 'on_trip'    where id = v_trip.driver_id;
end;
$$;

-- ─── complete_trip ────────────────────────────────────────────
create or replace function public.complete_trip(
  p_trip_id       uuid,
  p_final_odometer numeric,
  p_fuel_consumed  numeric
)
returns void language plpgsql security definer as $$
declare
  v_trip public.trips%rowtype;
begin
  select * into v_trip from public.trips where id = p_trip_id for update;

  if v_trip.status <> 'dispatched' then
    raise exception 'Trip must be dispatched to complete';
  end if;

  update public.trips set
    status         = 'completed',
    final_odometer = p_final_odometer,
    fuel_consumed  = p_fuel_consumed
  where id = p_trip_id;

  update public.vehicles set status = 'available' where id = v_trip.vehicle_id;
  update public.drivers  set status = 'available' where id = v_trip.driver_id;
end;
$$;

-- ─── cancel_trip ──────────────────────────────────────────────
create or replace function public.cancel_trip(p_trip_id uuid)
returns void language plpgsql security definer as $$
declare
  v_trip public.trips%rowtype;
begin
  select * into v_trip from public.trips where id = p_trip_id for update;

  if v_trip.status not in ('draft', 'dispatched') then
    raise exception 'Cannot cancel a completed or already cancelled trip';
  end if;

  update public.trips set status = 'cancelled' where id = p_trip_id;

  if v_trip.status = 'dispatched' then
    update public.vehicles set status = 'available' where id = v_trip.vehicle_id;
    update public.drivers  set status = 'available' where id = v_trip.driver_id;
  end if;
end;
$$;

-- ─── open_maintenance ─────────────────────────────────────────
create or replace function public.open_maintenance(
  p_vehicle_id  uuid,
  p_type        text,
  p_description text,
  p_cost        numeric
)
returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  insert into public.maintenance_logs (vehicle_id, type, description, cost, is_active)
  values (p_vehicle_id, p_type, p_description, p_cost, true)
  returning id into v_id;

  update public.vehicles set status = 'in_shop' where id = p_vehicle_id;

  return v_id;
end;
$$;

-- ─── close_maintenance ────────────────────────────────────────
create or replace function public.close_maintenance(p_log_id uuid)
returns void language plpgsql security definer as $$
declare
  v_log      public.maintenance_logs%rowtype;
  v_vehicle  public.vehicles%rowtype;
begin
  select * into v_log from public.maintenance_logs where id = p_log_id for update;

  update public.maintenance_logs
    set is_active = false, closed_at = now()
    where id = p_log_id;

  select * into v_vehicle from public.vehicles where id = v_log.vehicle_id;

  if v_vehicle.status <> 'retired' then
    update public.vehicles set status = 'available' where id = v_log.vehicle_id;
  end if;
end;
$$;
