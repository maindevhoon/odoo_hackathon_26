import type { SupabaseClient } from '@supabase/supabase-js';
import type { Vehicle, VehicleStatus, VehicleType } from '../types';

// ─── Filters ──────────────────────────────────────────────────
export interface VehicleFilters {
  status?: VehicleStatus | '';
  type?: VehicleType | '';
  region?: string;
  search?: string; // matches reg_no or name_model
}

// ─── Queries ──────────────────────────────────────────────────
export async function getVehicles(
  supabase: SupabaseClient,
  filters?: VehicleFilters
): Promise<{ data: Vehicle[]; error: string | null }> {
  let query = supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status)  query = query.eq('status', filters.status);
  if (filters?.type)    query = query.eq('type',   filters.type);
  if (filters?.region)  query = query.ilike('region', `%${filters.region}%`);
  if (filters?.search) {
    query = query.or(
      `reg_no.ilike.%${filters.search}%,name_model.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  return { data: (data as Vehicle[]) ?? [], error: error?.message ?? null };
}

export async function getVehicleById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: Vehicle | null; error: string | null }> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as Vehicle | null, error: error?.message ?? null };
}

// ─── Uniqueness pre-check ─────────────────────────────────────
export async function isRegNoTaken(
  supabase: SupabaseClient,
  regNo: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabase
    .from('vehicles')
    .select('id')
    .ilike('reg_no', regNo);
  if (excludeId) query = query.neq('id', excludeId);
  const { data } = await query;
  return (data?.length ?? 0) > 0;
}

// ─── Create ───────────────────────────────────────────────────
export type CreateVehicleInput = Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>;

export async function createVehicle(
  supabase: SupabaseClient,
  input: CreateVehicleInput
): Promise<{ data: Vehicle | null; error: string | null }> {
  // Business rule §1: reg_no uniqueness friendly pre-check
  const taken = await isRegNoTaken(supabase, input.reg_no);
  if (taken) {
    return { data: null, error: `Registration number "${input.reg_no}" is already in use.` };
  }

  const { data, error } = await supabase
    .from('vehicles')
    .insert(input)
    .select()
    .single();
  return { data: data as Vehicle | null, error: error?.message ?? null };
}

// ─── Update ───────────────────────────────────────────────────
export type UpdateVehicleInput = Partial<CreateVehicleInput>;

export async function updateVehicle(
  supabase: SupabaseClient,
  id: string,
  input: UpdateVehicleInput
): Promise<{ data: Vehicle | null; error: string | null }> {
  // Business rule §1: reg_no uniqueness check (excluding self)
  if (input.reg_no) {
    const taken = await isRegNoTaken(supabase, input.reg_no, id);
    if (taken) {
      return { data: null, error: `Registration number "${input.reg_no}" is already in use.` };
    }
  }

  const { data, error } = await supabase
    .from('vehicles')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  return { data: data as Vehicle | null, error: error?.message ?? null };
}

// ─── Delete ───────────────────────────────────────────────────
export async function deleteVehicle(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ─── Dispatch-eligible vehicles (rules §2, §4) ────────────────
export async function getDispatchableVehicles(
  supabase: SupabaseClient
): Promise<{ data: Vehicle[]; error: string | null }> {
  // Rule §2: Retired or In Shop vehicles never appear in dispatch pool
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'available')
    .order('reg_no');
  return { data: (data as Vehicle[]) ?? [], error: error?.message ?? null };
}
