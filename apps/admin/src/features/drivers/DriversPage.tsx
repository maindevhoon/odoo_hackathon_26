import { useState, useEffect, useCallback } from 'react';
import type { Driver } from '@transitops/shared';
import { getDrivers, createDriver, updateDriver, deleteDriver, daysUntilExpiry, type DriverFilters } from '@transitops/shared';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/SlideOver';
import { DriverForm, type DriverFormData } from './DriverForm';
import { cn } from '@/lib/utils';

const STATUS_OPTS = [
  { value: '', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'on_trip',   label: 'On Trip'   },
  { value: 'off_duty',  label: 'Off Duty'  },
  { value: 'suspended', label: 'Suspended' },
];

function ExpiryBadge({ expiry }: { expiry: string }) {
  const days = daysUntilExpiry(expiry);
  const expired = days < 0;
  const soonExpires = days >= 0 && days <= 30;
  const dateStr = new Date(expiry).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center gap-1.5">
      {(expired || soonExpires) && (
        <svg xmlns="http://www.w3.org/2000/svg" className={cn('w-3.5 h-3.5 flex-shrink-0', expired ? 'text-red-500' : 'text-amber-500')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      )}
      <span className={cn('text-sm', expired ? 'text-red-600 font-medium' : soonExpires ? 'text-amber-600' : 'text-gray-500')}>
        {dateStr}
      </span>
    </div>
  );
}

export default function DriversPage() {
  const [drivers, setDrivers]   = useState<Driver[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [statusF, setStatusF]   = useState('');
  const [expiredOnly, setExpiredOnly] = useState(false);

  const [showForm,   setShowForm]   = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [delDriver,  setDelDriver]  = useState<Driver | null>(null);
  const [delLoading, setDelLoading] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    const filters: DriverFilters = {
      search: search || undefined,
      status: statusF as DriverFilters['status'] || undefined,
      expiredOnly: expiredOnly || undefined,
    };
    const { data } = await getDrivers(supabase, filters);
    setDrivers(data);
    setLoading(false);
  }, [search, statusF, expiredOnly]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  async function handleSubmit(data: DriverFormData): Promise<string | null> {
    if (editDriver) {
      const { error } = await updateDriver(supabase, editDriver.id, data as Parameters<typeof updateDriver>[2]);
      if (error) return error;
    } else {
      const { error } = await createDriver(supabase, data as Parameters<typeof createDriver>[1]);
      if (error) return error;
    }
    fetchDrivers();
    return null;
  }

  async function handleDelete() {
    if (!delDriver) return;
    setDelLoading(true);
    await deleteDriver(supabase, delDriver.id);
    setDelDriver(null);
    setDelLoading(false);
    fetchDrivers();
  }

  // ── Stats ──────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const stats = {
    total:     drivers.length,
    available: drivers.filter(d => d.status === 'available').length,
    on_trip:   drivers.filter(d => d.status === 'on_trip').length,
    off_duty:  drivers.filter(d => d.status === 'off_duty').length,
    suspended: drivers.filter(d => d.status === 'suspended').length,
    expired:   drivers.filter(d => d.license_expiry < today).length,
  };

  return (
    <div className="p-6 min-h-full">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} driver{stats.total !== 1 ? 's' : ''} registered</p>
        </div>
        <Button id="add-driver-btn" onClick={() => { setEditDriver(null); setShowForm(true); }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Add Driver
        </Button>
      </div>

      {/* ── Stats row ─────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Total',     value: stats.total,     color: 'bg-brand-50 text-brand-700 border-brand-100'       },
          { label: 'Available', value: stats.available, color: 'bg-emerald-50 text-emerald-700 border-emerald-100'  },
          { label: 'On Trip',   value: stats.on_trip,   color: 'bg-blue-50 text-blue-700 border-blue-100'           },
          { label: 'Off Duty',  value: stats.off_duty,  color: 'bg-gray-50 text-gray-600 border-gray-100'           },
          { label: 'Suspended', value: stats.suspended, color: 'bg-red-50 text-red-700 border-red-100'              },
          { label: 'Expired License', value: stats.expired, color: 'bg-amber-50 text-amber-700 border-amber-100'   },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl border p-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters + Table ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-1 max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              id="driver-search"
              type="search"
              placeholder="Search name or license no…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          <select
            id="driver-status-filter"
            value={statusF}
            onChange={e => setStatusF(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <button
            id="expired-license-filter"
            onClick={() => setExpiredOnly(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition',
              expiredOnly
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Expired Licenses
          </button>

          {(search || statusF || expiredOnly) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusF(''); setExpiredOnly(false); }}>
              Clear
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100">
                {['Name', 'License No', 'Category', 'License Expiry', 'Safety Score', 'Contact', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider first:pl-5 last:pr-5 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5 first:pl-5">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: '80%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                      </svg>
                      <p className="font-medium text-sm">No drivers found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                drivers.map(d => {
                  const expired = d.license_expiry < today;
                  return (
                    <tr key={d.id} className={cn('border-t border-gray-50 hover:bg-gray-50/60 transition-colors group', expired && 'bg-red-50/30')}>
                      <td className="px-4 py-3.5 pl-5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0',
                            d.status === 'available' ? 'bg-emerald-500' :
                            d.status === 'on_trip'   ? 'bg-blue-500' :
                            d.status === 'suspended' ? 'bg-red-500' : 'bg-gray-400'
                          )}>
                            {d.name[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-gray-600">{d.license_no}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">
                          {d.license_category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <ExpiryBadge expiry={d.license_expiry} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-[60px] h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', (d.safety_score ?? 0) >= 80 ? 'bg-emerald-500' : (d.safety_score ?? 0) >= 60 ? 'bg-amber-500' : 'bg-red-500')}
                              style={{ width: `${d.safety_score ?? 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 tabular-nums">{d.safety_score ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">{d.contact}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={d.status} /></td>
                      <td className="px-4 py-3.5 pr-5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            id={`edit-driver-${d.id}`}
                            variant="ghost" size="sm"
                            onClick={() => { setEditDriver(d); setShowForm(true); }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            Edit
                          </Button>
                          <Button
                            id={`delete-driver-${d.id}`}
                            variant="ghost" size="sm"
                            className="text-red-500 hover:bg-red-50"
                            onClick={() => setDelDriver(d)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DriverForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditDriver(null); }}
        initial={editDriver}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!delDriver}
        title="Remove Driver"
        message={`Remove ${delDriver?.name} from the system? This action cannot be undone.`}
        confirmLabel="Remove Driver"
        loading={delLoading}
        onConfirm={handleDelete}
        onCancel={() => setDelDriver(null)}
      />
    </div>
  );
}
