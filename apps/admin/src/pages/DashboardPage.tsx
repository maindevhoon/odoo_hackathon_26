import { useState, useEffect } from 'react';
import { getFleetKPIs, type FleetKPIs } from '@transitops/shared';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const VEHICLE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6b7280'];
const DRIVER_COLORS  = ['#10b981', '#3b82f6', '#6b7280', '#ef4444'];

const EMPTY_KPI: FleetKPIs = {
  totalVehicles: 0, activeVehicles: 0, availableVehicles: 0,
  inShopVehicles: 0, retiredVehicles: 0, fleetUtilizationPct: 0,
  activeTrips: 0, pendingTrips: 0,
  driversOnDuty: 0, driversAvailable: 0, driversSuspended: 0,
  totalRevenue: 0, totalFuelCost: 0, totalMaintenanceCost: 0, totalOperationalCost: 0,
};

function KPICard({
  label, value, sub, color, icon,
}: {
  label: string; value: string | number; sub?: string;
  color: string; icon: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-2xl border p-5 flex items-start gap-4', color)}>
      <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-sm font-medium mt-1 opacity-80">{label}</p>
        {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [kpi, setKpi]       = useState<FleetKPIs>(EMPTY_KPI);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFleetKPIs(supabase).then(({ data }) => {
      setKpi(data);
      setLoading(false);
    });
  }, []);

  // Pie chart data
  const vehiclePie = [
    { name: 'On Trip',    value: kpi.activeVehicles    },
    { name: 'Available',  value: kpi.availableVehicles },
    { name: 'In Shop',    value: kpi.inShopVehicles    },
    { name: 'Retired',    value: kpi.retiredVehicles   },
  ].filter(d => d.value > 0);

  const driverPie = [
    { name: 'Available',  value: kpi.driversAvailable },
    { name: 'On Trip',    value: kpi.driversOnDuty    },
    { name: 'Off Duty',   value: Math.max(0, (kpi.totalVehicles > 0 ? 1 : 0)) }, // placeholder
    { name: 'Suspended',  value: kpi.driversSuspended  },
  ].filter(d => d.value > 0);

  const Skeleton = () => <div className="h-full bg-gray-100 rounded animate-pulse" />;

  return (
    <div className="p-6 min-h-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fleet Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Live operational overview</p>
      </div>

      {/* ── Utilization hero ─────────────────────────────── */}
      <div className="grid grid-cols-3 gap-5">
        {/* Utilization ring */}
        <div className="col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center gap-3">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Fleet Utilization</p>
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10"/>
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={kpi.fleetUtilizationPct > 70 ? '#10b981' : kpi.fleetUtilizationPct > 40 ? '#3b82f6' : '#f59e0b'}
                strokeWidth="10"
                strokeDasharray={`${kpi.fleetUtilizationPct * 2.513} 251.3`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold text-gray-900">{kpi.fleetUtilizationPct}%</p>
              <p className="text-xs text-gray-400">Utilized</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center">
            {kpi.activeVehicles} of {kpi.totalVehicles - kpi.retiredVehicles} active vehicles on trip
          </p>
        </div>

        {/* Financial summary */}
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-1">Total Revenue</p>
            {loading ? <Skeleton /> : <p className="text-3xl font-bold text-emerald-700">₱{kpi.totalRevenue.toLocaleString()}</p>}
            <p className="text-xs text-emerald-500 mt-1">Completed trips</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-1">Operational Cost</p>
            {loading ? <Skeleton /> : <p className="text-3xl font-bold text-red-700">₱{kpi.totalOperationalCost.toLocaleString()}</p>}
            <p className="text-xs text-red-400 mt-1">Fuel + Maintenance</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">Fuel Cost</p>
            {loading ? <Skeleton /> : <p className="text-2xl font-bold text-blue-700">₱{kpi.totalFuelCost.toLocaleString()}</p>}
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">Maintenance Cost</p>
            {loading ? <Skeleton /> : <p className="text-2xl font-bold text-amber-700">₱{kpi.totalMaintenanceCost.toLocaleString()}</p>}
          </div>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard label="Active Vehicles" value={kpi.activeVehicles} sub="Currently on trip"
          color="bg-blue-50 text-blue-800 border-blue-100"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-.001M13 16H9m4 0h3m3 0h.5M13 6h1.5l3 5H20a1 1 0 011 1v3h-1"/></svg>}
        />
        <KPICard label="Available Vehicles" value={kpi.availableVehicles} sub="Ready to dispatch"
          color="bg-emerald-50 text-emerald-800 border-emerald-100"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <KPICard label="In Maintenance" value={kpi.inShopVehicles} sub="Currently in shop"
          color="bg-amber-50 text-amber-800 border-amber-100"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
        />
        <KPICard label="Drivers On Duty" value={kpi.driversOnDuty} sub="Currently on trip"
          color="bg-purple-50 text-purple-800 border-purple-100"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>}
        />
        <KPICard label="Active Trips" value={kpi.activeTrips} sub="Dispatched"
          color="bg-indigo-50 text-indigo-800 border-indigo-100"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>}
        />
        <KPICard label="Pending Trips" value={kpi.pendingTrips} sub="Draft — awaiting dispatch"
          color="bg-gray-50 text-gray-700 border-gray-100"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <KPICard label="Available Drivers" value={kpi.driversAvailable} sub="Ready to assign"
          color="bg-teal-50 text-teal-800 border-teal-100"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
        />
        <KPICard label="Suspended Drivers" value={kpi.driversSuspended} sub="Blocked from dispatch"
          color="bg-red-50 text-red-800 border-red-100"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>}
        />
      </div>

      {/* ── Pie charts ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">
        {[
          { title: 'Vehicle Status Distribution', data: vehiclePie, colors: VEHICLE_COLORS },
          { title: 'Driver Status Distribution',  data: driverPie,  colors: DRIVER_COLORS  },
        ].map(({ title, data, colors }) => (
          <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm font-bold text-gray-700 mb-4">{title}</p>
            {loading || data.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-300">
                <p className="text-sm">No data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Count']} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
