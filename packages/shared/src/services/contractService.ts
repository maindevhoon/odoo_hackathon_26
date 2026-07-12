import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Contract, ContractStatus, Tier, DriverProgress } from '../types';
import { tierGte } from '../types';

export interface ContractRow extends Contract {
  driver?: { id: string; name: string; license_no: string } | null;
}

export interface ContractFilters {
  status?: ContractStatus | '';
  minTier?: Tier | '';
  search?: string;
}

export async function getContracts(
  supabase: SupabaseClient,
  filters?: ContractFilters
): Promise<{ data: ContractRow[]; error: string | null }> {
  let query = supabase
    .from('contracts')
    .select('*, driver:drivers (id, name, license_no)')
    .order('created_at', { ascending: false });

  if (filters?.status)  query = query.eq('status', filters.status);
  if (filters?.minTier) query = query.eq('min_tier', filters.minTier);
  if (filters?.search)  query = query.ilike('title', `%${filters.search}%`);

  const { data, error } = await query;
  return { data: (data as ContractRow[]) ?? [], error: error?.message ?? null };
}

export interface CreateContractInput {
  title: string;
  vehicle_class: string;
  cargo_type: string;
  region: string;
  min_tier: Tier;
  pay: number;
  start_date: string;
  end_date: string;
  company_id: string;
}

export async function createContract(
  supabase: SupabaseClient,
  input: CreateContractInput
): Promise<{ data: Contract | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contracts')
    .insert({ ...input, status: 'open' })
    .select()
    .single();
  return { data: data as Contract | null, error: error?.message ?? null };
}

export async function assignContract(
  supabase: SupabaseClient,
  contractId: string,
  driverId: string
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('assign_contract', {
    p_contract_id: contractId,
    p_driver_id: driverId,
  });
  if (error) return { error: error.message };
  const result = data as { error?: string; ok?: boolean };
  return { error: result?.error ?? null };
}

export async function completeContract(
  supabase: SupabaseClient,
  contractId: string
): Promise<{ data: { xp_awarded: number; new_xp: number; new_tier: string } | null; error: string | null }> {
  const { data, error } = await supabase.rpc('complete_contract', { p_contract_id: contractId });
  if (error) return { data: null, error: error.message };
  const result = data as { error?: string; ok?: boolean; xp_awarded?: number; new_xp?: number; new_tier?: string };
  if (result?.error) return { data: null, error: result.error };
  return {
    data: { xp_awarded: result.xp_awarded ?? 0, new_xp: result.new_xp ?? 0, new_tier: result.new_tier ?? 'bronze' },
    error: null,
  };
}

export async function breachContract(
  supabase: SupabaseClient,
  contractId: string
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('breach_contract', { p_contract_id: contractId });
  if (error) return { error: error.message };
  const result = data as { error?: string };
  return { error: result?.error ?? null };
}

export async function cancelContract(
  supabase: SupabaseClient,
  contractId: string
): Promise<{ error: string | null }> {
  const { data, error } = await supabase.rpc('cancel_contract', { p_contract_id: contractId });
  if (error) return { error: error.message };
  const result = data as { error?: string };
  return { error: result?.error ?? null };
}

// ─── Driver Progress / Leaderboard ───────────────────────────
export interface DriverProgressRow extends DriverProgress {
  driver?: { id: string; name: string; safety_score: number; status: string } | null;
}

export async function getLeaderboard(
  supabase: SupabaseClient
): Promise<{ data: DriverProgressRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('driver_progress')
    .select('*, driver:drivers (id, name, safety_score, status)')
    .order('xp', { ascending: false });

  return { data: (data as DriverProgressRow[]) ?? [], error: error?.message ?? null };
}

// ─── Realtime subscription helpers ───────────────────────────
export function subscribeToContracts(
  supabase: SupabaseClient,
  onUpdate: () => void
): RealtimeChannel {
  return supabase
    .channel('contracts-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, onUpdate)
    .subscribe();
}

export function subscribeToLeaderboard(
  supabase: SupabaseClient,
  onUpdate: () => void
): RealtimeChannel {
  return supabase
    .channel('leaderboard-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_progress' }, onUpdate)
    .subscribe();
}

// ─── Tier display helpers ─────────────────────────────────────
export const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string; border: string; ring: string }> = {
  bronze:   { label: 'Bronze',   color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200', ring: '#d97706' },
  silver:   { label: 'Silver',   color: 'text-gray-600',    bg: 'bg-gray-100',   border: 'border-gray-200',  ring: '#9ca3af' },
  gold:     { label: 'Gold',     color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-200',ring: '#ca8a04' },
  platinum: { label: 'Platinum', color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200',ring: '#7c3aed' },
};

export const TIER_PERKS: Record<Tier, string> = {
  bronze:   'Local light cargo routes',
  silver:   'Mid-haul routes + refrigerated cargo',
  gold:     'Van + high-value goods',
  platinum: 'Long-haul / truck (top tier)',
};

export { tierGte };
