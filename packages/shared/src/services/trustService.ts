import type { SupabaseClient } from '@supabase/supabase-js';
import type { Organization, WorkerQualification, WorkerReport } from '../types';

export async function getWorkerQualifications(
  supabase: SupabaseClient,
  driverId: string
): Promise<{ data: WorkerQualification[]; error: string | null }> {
  const { data, error } = await supabase
    .from('worker_qualifications')
    .select('*')
    .eq('driver_id', driverId)
    .order('category');
  return { data: (data as WorkerQualification[]) ?? [], error: error?.message ?? null };
}

export async function getOrganizations(
  supabase: SupabaseClient
): Promise<{ data: Organization[]; error: string | null }> {
  const { data, error } = await supabase.from('organizations').select('*').order('name');
  return { data: (data as Organization[]) ?? [], error: error?.message ?? null };
}

/** Reports are reviewed evidence, not leaderboard inputs. */
export async function createWorkerReport(
  supabase: SupabaseClient,
  input: Omit<WorkerReport, 'id' | 'status' | 'resolution_note' | 'reviewed_at' | 'created_at' | 'updated_at'>
): Promise<{ data: WorkerReport | null; error: string | null }> {
  const { data, error } = await supabase
    .from('worker_reports')
    .insert({ ...input, status: 'submitted' })
    .select()
    .single();
  return { data: data as WorkerReport | null, error: error?.message ?? null };
}
