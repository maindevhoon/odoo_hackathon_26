import type { SupabaseClient } from '@supabase/supabase-js';
import type { Trip, TripStatus } from '../types';
import { isLicenseExpired } from './driverService';

// ─── Extended trip type with joined vehicle + driver ──────────
export interface TripRow extends Trip {
  vehicle?: { id: string; reg_no: string; name_model: string; max_load_kg: number; status: string } | null;
  driver?: { id: string; name: string; license_expiry: string; status: string } | null;
}

export interface TripFilters {
  status?: TripStatus | '';
  search?: string; // source or destination
  vehicleId?: string;
  driverId?: string;
}

// ─── Queries ──────────────────────────────────────────────────
export async function getTrips(
  supabase: SupabaseClient,
  filters?: TripFilters
): Promise<{ data: TripRow[]; error: string | null }> {
  let query = supabase
    .from('trips')
    .select(`
      *,
      vehicle:vehicles (id, reg_no, name_model, max_load_kg, status),
      driver:drivers  (id, name, license_expiry, status)
    `)
    .order('created_at', { ascending: false });

  if (filters?.status)    query = query.eq('status', filters.status);
  if (filters?.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters?.driverId)  query = query.eq('driver_id', filters.driverId);
  if (filters?.search) {
    query = query.or(
      `source.ilike.%${filters.search}%,destination.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  return { data: (data as TripRow[]) ?? [], error: error?.message ?? null };
}

export async function getTripById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: TripRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      vehicle:vehicles (id, reg_no, name_model, max_load_kg, status),
      driver:drivers  (id, name, license_expiry, status)
    `)
    .eq('id', id)
    .single();
  return { data: data as TripRow | null, error: error?.message ?? null };
}

// ─── Create (Draft) ───────────────────────────────────────────
export interface CreateTripInput {
  source: string;
  destination: string;
  vehicle_id: string;
  driver_id: string;
  cargo_weight_kg: number;
  planned_distance: number;
  revenue?: number;
  contract_id?: string | null;
}

/**
 * Client-side pre-validation before inserting draft trip.
 * RPCs re-validate server-side on dispatch for security.
 */
export async function createTrip(
  supabase: SupabaseClient,
  input: CreateTripInput
): Promise<{ data: Trip | null; error: string | null }> {
  // Fetch vehicle + driver to validate client-side first
  const [{ data: vehicle }, { data: driver }] = await Promise.all([
    supabase.from('vehicles').select('*').eq('id', input.vehicle_id).single(),
    supabase.from('drivers').select('*').eq('id', input.driver_id).single(),
  ]);

  if (!vehicle) return { data: null, error: 'Vehicle not found' };
  if (!driver)  return { data: null, error: 'Driver not found' };

  // Rule §2: vehicle must not be retired or in_shop
  if (vehicle.status === 'retired')  return { data: null, error: 'Vehicle is retired and cannot be assigned (Rule §2)' };
  if (vehicle.status === 'in_shop')  return { data: null, error: 'Vehicle is in the shop and cannot be assigned (Rule §2)' };

  // Rule §3: driver license must be valid, not suspended
  if (driver.status === 'suspended') return { data: null, error: 'Driver is suspended (Rule §3)' };
  if (isLicenseExpired(driver.license_expiry)) {
    return { data: null, error: `Driver license expired on ${driver.license_expiry} (Rule §3)` };
  }

  // Rule §4: neither already on_trip
  if (vehicle.status === 'on_trip') return { data: null, error: 'Vehicle is already on another trip (Rule §4)' };
  if (driver.status  === 'on_trip') return { data: null, error: 'Driver is already on another trip (Rule §4)' };

  // Rule §5: cargo weight check
  if (input.cargo_weight_kg > vehicle.max_load_kg) {
    return {
      data: null,
      error: `Cargo ${input.cargo_weight_kg} kg exceeds vehicle max load ${vehicle.max_load_kg} kg (Rule §5)`,
    };
  }

  const { data, error } = await supabase
    .from('trips')
    .insert({ ...input, status: 'draft', revenue: input.revenue ?? 0 })
    .select()
    .single();
  return { data: data as Trip | null, error: error?.message ?? null };
}

// ─── Dispatch (Draft → Dispatched) ───────────────────────────
// Rule §6: transactional — calls Postgres RPC
export async function dispatchTrip(
  supabase: SupabaseClient,
  tripId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('dispatch_trip', { p_trip_id: tripId });
  if (error) return { error: formatRpcError(error.message) };
  return { error: null };
}

// ─── Complete (Dispatched → Completed) ───────────────────────
// Rule §7: requires finalOdometer + fuelConsumed
export async function completeTrip(
  supabase: SupabaseClient,
  tripId: string,
  finalOdometer: number,
  fuelConsumed: number
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('complete_trip', {
    p_trip_id:        tripId,
    p_final_odometer: finalOdometer,
    p_fuel_consumed:  fuelConsumed,
  });
  if (error) return { error: formatRpcError(error.message) };
  return { error: null };
}

// ─── Cancel (Draft/Dispatched → Cancelled) ───────────────────
// Rule §8: restores vehicle + driver if was dispatched
export async function cancelTrip(
  supabase: SupabaseClient,
  tripId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('cancel_trip', { p_trip_id: tripId });
  if (error) return { error: formatRpcError(error.message) };
  return { error: null };
}

// ─── RPC error message cleanup ────────────────────────────────
function formatRpcError(raw: string): string {
  // Strip postgres boilerplate, surface the meaningful message
  const match = raw.match(/ERROR:\s+(.+?)(\s+HINT:|$)/s);
  return match ? match[1].trim() : raw;
}
