import type { SupabaseClient } from '@supabase/supabase-js';

// ─── KPI snapshot ─────────────────────────────────────────────
export interface FleetKPIs {
  // Vehicle counts
  totalVehicles: number;
  activeVehicles: number;   // on_trip
  availableVehicles: number;
  inShopVehicles: number;
  retiredVehicles: number;
  fleetUtilizationPct: number; // on_trip / (total - retired) × 100

  // Trip counts
  activeTrips: number;   // dispatched
  pendingTrips: number;  // draft

  // Driver counts
  driversOnDuty: number; // on_trip
  driversAvailable: number;
  driversSuspended: number;

  // Financial
  totalRevenue: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  totalOperationalCost: number;
}

export async function getFleetKPIs(
  supabase: SupabaseClient
): Promise<{ data: FleetKPIs; error: string | null }> {
  const [vehicles, trips, drivers, fuel, maintenance] = await Promise.all([
    supabase.from('vehicles').select('status'),
    supabase.from('trips').select('status, revenue'),
    supabase.from('drivers').select('status'),
    supabase.from('fuel_logs').select('cost'),
    supabase.from('maintenance_logs').select('cost'),
  ]);

  const veh = vehicles.data ?? [];
  const trp = trips.data ?? [];
  const drv = drivers.data ?? [];
  const fl  = fuel.data ?? [];
  const mn  = maintenance.data ?? [];

  const totalVehicles     = veh.length;
  const activeVehicles    = veh.filter(v => v.status === 'on_trip').length;
  const availableVehicles = veh.filter(v => v.status === 'available').length;
  const inShopVehicles    = veh.filter(v => v.status === 'in_shop').length;
  const retiredVehicles   = veh.filter(v => v.status === 'retired').length;
  const eligible          = totalVehicles - retiredVehicles;
  const fleetUtilizationPct = eligible > 0
    ? Math.round((activeVehicles / eligible) * 100)
    : 0;

  const activeTrips  = trp.filter(t => t.status === 'dispatched').length;
  const pendingTrips = trp.filter(t => t.status === 'draft').length;

  const driversOnDuty    = drv.filter(d => d.status === 'on_trip').length;
  const driversAvailable = drv.filter(d => d.status === 'available').length;
  const driversSuspended = drv.filter(d => d.status === 'suspended').length;

  const totalRevenue      = trp.filter(t => t.status === 'completed').reduce((s, t) => s + (t.revenue ?? 0), 0);
  const totalFuelCost     = fl.reduce((s, f) => s + (f.cost ?? 0), 0);
  const totalMaintenanceCost = mn.reduce((s, m) => s + (m.cost ?? 0), 0);
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;

  return {
    data: {
      totalVehicles, activeVehicles, availableVehicles, inShopVehicles,
      retiredVehicles, fleetUtilizationPct, activeTrips, pendingTrips,
      driversOnDuty, driversAvailable, driversSuspended,
      totalRevenue, totalFuelCost, totalMaintenanceCost, totalOperationalCost,
    },
    error: vehicles.error?.message ?? null,
  };
}

// ─── Per-vehicle report row ────────────────────────────────────
export interface VehicleReportRow {
  id: string;
  reg_no: string;
  name_model: string;
  type: string;
  status: string;
  acquisition_cost: number;
  odometer: number;
  // Aggregated
  completedTrips: number;
  totalRevenue: number;
  totalDistance: number;
  totalFuelLiters: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  operationalCost: number;
  roi: number;                // (revenue - opCost) / acquisition_cost × 100
  fuelEfficiency: number | null; // km/L
}

export async function getVehicleReport(
  supabase: SupabaseClient
): Promise<{ data: VehicleReportRow[]; error: string | null }> {
  const [vehicles, trips, fuel, maintenance] = await Promise.all([
    supabase.from('vehicles').select('id, reg_no, name_model, type, status, acquisition_cost, odometer'),
    supabase.from('trips').select('vehicle_id, status, revenue, planned_distance, fuel_consumed'),
    supabase.from('fuel_logs').select('vehicle_id, liters, cost'),
    supabase.from('maintenance_logs').select('vehicle_id, cost'),
  ]);

  const veh = (vehicles.data ?? []) as {
    id: string; reg_no: string; name_model: string; type: string;
    status: string; acquisition_cost: number; odometer: number;
  }[];

  const rows: VehicleReportRow[] = veh.map(v => {
    const vTrips = (trips.data ?? []).filter(t => t.vehicle_id === v.id && t.status === 'completed');
    const vFuel  = (fuel.data ?? []).filter(f => f.vehicle_id === v.id);
    const vMaint = (maintenance.data ?? []).filter(m => m.vehicle_id === v.id);

    const totalRevenue         = vTrips.reduce((s, t) => s + (t.revenue ?? 0), 0);
    const totalDistance        = vTrips.reduce((s, t) => s + (t.planned_distance ?? 0), 0);
    const totalFuelLiters      = vFuel.reduce((s, f) => s + (f.liters ?? 0), 0);
    const totalFuelCost        = vFuel.reduce((s, f) => s + (f.cost ?? 0), 0);
    const totalMaintenanceCost = vMaint.reduce((s, m) => s + (m.cost ?? 0), 0);
    const operationalCost      = totalFuelCost + totalMaintenanceCost;
    const acq                  = v.acquisition_cost || 1; // avoid div by zero
    const roi                  = ((totalRevenue - operationalCost) / acq) * 100;
    const fuelEfficiency       = totalFuelLiters > 0 && totalDistance > 0
      ? totalDistance / totalFuelLiters
      : null;

    return {
      ...v,
      completedTrips: vTrips.length,
      totalRevenue,
      totalDistance,
      totalFuelLiters,
      totalFuelCost,
      totalMaintenanceCost,
      operationalCost,
      roi,
      fuelEfficiency,
    };
  });

  return { data: rows, error: vehicles.error?.message ?? null };
}

// ─── Trips over time (for area chart) ─────────────────────────
export interface TripByDate { date: string; completed: number; revenue: number }

export async function getTripsOverTime(
  supabase: SupabaseClient,
  days = 30
): Promise<{ data: TripByDate[]; error: string | null }> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('trips')
    .select('status, revenue, updated_at')
    .eq('status', 'completed')
    .gte('updated_at', since.toISOString())
    .order('updated_at');

  if (error) return { data: [], error: error.message };

  // Group by date
  const map: Record<string, { completed: number; revenue: number }> = {};
  (data ?? []).forEach(t => {
    const date = t.updated_at.split('T')[0];
    if (!map[date]) map[date] = { completed: 0, revenue: 0 };
    map[date].completed += 1;
    map[date].revenue   += t.revenue ?? 0;
  });

  return {
    data: Object.entries(map).map(([date, v]) => ({ date, ...v })),
    error: null,
  };
}

// ─── CSV Export helpers ────────────────────────────────────────
export function vehicleReportToCSV(rows: VehicleReportRow[]): string {
  const headers = [
    'Reg No', 'Model', 'Type', 'Status', 'Acquisition Cost (₹)',
    'Completed Trips', 'Revenue (₹)', 'Fuel Cost (₹)', 'Maintenance Cost (₹)',
    'Operational Cost (₹)', 'ROI (%)', 'Fuel Efficiency (km/L)',
  ];
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      r.reg_no, r.name_model, r.type, r.status,
      r.acquisition_cost, r.completedTrips, r.totalRevenue,
      r.totalFuelCost, r.totalMaintenanceCost, r.operationalCost,
      r.roi.toFixed(2), r.fuelEfficiency?.toFixed(2) ?? '',
    ].join(',')),
  ].join('\n');
  return csv;
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
