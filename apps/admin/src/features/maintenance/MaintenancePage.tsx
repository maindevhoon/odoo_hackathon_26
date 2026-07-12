import { useState, useEffect, useCallback } from 'react';
import {
  getMaintenanceLogs, openMaintenance, closeMaintenance,
  type MaintenanceLogRow, type MaintenanceFilters,
} from '@transitops/shared';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/SlideOver';
import { MaintenanceForm, type MaintenanceFormData } from './MaintenanceForm';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  oil_change: 'Oil Change', tire: 'Tire', brake: 'Brake',
  engine: 'Engine', electrical: 'Electrical', body: 'Body',
  transmission: 'Transmission', inspection: 'Inspection', other: 'Other',
};

export default function MaintenancePage() {
  const [logs, setLogs]         = useState<MaintenanceLogRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);
  const [search, setSearch]     = useState('');

  const [showForm,    setShowForm]    = useState(false);
  const [closingLog,  setClosingLog]  = useState<MaintenanceLogRow | null>(null);
  const [closeLoading, setCloseLoading] = useState(false);
  const [actionError,  setActionError]  = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const filters: MaintenanceFilters = {
      activeOnly: activeOnly || undefined,
      search: search || undefined,
    };
    const { data } = await getMaintenanceLogs(supabase, filters);
    // active logs first
    data.sort((a, b) => Number(b.is_active) - Number(a.is_active));
    setLogs(data);
    setLoading(false);
  }, [activeOnly, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function handleOpen(data: MaintenanceFormData): Promise<string | null> {
    const { error } = await openMaintenance(supabase, data.vehicle_id, data.type, data.description, data.cost);
    if (error) return error;
    fetchLogs();
    return null;
  }

  async function handleClose() {
    if (!closingLog) return;
    setCloseLoading(true);
    const { error } = await closeMaintenance(supabase, closingLog.id);
    if (error) setActionError(error);
    setClosingLog(null);
    setCloseLoading(false);
    fetchLogs();
  }

  const active   = logs.filter(l => l.is_active);
  const history  = logs.filter(l => !l.is_active);
  const totalCost = logs.reduce((s, l) => s + (l.cost ?? 0), 0);

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{active.length} active · {history.length} historical</p>
        </div>
        <Button id="open-maintenance-btn" className="bg-amber-600 hover:bg-amber-700" onClick={() => { setShowForm(true); setActionError(null); }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Open Maintenance
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Records',    value: logs.length,               color: 'bg-brand-50 text-brand-700 border-brand-100'   },
          { label: 'Currently Active', value: active.length,             color: 'bg-amber-50 text-amber-700 border-amber-100'   },
          { label: 'Closed',           value: history.length,            color: 'bg-gray-50 text-gray-600 border-gray-100'      },
          { label: 'Total Cost (₹)',   value: `₹${totalCost.toLocaleString()}`, color: 'bg-red-50 text-red-700 border-red-100' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl border p-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* Error banner */}
      {actionError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm text-red-600 flex-1">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-1 max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              id="maint-search" type="search" placeholder="Search description…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            id="active-only-filter"
            onClick={() => setActiveOnly(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border transition',
              activeOnly ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', activeOnly ? 'bg-amber-500' : 'bg-gray-300')} />
            Active Only
          </button>
          {(search || activeOnly) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setActiveOnly(false); }}>Clear</Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100">
                {['Vehicle', 'Type', 'Description', 'Cost', 'Opened', 'Closed', 'Status', ''].map(h => (
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
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      <p className="font-medium text-sm">No maintenance records</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className={cn('border-t border-gray-50 hover:bg-gray-50/60 transition-colors group', log.is_active && 'bg-amber-50/30')}>
                    <td className="px-4 py-3.5 pl-5">
                      <p className="font-mono text-xs font-bold text-brand-700">{log.vehicle?.reg_no ?? '—'}</p>
                      <p className="text-xs text-gray-400">{log.vehicle?.name_model}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                        {TYPE_LABELS[log.type] ?? log.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 max-w-[200px] truncate">{log.description}</td>
                    <td className="px-4 py-3.5 text-gray-700 tabular-nums">
                      {log.cost ? `₹${log.cost.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(log.opened_at).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                      {log.closed_at
                        ? new Date(log.closed_at).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {log.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          Closed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 pr-5">
                      {log.is_active && (
                        <Button
                          id={`close-maint-${log.id}`}
                          variant="secondary" size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => setClosingLog(log)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          Close
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MaintenanceForm open={showForm} onClose={() => setShowForm(false)} onSubmit={handleOpen} />

      <ConfirmDialog
        open={!!closingLog}
        title="Close Maintenance"
        message={`Mark maintenance on ${closingLog?.vehicle?.reg_no} as complete? The vehicle will return to Available (Rule §10).`}
        confirmLabel="Close Maintenance"
        loading={closeLoading}
        onConfirm={handleClose}
        onCancel={() => setClosingLog(null)}
      />
    </div>
  );
}
