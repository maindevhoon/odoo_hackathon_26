import type { SupabaseClient } from '@supabase/supabase-js';
import type { Driver, DriverStatus } from '../types';

// ─── Filters ──────────────────────────────────────────────────
export interface DriverFilters {
  status?: DriverStatus | '';
  search?: string; // matches name or license_no
  expiredOnly?: boolean;
}

// ─── Queries ──────────────────────────────────────────────────
export async function getDrivers(
  supabase: SupabaseClient,
  filters?: DriverFilters
): Promise<{ data: Driver[]; error: string | null }> {
  let query = supabase
    .from('drivers')
    .select('*')
    .order('name');

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,license_no.ilike.%${filters.search}%`
    );
  }
  if (filters?.expiredOnly) {
    const today = new Date().toISOString().split('T')[0];
    query = query.lt('license_expiry', today);
  }

  const { data, error } = await query;
  return { data: (data as Driver[]) ?? [], error: error?.message ?? null };
}

export async function getDriverById(
  supabase: SupabaseClient,
  id: string
): Promise<{ data: Driver | null; error: string | null }> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', id)
    .single();
  return { data: data as Driver | null, error: error?.message ?? null };
}

export async function getDriverByProfileId(
  supabase: SupabaseClient,
  profileId: string
): Promise<{ data: Driver | null; error: string | null }> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  return { data: data as Driver | null, error: error?.message ?? null };
}

// ─── Business rule §3 helpers ─────────────────────────────────
export function isLicenseExpired(licenseExpiry: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return licenseExpiry < today;
}

export function daysUntilExpiry(licenseExpiry: string): number {
  const today = new Date();
  const expiry = new Date(licenseExpiry);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Create ───────────────────────────────────────────────────
export type CreateDriverInput = Omit<Driver, 'id' | 'created_at' | 'updated_at'>;

export async function createDriver(
  supabase: SupabaseClient,
  input: CreateDriverInput
): Promise<{ data: Driver | null; error: string | null }> {
  const { data, error } = await supabase
    .from('drivers')
    .insert(input)
    .select()
    .single();
  return { data: data as Driver | null, error: error?.message ?? null };
}

// ─── Update ───────────────────────────────────────────────────
export type UpdateDriverInput = Partial<CreateDriverInput>;

export async function updateDriver(
  supabase: SupabaseClient,
  id: string,
  input: UpdateDriverInput
): Promise<{ data: Driver | null; error: string | null }> {
  const { data, error } = await supabase
    .from('drivers')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  return { data: data as Driver | null, error: error?.message ?? null };
}

// ─── Delete ───────────────────────────────────────────────────
export async function deleteDriver(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('drivers').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ─── Dispatch-eligible drivers (rules §3, §4) ─────────────────
export async function getDispatchableDrivers(
  supabase: SupabaseClient
): Promise<{ data: Driver[]; error: string | null }> {
  const today = new Date().toISOString().split('T')[0];
  // Rule §3: expired license or suspended → blocked
  // Rule §4: on_trip → already assigned
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('status', 'available')
    .gte('license_expiry', today) // not expired
    .order('name');
  return { data: (data as Driver[]) ?? [], error: error?.message ?? null };
}
