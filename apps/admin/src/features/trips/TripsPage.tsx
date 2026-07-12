import { useState, useEffect, useCallback } from 'react';
import {
  getTrips, createTrip, dispatchTrip, completeTrip, cancelTrip,
  type TripRow, type TripFilters, type CreateTripInput,
} from '@transitops/shared';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/SlideOver';
import { TripForm, type TripFormData } from './TripForm';
import { CompleteTripDialog } from './CompleteTripDialog';
import { cn } from '@/lib/utils';

const STATUS_OPTS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft',      label: 'Draft'      },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'completed',  label: 'Completed'  },
  { value: 'cancelled',  label: 'Cancelled'  },
];

const STATUS_PRIORITY: Record<string, number> = {
  dispatched: 0, draft: 1, completed: 2, cancelled: 3,
};

export default function TripsPage() {
  const [trips, setTrips]     = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusF, setStatusF] = useState('');

  const [showCreate,   setShowCreate]   = useState(false);
  const [completingTrip, setCompletingTrip] = useState<TripRow | null>(null);
  const [cancellingTrip, setCancellingTrip] = useState<TripRow | null>(null);
  const [cancelLoading,  setCancelLoading]  = useState(false);
  const [actionError,    setActionError]    = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    const filters: TripFilters = {
      search: search || undefined,
      status: statusF as TripFilters['status'] || undefined,
    };
    const { data } = await getTrips(supabase, filters);
    // Sort by status priority, then by created_at desc
    data.sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9));
    setTrips(data);
    setLoading(false);
  }, [search, statusF]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  async function handleCreate(data: TripFormData): Promise<string | null> {
    const { error } = await createTrip(supabase, data as CreateTripInput);
    if (error) return error;
    fetchTrips();
    return null;
  }

  async function handleDispatch(trip: TripRow) {
    setActionError(null);
    const { error } = await dispatchTrip(supabase, trip.id);
    if (error) { setActionError(error); return; }
    fetchTrips();
  }

  async function handleComplete(finalOdometer: number, fuelConsumed: number): Promise<string | null> {
    if (!completingTrip) return 'No trip selected';
    const { error } = await completeTrip(supabase, completingTrip.id, finalOdometer, fuelConsumed);
    if (error) return error;
    setCompletingTrip(null);
    fetchTrips();
    return null;
  }

  async function handleCancel() {
    if (!cancellingTrip) return;
    setCancelLoading(true);
    const { error } = await cancelTrip(supabase, cancellingTrip.id);
    if (error) setActionError(error);
    setCancellingTrip(null);
    setCancelLoading(false);
    fetchTrips();
  }

  // ── Stats ────────────────────────────────────────────────────
  const stats = {
    total:      trips.length,
    draft:      trips.filter(t => t.status === 'draft').length,
    dispatched: trips.filter(t => t.status === 'dispatched').length,
    completed:  trips.filter(t => t.status === 'completed').length,
    cancelled:  trips.filter(t => t.status === 'cancelled').length,
  };

  return (
    <div className="p-6 min-h-full">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trip Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} trip{stats.total !== 1 ? 's' : ''} total</p>
        </div>
        <Button id="create-trip-btn" onClick={() => { setShowCreate(true); setActionError(null); }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          New Trip
        </Button>
      </div>

      {/* ── Stats ──────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total',      value: stats.total,      color: 'bg-brand-50 text-brand-700 border-brand-100'       },
          { label: 'Draft',      value: stats.draft,      color: 'bg-gray-50 text-gray-600 border-gray-100'           },
          { label: 'Dispatched', value: stats.dispatched, color: 'bg-blue-50 text-blue-700 border-blue-100'           },
          { label: 'Completed',  value: stats.completed,  color: 'bg-emerald-50 text-emerald-700 border-emerald-100'  },
          { label: 'Cancelled',  value: stats.cancelled,  color: 'bg-red-50 text-red-600 border-red-100'              },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl border p-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Action error banner ────────────────────────────── */}
      {actionError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div className="flex-1">
            <p className="font-semibold text-red-700 text-sm">Business Rule Violation</p>
            <p className="text-red-600 text-sm mt-0.5">{actionError}</p>
          </div>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 transition flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {/* ── Filters + Table ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 p-4">
          <div className="relative flex-1 max-w-xs">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              id="trip-search" type="search" placeholder="Search origin or destination…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <select
            id="trip-status-filter" value={statusF} onChange={e => setStatusF(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(search || statusF) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusF(''); }}>Clear</Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100">
                {['Route', 'Vehicle', 'Driver', 'Cargo', 'Distance', 'Revenue', 'Status', 'Actions'].map(h => (
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
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: '80%' }}/>
                      </td>
                    ))}
                  </tr>
                ))
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                      </svg>
                      <p className="font-medium text-sm">No trips found</p>
                      <p className="text-xs">Create a new trip to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                trips.map(trip => (
                  <TripRow
                    key={trip.id}
                    trip={trip}
                    onDispatch={() => handleDispatch(trip)}
                    onComplete={() => setCompletingTrip(trip)}
                    onCancel={() => setCancellingTrip(trip)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      <TripForm open={showCreate} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />

      <CompleteTripDialog
        open={!!completingTrip}
        trip={completingTrip}
        onConfirm={handleComplete}
        onCancel={() => setCompletingTrip(null)}
      />

      <ConfirmDialog
        open={!!cancellingTrip}
        title="Cancel Trip"
        message={`Cancel trip from ${cancellingTrip?.source} to ${cancellingTrip?.destination}? ${cancellingTrip?.status === 'dispatched' ? 'Vehicle and driver will be restored to Available.' : ''}`}
        confirmLabel="Cancel Trip"
        loading={cancelLoading}
        onConfirm={handleCancel}
        onCancel={() => setCancellingTrip(null)}
      />
    </div>
  );
}

// ─── Trip Row ─────────────────────────────────────────────────
interface TripRowProps {
  trip: TripRow;
  onDispatch: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

function TripRow({ trip, onDispatch, onComplete, onCancel }: TripRowProps) {
  const [dispatching, setDispatching] = useState(false);
  const canDispatch  = trip.status === 'draft';
  const canComplete  = trip.status === 'dispatched';
  const canCancel    = trip.status === 'draft' || trip.status === 'dispatched';
  const isTerminal   = trip.status === 'completed' || trip.status === 'cancelled';

  async function handleDispatch() {
    setDispatching(true);
    await onDispatch();
    setDispatching(false);
  }

  return (
    <tr className={cn('border-t border-gray-50 hover:bg-gray-50/60 transition-colors', isTerminal && 'opacity-60')}>
      {/* Route */}
      <td className="px-4 py-3.5 pl-5">
        <div className="flex items-center gap-2">
          <div>
            <p className="font-semibold text-gray-800">{trip.source}</p>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
              </svg>
              {trip.destination}
            </div>
          </div>
        </div>
      </td>
      {/* Vehicle */}
      <td className="px-4 py-3.5">
        <p className="font-mono text-xs font-bold text-brand-700">{trip.vehicle?.reg_no ?? '—'}</p>
        <p className="text-xs text-gray-400">{trip.vehicle?.name_model}</p>
      </td>
      {/* Driver */}
      <td className="px-4 py-3.5">
        <p className="text-gray-800">{trip.driver?.name ?? '—'}</p>
      </td>
      {/* Cargo */}
      <td className="px-4 py-3.5">
        <p className="text-gray-700 tabular-nums">{trip.cargo_weight_kg} kg</p>
        {trip.vehicle && (
          <p className="text-xs text-gray-400">/ {trip.vehicle.max_load_kg} max</p>
        )}
      </td>
      {/* Distance */}
      <td className="px-4 py-3.5 text-gray-500 tabular-nums">
        {trip.planned_distance ? `${trip.planned_distance} km` : '—'}
      </td>
      {/* Revenue */}
      <td className="px-4 py-3.5 text-gray-500 tabular-nums">
        {trip.revenue ? `₱${trip.revenue.toLocaleString()}` : '—'}
      </td>
      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusBadge status={trip.status as Parameters<typeof StatusBadge>[0]['status']} />
      </td>
      {/* Actions */}
      <td className="px-4 py-3.5 pr-5">
        <div className="flex items-center gap-1 flex-wrap">
          {canDispatch && (
            <Button
              id={`dispatch-trip-${trip.id}`}
              variant="primary" size="sm"
              loading={dispatching}
              onClick={handleDispatch}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
              Dispatch
            </Button>
          )}
          {canComplete && (
            <Button
              id={`complete-trip-${trip.id}`}
              variant="secondary" size="sm"
              onClick={onComplete}
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Complete
            </Button>
          )}
          {canCancel && (
            <Button
              id={`cancel-trip-${trip.id}`}
              variant="ghost" size="sm"
              className="text-red-500 hover:bg-red-50"
              onClick={onCancel}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Cancel
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
