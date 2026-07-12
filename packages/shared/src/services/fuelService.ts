import type { SupabaseClient } from '@supabase/supabase-js';
import type { FuelLog } from '../types';

export interface FuelLogRow extends FuelLog {
  vehicle?: { id: string; reg_no: string; name_model: string } | null;
  trip?: { id: string; source: string; destination: string } | null;
}

export interface FuelFilters {
  vehicleId?: string;
}

export async function getFuelLogs(
  supabase: SupabaseClient,
  filters?: FuelFilters
): Promise<{ data: FuelLogRow[]; error: string | null }> {
  let query = supabase
    .from('fuel_logs')
    .select(`
      *,
      vehicle:vehicles (id, reg_no, name_model),
      trip:trips (id, source, destination)
    `)
    .order('logged_at', { ascending: false });

  if (filters?.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);

  const { data, error } = await query;
  return { data: (data as FuelLogRow[]) ?? [], error: error?.message ?? null };
}

export interface CreateFuelLogInput {
  vehicle_id: string;
  trip_id?: string | null;
  liters: number;
  cost: number;
  logged_at?: string;
}

export async function createFuelLog(
  supabase: SupabaseClient,
  input: CreateFuelLogInput
): Promise<{ data: FuelLog | null; error: string | null }> {
  const { data, error } = await supabase
    .from('fuel_logs')
    .insert({ ...input, logged_at: input.logged_at ?? new Date().toISOString() })
    .select()
    .single();
  return { data: data as FuelLog | null, error: error?.message ?? null };
}

export async function deleteFuelLog(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('fuel_logs').delete().eq('id', id);
  return { error: error?.message ?? null };
}
