-- ============================================================
-- TransitOps — 0003_trips.sql
-- Proper RPC implementations for all trip lifecycle transitions
-- All multi-row updates are transactional (Rule §6,7,8)
-- ============================================================

-- ─── dispatch_trip ────────────────────────────────────────────
-- Draft → Dispatched; vehicle + driver → on_trip (Rule §6)
-- Enforces: §2 (vehicle not retired/in_shop), §3 (license/suspended),
--           §4 (not already on_trip), §5 (cargo ≤ max_load)
CREATE OR REPLACE FUNCTION public.dispatch_trip(p_trip_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_trip    trips%ROWTYPE;
  v_vehicle vehicles%ROWTYPE;
  v_driver  drivers%ROWTYPE;
BEGIN
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRIP_NOT_FOUND';
  END IF;
  IF v_trip.status <> 'draft' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Trip must be Draft to dispatch (current: %)', v_trip.status;
  END IF;

  SELECT * INTO v_vehicle FROM vehicles WHERE id = v_trip.vehicle_id FOR UPDATE;
  IF v_vehicle.status IN ('retired', 'in_shop') THEN
    RAISE EXCEPTION 'VEHICLE_UNAVAILABLE: Vehicle is % and cannot be dispatched (Rule 2)', v_vehicle.status;
  END IF;
  IF v_vehicle.status = 'on_trip' THEN
    RAISE EXCEPTION 'VEHICLE_ON_TRIP: Vehicle is already on another trip (Rule 4)';
  END IF;

  SELECT * INTO v_driver FROM drivers WHERE id = v_trip.driver_id FOR UPDATE;
  IF v_driver.status = 'suspended' THEN
    RAISE EXCEPTION 'DRIVER_SUSPENDED: Driver is suspended (Rule 3)';
  END IF;
  IF v_driver.status = 'on_trip' THEN
    RAISE EXCEPTION 'DRIVER_ON_TRIP: Driver is already on another trip (Rule 4)';
  END IF;
  IF v_driver.license_expiry < CURRENT_DATE THEN
    RAISE EXCEPTION 'LICENSE_EXPIRED: Driver license expired % (Rule 3)', v_driver.license_expiry;
  END IF;

  -- Rule §5: cargo weight check
  IF v_trip.cargo_weight_kg > v_vehicle.max_load_kg THEN
    RAISE EXCEPTION 'OVERWEIGHT: Cargo %.1f kg exceeds vehicle max %.1f kg (Rule 5)',
      v_trip.cargo_weight_kg, v_vehicle.max_load_kg;
  END IF;

  -- Transactional update — Rule §6
  UPDATE trips    SET status = 'dispatched', updated_at = NOW() WHERE id = p_trip_id;
  UPDATE vehicles SET status = 'on_trip',    updated_at = NOW() WHERE id = v_trip.vehicle_id;
  UPDATE drivers  SET status = 'on_trip',    updated_at = NOW() WHERE id = v_trip.driver_id;

  RETURN jsonb_build_object('ok', true, 'trip_id', p_trip_id);
END;
$$;

-- ─── complete_trip ────────────────────────────────────────────
-- Dispatched → Completed; vehicle + driver → available (Rule §7)
-- Requires final_odometer and fuel_consumed
CREATE OR REPLACE FUNCTION public.complete_trip(
  p_trip_id       uuid,
  p_final_odometer numeric,
  p_fuel_consumed  numeric
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_trip trips%ROWTYPE;
BEGIN
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRIP_NOT_FOUND';
  END IF;
  IF v_trip.status <> 'dispatched' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Only Dispatched trips can be completed (current: %)', v_trip.status;
  END IF;
  IF p_final_odometer IS NULL OR p_final_odometer < 0 THEN
    RAISE EXCEPTION 'INVALID_ODOMETER: final_odometer must be >= 0';
  END IF;
  IF p_fuel_consumed IS NULL OR p_fuel_consumed <= 0 THEN
    RAISE EXCEPTION 'INVALID_FUEL: fuel_consumed must be > 0';
  END IF;

  -- Transactional update — Rule §7
  UPDATE trips SET
    status          = 'completed',
    final_odometer  = p_final_odometer,
    fuel_consumed   = p_fuel_consumed,
    updated_at      = NOW()
  WHERE id = p_trip_id;

  UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_trip.vehicle_id;
  UPDATE drivers  SET status = 'available', updated_at = NOW() WHERE id = v_trip.driver_id;

  -- Auto-log fuel entry
  INSERT INTO fuel_logs (vehicle_id, trip_id, liters, cost, logged_at)
  VALUES (v_trip.vehicle_id, p_trip_id, p_fuel_consumed, 0, NOW())
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'trip_id', p_trip_id);
END;
$$;

-- ─── cancel_trip ──────────────────────────────────────────────
-- Draft/Dispatched → Cancelled; restore vehicle + driver (Rule §8)
CREATE OR REPLACE FUNCTION public.cancel_trip(p_trip_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_trip trips%ROWTYPE;
BEGIN
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRIP_NOT_FOUND';
  END IF;
  IF v_trip.status NOT IN ('draft', 'dispatched') THEN
    RAISE EXCEPTION 'INVALID_STATUS: Only Draft or Dispatched trips can be cancelled (current: %)', v_trip.status;
  END IF;

  UPDATE trips SET status = 'cancelled', updated_at = NOW() WHERE id = p_trip_id;

  -- Only restore if they were set on_trip by this trip (Rule §8)
  IF v_trip.status = 'dispatched' THEN
    UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = v_trip.vehicle_id;
    UPDATE drivers  SET status = 'available', updated_at = NOW() WHERE id = v_trip.driver_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'trip_id', p_trip_id);
END;
$$;

-- ─── open_maintenance ─────────────────────────────────────────
-- Creates active maintenance → vehicle becomes In Shop (Rule §9)
CREATE OR REPLACE FUNCTION public.open_maintenance(
  p_vehicle_id  uuid,
  p_type        text,
  p_description text,
  p_cost        numeric DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO maintenance_logs (vehicle_id, type, description, cost, opened_at, is_active)
  VALUES (p_vehicle_id, p_type, p_description, p_cost, NOW(), true)
  RETURNING id INTO v_log_id;

  -- Rule §9: vehicle → in_shop
  UPDATE vehicles SET status = 'in_shop', updated_at = NOW() WHERE id = p_vehicle_id;

  RETURN jsonb_build_object('ok', true, 'log_id', v_log_id);
END;
$$;

-- ─── close_maintenance ────────────────────────────────────────
-- Closes maintenance log → vehicle → available (unless retired) (Rule §10)
CREATE OR REPLACE FUNCTION public.close_maintenance(p_log_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_log maintenance_logs%ROWTYPE;
BEGIN
  SELECT * INTO v_log FROM maintenance_logs WHERE id = p_log_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'MAINTENANCE_NOT_FOUND'; END IF;
  IF NOT v_log.is_active THEN RAISE EXCEPTION 'ALREADY_CLOSED: Maintenance log is already closed'; END IF;

  UPDATE maintenance_logs SET is_active = false, closed_at = NOW() WHERE id = p_log_id;

  -- Rule §10: back to available unless retired
  UPDATE vehicles
  SET status = 'available', updated_at = NOW()
  WHERE id = v_log.vehicle_id AND status <> 'retired';

  RETURN jsonb_build_object('ok', true, 'log_id', p_log_id);
END;
$$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.dispatch_trip(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_trip(uuid,numeric,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_trip(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_maintenance(uuid,text,text,numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_maintenance(uuid)        TO authenticated;
