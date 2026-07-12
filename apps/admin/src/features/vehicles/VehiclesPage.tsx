import { useState, useEffect, useCallback } from 'react';
import type { Vehicle } from '@transitops/shared';
import {
  getVehicles, createVehicle, updateVehicle, deleteVehicle,
  type VehicleFilters,
} from '@transitops/shared';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/SlideOver';
import { VehicleForm, type VehicleFormData } from './VehicleForm';

const TYPE_LABELS: Record<string, string> = {
  van: 'Van', truck: 'Truck', pickup: 'Pickup',
  motorcycle: 'Motorcycle', other: 'Other',
};

const STATUS_OPTS = [
  { value: '', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'on_trip',   label: 'On Trip'   },
  { value: 'in_shop',   label: 'In Shop'   },
  { value: 'retired',   label: 'Retired'   },
];
const TYPE_OPTS = [
  { value: '', label: 'All Types' },
  { value: 'van',        label: 'Van'        },
  { value: 'truck',      label: 'Truck'      },
  { value: 'pickup',     label: 'Pickup'     },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'other',      label: 'Other'      },
];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusF, setStatusF]   = useState('');
  const [typeF, setTypeF]       = useState('');

  const [showForm,   setShowForm]   = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [delVehicle,  setDelVehicle]  = useState<Vehicle | null>(null);
  const [delLoading,  setDelLoading]  = useState(false);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    const filters: VehicleFilters = {
      search: search || undefined,
      status: statusF as VehicleFilters['status'] || undefined,
      type:   typeF   as VehicleFilters['type']   || undefined,
    };
    const { data } = await getVehicles(supabase, filters);
    setVehicles(data);
    setLoading(false);
  }, [search, statusF, typeF]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  async function handleSubmit(data: VehicleFormData): Promise<string | null> {
    if (editVehicle) {
      const { error } = await updateVehicle(supabase, editVehicle.id, data as Parameters<typeof updateVehicle>[2]);
      if (error) return error;
    } else {
      const { error } = await createVehicle(supabase, data as Parameters<typeof createVehicle>[1]);
      if (error) return error;
    }
    fetchVehicles();
    return null;
  }

  async function handleDelete() {
    if (!delVehicle) return;
    setDelLoading(true);
    await deleteVehicle(supabase, delVehicle.id);
    setDelVehicle(null);
    setDelLoading(false);
    fetchVehicles();
  }

  // ── Stats ────────────────────────────────────────────────────
  const stats = {
    total:     vehicles.length,
    available: vehicles.filter(v => v.status === 'available').length,
    on_trip:   vehicles.filter(v => v.status === 'on_trip').length,
    in_shop:   vehicles.filter(v => v.status === 'in_shop').length,
    retired:   vehicles.filter(v => v.status === 'retired').length,
  };

  return (
    <div className="p-6 min-h-full">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Registry</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} vehicle{stats.total !== 1 ? 's' : ''} in fleet</p>
        </div>
        <Button
          id="add-vehicle-btn"
          onClick={() => { setEditVehicle(null); setShowForm(true); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Add Vehicle
        </Button>
      </div>

      {/* ── Stats row ──────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total',     value: stats.total,     color: 'bg-brand-50 text-brand-700 border-brand-100'  },
          { label: 'Available', value: stats.available, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: 'On Trip',   value: stats.on_trip,   color: 'bg-blue-50 text-blue-700 border-blue-100'     },
          { label: 'In Shop',   value: stats.in_shop,   color: 'bg-amber-50 text-amber-700 border-amber-100'  },
          { label: 'Retired',   value: stats.retired,   color: 'bg-gray-50 text-gray-600 border-gray-100'     },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl border p-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
        <div className="flex items-center gap-3 p-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              id="vehicle-search"
              type="search"
              placeholder="Search reg no or model…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Status filter */}
          <select
            id="vehicle-status-filter"
            value={statusF}
            onChange={e => setStatusF(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Type filter */}
          <select
            id="vehicle-type-filter"
            value={typeF}
            onChange={e => setTypeF(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            {TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {(search || statusF || typeF) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusF(''); setTypeF(''); }}>
              Clear
            </Button>
          )}
        </div>

        {/* ── Table ──────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100">
                {['Reg No', 'Model', 'Type', 'Max Load', 'Odometer', 'Acq. Cost', 'Region', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider first:pl-5 last:pr-5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5 first:pl-5">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: j === 0 ? 72 : j === 7 ? 80 : '90%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-.001M13 16H9m4 0h3m3 0h.5M13 6h1.5l3 5H20a1 1 0 011 1v3h-1"/>
                      </svg>
                      <p className="font-medium text-sm">No vehicles found</p>
                      <p className="text-xs">Try adjusting your filters or add a vehicle</p>
                    </div>
                  </td>
                </tr>
              ) : (
                vehicles.map(v => (
                  <tr key={v.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors group">
                    <td className="px-4 py-3.5 pl-5">
                      <span className="font-bold text-brand-700 font-mono text-xs tracking-wider">{v.reg_no}</span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-gray-800">{v.name_model}</td>
                    <td className="px-4 py-3.5 text-gray-500">{TYPE_LABELS[v.type] ?? v.type}</td>
                    <td className="px-4 py-3.5 text-gray-700">{v.max_load_kg.toLocaleString()} kg</td>
                    <td className="px-4 py-3.5 text-gray-500">{v.odometer.toLocaleString()} km</td>
                    <td className="px-4 py-3.5 text-gray-500">
                      ₱{v.acquisition_cost.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">{v.region ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="px-4 py-3.5 pr-5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          id={`edit-vehicle-${v.id}`}
                          variant="ghost" size="sm"
                          onClick={() => { setEditVehicle(v); setShowForm(true); }}
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                          Edit
                        </Button>
                        <Button
                          id={`delete-vehicle-${v.id}`}
                          variant="ghost" size="sm"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => setDelVehicle(v)}
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Vehicle Form SlideOver ──────────────────────────── */}
      <VehicleForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditVehicle(null); }}
        initial={editVehicle}
        onSubmit={handleSubmit}
      />

      {/* ── Delete Confirm ─────────────────────────────────── */}
      <ConfirmDialog
        open={!!delVehicle}
        title="Delete Vehicle"
        message={`Delete ${delVehicle?.reg_no} (${delVehicle?.name_model})? This action cannot be undone.`}
        confirmLabel="Delete Vehicle"
        loading={delLoading}
        onConfirm={handleDelete}
        onCancel={() => setDelVehicle(null)}
      />
    </div>
  );
}
