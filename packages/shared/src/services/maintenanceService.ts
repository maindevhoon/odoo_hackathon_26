import type { SupabaseClient } from '@supabase/supabase-js';
import type { MaintenanceLog } from '../types';

export interface MaintenanceLogRow extends MaintenanceLog {
  vehicle?: { id: string; reg_no: string; name_model: string } | null;
}

export interface MaintenanceFilters {
  vehicleId?: string;
  activeOnly?: boolean;
  search?: string;
}

export async function getMaintenanceLogs(
  supabase: SupabaseClient,
  filters?: MaintenanceFilters
): Promise<{ data: MaintenanceLogRow[]; error: string | null }> {
  let query = supabase
    .from('maintenance_logs')
    .select(`
      *,
      vehicle:vehicles (id, reg_no, name_model)
    `)
    .order('opened_at', { ascending: false });

  if (filters?.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters?.activeOnly) query = query.eq('is_active', true);
  if (filters?.search) {
    query = query.ilike('description', `%${filters.search}%`);
  }

  const { data, error } = await query;
  return { data: (data as MaintenanceLogRow[]) ?? [], error: error?.message ?? null };
}

// Rule §9 — vehicle → in_shop (via RPC)
export async function openMaintenance(
  supabase: SupabaseClient,
  vehicleId: string,
  type: string,
  description: string,
  cost: number
): Promise<{ data: { log_id: string } | null; error: string | null }> {
  const { data, error } = await supabase.rpc('open_maintenance', {
    p_vehicle_id: vehicleId,
    p_type: type,
    p_description: description,
    p_cost: cost,
  });
  if (error) return { data: null, error: error.message };
  return { data: data as { log_id: string }, error: null };
}

// Rule §10 — vehicle → available (via RPC)
export async function closeMaintenance(
  supabase: SupabaseClient,
  logId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('close_maintenance', { p_log_id: logId });
  return { error: error?.message ?? null };
}

export async function updateMaintenanceCost(
  supabase: SupabaseClient,
  logId: string,
  cost: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('maintenance_logs')
    .update({ cost })
    .eq('id', logId);
  return { error: error?.message ?? null };
}
