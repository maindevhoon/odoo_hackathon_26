import type { SupabaseClient } from '@supabase/supabase-js';
import type { Expense, ExpenseCategory } from '../types';

export interface ExpenseRow extends Expense {
  vehicle?: { id: string; reg_no: string; name_model: string } | null;
  trip?: { id: string; source: string; destination: string } | null;
}

export interface ExpenseFilters {
  vehicleId?: string;
  category?: ExpenseCategory | '';
}

export async function getExpenses(
  supabase: SupabaseClient,
  filters?: ExpenseFilters
): Promise<{ data: ExpenseRow[]; error: string | null }> {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      vehicle:vehicles (id, reg_no, name_model),
      trip:trips (id, source, destination)
    `)
    .order('logged_at', { ascending: false });

  if (filters?.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters?.category)  query = query.eq('category', filters.category);

  const { data, error } = await query;
  return { data: (data as ExpenseRow[]) ?? [], error: error?.message ?? null };
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  amount: number;
  vehicle_id?: string | null;
  trip_id?: string | null;
  logged_at?: string;
}

export async function createExpense(
  supabase: SupabaseClient,
  input: CreateExpenseInput
): Promise<{ data: Expense | null; error: string | null }> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...input, logged_at: input.logged_at ?? new Date().toISOString() })
    .select()
    .single();
  return { data: data as Expense | null, error: error?.message ?? null };
}

export async function deleteExpense(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// Per-vehicle operational cost summary
export async function getVehicleOperationalCost(
  supabase: SupabaseClient,
  vehicleId: string
): Promise<{ fuelCost: number; maintenanceCost: number; otherCost: number }> {
  const [fuel, expenses] = await Promise.all([
    supabase.from('fuel_logs').select('cost').eq('vehicle_id', vehicleId),
    supabase.from('expenses').select('amount, category').eq('vehicle_id', vehicleId),
  ]);

  const fuelCost = (fuel.data ?? []).reduce((s, r) => s + (r.cost ?? 0), 0);
  const maintenanceCost = (expenses.data ?? [])
    .filter(e => e.category === 'maintenance')
    .reduce((s, r) => s + (r.amount ?? 0), 0);
  const otherCost = (expenses.data ?? [])
    .filter(e => e.category !== 'maintenance')
    .reduce((s, r) => s + (r.amount ?? 0), 0);

  return { fuelCost, maintenanceCost, otherCost };
}
