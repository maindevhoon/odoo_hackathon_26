import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  getContracts, createContract, assignContract, completeContract,
  breachContract, cancelContract, subscribeToContracts,
  TIER_CONFIG, TIER_PERKS,
  type ContractRow, type CreateContractInput,
} from '@transitops/shared';
import type { Tier } from '@transitops/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { SlideOver, ConfirmDialog } from '@/components/ui/SlideOver';
import { Input, Select } from '@/components/ui/FormFields';
import { cn } from '@/lib/utils';

const TIERS: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  open:      { label: 'Open',      dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  assigned:  { label: 'Assigned',  dot: 'bg-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-700'    },
  active:    { label: 'Active',    dot: 'bg-brand-400',   bg: 'bg-brand-50',   text: 'text-brand-700'   },
  completed: { label: 'Completed', dot: 'bg-gray-400',    bg: 'bg-gray-100',   text: 'text-gray-500'    },
  cancelled: { label: 'Cancelled', dot: 'bg-red-300',     bg: 'bg-red-50',     text: 'text-red-500'     },
  breached:  { label: 'Breached',  dot: 'bg-red-500',     bg: 'bg-red-100',    text: 'text-red-700'     },
};

type ActionModal = 'assign' | 'complete' | 'breach' | 'cancel' | null;

export default function ContractsPage() {
  const { profile } = useAuth();
  const [contracts,    setContracts]    = useState<ContractRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter,   setTierFilter]   = useState('');

  const [showCreate,     setShowCreate]     = useState(false);
  const [selectedContract, setSelected]     = useState<ContractRow | null>(null);
  const [actionModal,    setActionModal]    = useState<ActionModal>(null);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [actionError,    setActionError]    = useState<string | null>(null);
  const [xpResult,       setXpResult]       = useState<{ xp: number; tier: string } | null>(null);

  // Drivers for assign dropdown
  const [drivers, setDrivers] = useState<{ id: string; name: string; tier: string; status: string }[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await getContracts(supabase, {
      status: statusFilter as ContractRow['status'] | '' || undefined,
      minTier: tierFilter as Tier | '' || undefined,
    });
    setContracts(data);
    setLoading(false);
  }, [statusFilter, tierFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Load drivers + their tier for assign
  useEffect(() => {
    supabase
      .from('drivers')
      .select('id, name, status, driver_progress(tier)')
      .eq('status', 'available')
      .then(({ data }) => {
        setDrivers(
          (data ?? []).map((d: any) => ({
            id: d.id, name: d.name, status: d.status,
            tier: d.driver_progress?.[0]?.tier ?? 'bronze',
          }))
        );
      });
  }, [showCreate, actionModal]);

  // Realtime subscription
  useEffect(() => {
    const ch = subscribeToContracts(supabase, fetchAll);
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  function openAction(contract: ContractRow, action: ActionModal) {
    setSelected(contract);
    setActionModal(action);
    setActionError(null);
    setXpResult(null);
  }

  async function handleAction(extraData?: { driverId?: string }) {
    if (!selectedContract) return;
    setActionLoading(true);
    setActionError(null);

    let error: string | null = null;

    if (actionModal === 'assign' && extraData?.driverId) {
      const res = await assignContract(supabase, selectedContract.id, extraData.driverId);
      error = res.error;
    } else if (actionModal === 'complete') {
      const res = await completeContract(supabase, selectedContract.id);
      error = res.error;
      if (!error && res.data) setXpResult({ xp: res.data.new_xp, tier: res.data.new_tier });
    } else if (actionModal === 'breach') {
      const res = await breachContract(supabase, selectedContract.id);
      error = res.error;
    } else if (actionModal === 'cancel') {
      const res = await cancelContract(supabase, selectedContract.id);
      error = res.error;
    }

    if (error) { setActionError(error); } else { setActionModal(null); setSelected(null); fetchAll(); }
    setActionLoading(false);
  }

  const stats = {
    open:     contracts.filter(c => c.status === 'open').length,
    assigned: contracts.filter(c => c.status === 'assigned' || c.status === 'active').length,
    done:     contracts.filter(c => c.status === 'completed').length,
    total:    contracts.length,
  };

  return (
    <div className="p-6 min-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contract Board</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tier-gated driver contracts · Live via Realtime</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Realtime
          </span>
          <Button id="create-contract-btn" onClick={() => setShowCreate(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            Post Contract
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total',    value: stats.total,    color: 'bg-brand-50 text-brand-700 border-brand-100'     },
          { label: 'Open',     value: stats.open,     color: 'bg-emerald-50 text-emerald-700 border-emerald-100'},
          { label: 'Assigned', value: stats.assigned, color: 'bg-blue-50 text-blue-700 border-blue-100'         },
          { label: 'Completed',value: stats.done,     color: 'bg-gray-50 text-gray-600 border-gray-100'         },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-2xl border p-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {actionError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p className="text-sm text-red-600 flex-1">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
      )}

      {/* XP award banner */}
      {xpResult && (
        <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-5 py-4 animate-in slide-in-from-top-2">
          <span className="text-2xl">🏆</span>
          <p className="text-sm text-purple-700 font-medium">
            Contract completed! Driver now has <strong>{xpResult.xp} XP</strong> · Tier: <strong className="capitalize">{xpResult.tier}</strong>
          </p>
          <button onClick={() => setXpResult(null)} className="ml-auto text-purple-400 hover:text-purple-600"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
      )}

      {/* Filters + Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
            <option value="">All Statuses</option>
            {['open','assigned','active','completed','cancelled','breached'].map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
          <select id="tier-filter" value={tierFilter} onChange={e => setTierFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
            <option value="">All Tiers</option>
            {TIERS.map(t => <option key={t} value={t}>{TIER_CONFIG[t].label}+</option>)}
          </select>
          {(statusFilter || tierFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setTierFilter(''); }}>Clear</Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100">
                {['Title', 'Region', 'Min Tier', 'Pay', 'Period', 'Driver', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider first:pl-5 last:pr-5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5 first:pl-5"><div className="h-4 bg-gray-100 rounded animate-pulse w-4/5"/></td>
                    ))}
                  </tr>
                ))
              ) : contracts.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-gray-400 text-sm">No contracts yet. Post one to get started.</td></tr>
              ) : (
                contracts.map(c => {
                  const sc = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.open;
                  const tc = TIER_CONFIG[c.min_tier as Tier] ?? TIER_CONFIG.bronze;
                  const isActive = c.status === 'open' || c.status === 'assigned' || c.status === 'active';
                  return (
                    <tr key={c.id} className={cn('border-t border-gray-50 hover:bg-gray-50/60 transition-colors', !isActive && 'opacity-60')}>
                      <td className="px-4 py-3.5 pl-5">
                        <p className="font-semibold text-gray-800">{c.title}</p>
                        <p className="text-xs text-gray-400">{c.vehicle_class} · {c.cargo_type}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">{c.region}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border', tc.color, tc.bg, tc.border)}>
                          {tc.label}+
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-emerald-700 tabular-nums">₹{c.pay.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(c.start_date).toLocaleDateString('en-PH',{month:'short',day:'numeric'})} –{' '}
                        {new Date(c.end_date).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{c.driver?.name ?? <span className="text-gray-300">Unassigned</span>}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', sc.bg, sc.text)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot, c.status==='open' && 'animate-pulse')}/>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 pr-5">
                        <div className="flex items-center gap-1 flex-wrap">
                          {c.status === 'open' && (
                            <Button id={`assign-${c.id}`} variant="primary" size="sm" onClick={() => openAction(c, 'assign')}>Assign</Button>
                          )}
                          {(c.status === 'assigned' || c.status === 'active') && (
                            <>
                              <Button id={`complete-${c.id}`} variant="secondary" size="sm" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => openAction(c, 'complete')}>Complete</Button>
                              <Button id={`breach-${c.id}`} variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => openAction(c, 'breach')}>Breach</Button>
                            </>
                          )}
                          {c.status === 'open' && (
                            <Button id={`cancel-${c.id}`} variant="ghost" size="sm" className="text-gray-400 hover:bg-gray-50" onClick={() => openAction(c, 'cancel')}>Cancel</Button>
                          )}
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

      {/* Create form */}
      <CreateContractForm
        open={showCreate}
        userId={profile?.id ?? ''}
        onClose={() => setShowCreate(false)}
        onSubmit={async (data) => {
          const { error } = await createContract(supabase, data);
          if (error) return error;
          fetchAll();
          return null;
        }}
      />

      {/* Assign modal */}
      <AssignModal
        open={actionModal === 'assign'}
        contract={selectedContract}
        drivers={drivers}
        loading={actionLoading}
        error={actionError}
        onClose={() => { setActionModal(null); setActionError(null); }}
        onAssign={(driverId) => handleAction({ driverId })}
      />

      {/* Complete confirm */}
      <ConfirmDialog
        open={actionModal === 'complete'}
        title="Complete Contract"
        message={`Mark "${selectedContract?.title}" as complete? Driver will receive XP + tier may be upgraded.`}
        confirmLabel="Complete & Award XP"
        loading={actionLoading}
        onConfirm={() => handleAction()}
        onCancel={() => { setActionModal(null); setActionError(null); }}
      />

      {/* Breach confirm */}
      <ConfirmDialog
        open={actionModal === 'breach'}
        title="Breach Contract"
        message={`Mark "${selectedContract?.title}" as breached? Driver will lose 75 XP as a reliability penalty.`}
        confirmLabel="Mark as Breached"
        loading={actionLoading}
        onConfirm={() => handleAction()}
        onCancel={() => { setActionModal(null); setActionError(null); }}
      />

      {/* Cancel confirm */}
      <ConfirmDialog
        open={actionModal === 'cancel'}
        title="Cancel Contract"
        message={`Cancel "${selectedContract?.title}"? It will be removed from the driver's visible board.`}
        confirmLabel="Cancel Contract"
        loading={actionLoading}
        onConfirm={() => handleAction()}
        onCancel={() => { setActionModal(null); setActionError(null); }}
      />
    </div>
  );
}

// ─── Create Contract Form ─────────────────────────────────────
interface CreateFormProps {
  open: boolean;
  userId: string;
  onClose: () => void;
  onSubmit: (data: CreateContractInput) => Promise<string | null>;
}

const EMPTY_CONTRACT = {
  title: '', vehicle_class: 'van', cargo_type: '', region: '',
  min_tier: 'bronze' as Tier, pay: 0, start_date: '', end_date: '',
};

function CreateContractForm({ open, userId, onClose, onSubmit }: CreateFormProps) {
  const [form, setForm]               = useState(EMPTY_CONTRACT);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  useEffect(() => { if (open) { setForm(EMPTY_CONTRACT); setServerError(null); } }, [open]);

  function set<K extends keyof typeof EMPTY_CONTRACT>(key: K, val: (typeof EMPTY_CONTRACT)[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.title || !form.cargo_type || !form.region || !form.start_date || !form.end_date || form.pay <= 0) {
      setServerError('All fields are required and pay must be > 0');
      return;
    }
    setLoading(true);
    const err = await onSubmit({ ...form, company_id: userId });
    if (err) { setServerError(err); } else { onClose(); }
    setLoading(false);
  }

  return (
    <SlideOver open={open} onClose={onClose} title="Post New Contract" subtitle="Visible to drivers meeting the tier requirement"
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button form="contract-form" type="submit" loading={loading}>Post Contract</Button></>}>
      <form id="contract-form" onSubmit={handleSubmit} className="space-y-5">
        {serverError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{serverError}</p>}
        <Input id="c-title" label="Contract Title" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Weekly Pune Logistics Run" />
        <div className="grid grid-cols-2 gap-4">
          <Select id="c-vclass" label="Vehicle Class" value={form.vehicle_class} onChange={e => set('vehicle_class', e.target.value)}
            options={[{value:'motorcycle',label:'Motorcycle'},{value:'pickup',label:'Pickup'},{value:'van',label:'Van'},{value:'truck',label:'Truck'}]}/>
          <Input id="c-cargo" label="Cargo Type" required value={form.cargo_type} onChange={e => set('cargo_type', e.target.value)} placeholder="e.g. Electronics" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input id="c-region" label="Region" required value={form.region} onChange={e => set('region', e.target.value)} placeholder="e.g. Maharashtra" />
          <Input id="c-pay" label="Pay (₹)" type="number" min={1} required value={form.pay || ''} onChange={e => set('pay', parseFloat(e.target.value) || 0)} placeholder="15000" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input id="c-start" label="Start Date" type="date" required value={form.start_date} onChange={e => set('start_date', e.target.value)} />
          <Input id="c-end" label="End Date" type="date" required value={form.end_date} onChange={e => set('end_date', e.target.value)} />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Minimum Tier</p>
          <div className="grid grid-cols-4 gap-2">
            {TIERS.map(t => {
              const tc = TIER_CONFIG[t];
              return (
                <button key={t} type="button" onClick={() => set('min_tier', t)}
                  className={cn('rounded-xl border p-3 text-center transition', form.min_tier === t ? `${tc.bg} ${tc.border} ${tc.color}` : 'border-gray-200 text-gray-400 hover:border-gray-300')}>
                  <p className="text-xs font-bold">{tc.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{TIER_PERKS[t].split(' ').slice(0,2).join(' ')}</p>
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </SlideOver>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────
interface AssignModalProps {
  open: boolean;
  contract: ContractRow | null;
  drivers: { id: string; name: string; tier: string; status: string }[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onAssign: (driverId: string) => void;
}

function AssignModal({ open, contract, drivers, loading, error, onClose, onAssign }: AssignModalProps) {
  const [driverId, setDriverId] = useState('');
  useEffect(() => { if (open) setDriverId(''); }, [open]);

  if (!open || !contract) return null;
  const minTier = contract.min_tier as Tier;
  const eligible = drivers.filter(d => {
    const order: Tier[] = ['bronze','silver','gold','platinum'];
    return order.indexOf(d.tier as Tier) >= order.indexOf(minTier);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center gap-3 p-6 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Assign Driver</h3>
            <p className="text-sm text-gray-500">{contract.title} · Requires {TIER_CONFIG[minTier].label}+</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
          {eligible.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <p className="font-medium text-sm">No eligible drivers</p>
              <p className="text-xs mt-1">No available drivers meet the <strong>{TIER_CONFIG[minTier].label}</strong> tier requirement</p>
            </div>
          ) : (
            <div className="space-y-2">
              {eligible.map(d => {
                const tc = TIER_CONFIG[d.tier as Tier] ?? TIER_CONFIG.bronze;
                return (
                  <button key={d.id} onClick={() => setDriverId(d.id)}
                    className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left', driverId === d.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}>
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold', tc.bg, tc.color)}>
                      {d.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">{d.name}</p>
                    </div>
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', tc.bg, tc.color)}>{tc.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button disabled={!driverId || loading} loading={loading} onClick={() => onAssign(driverId)}>Assign Driver</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
