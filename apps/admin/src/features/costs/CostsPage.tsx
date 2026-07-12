import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  getFuelLogs, createFuelLog, deleteFuelLog,
  getExpenses, createExpense, deleteExpense,
  type FuelLogRow, type ExpenseRow, type CreateFuelLogInput, type CreateExpenseInput,
} from '@transitops/shared';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormFields';
import { SlideOver, ConfirmDialog } from '@/components/ui/SlideOver';
import { cn } from '@/lib/utils';

type Tab = 'fuel' | 'expenses';

const EXPENSE_CATEGORIES = [
  { value: 'toll',        label: 'Toll'        },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other',       label: 'Other'       },
];

const CAT_COLORS: Record<string, string> = {
  toll:        'bg-blue-50 text-blue-700',
  maintenance: 'bg-amber-50 text-amber-700',
  other:       'bg-gray-100 text-gray-600',
};

export default function CostsPage() {
  const [tab, setTab]               = useState<Tab>('fuel');
  const [fuelLogs, setFuelLogs]     = useState<FuelLogRow[]>([]);
  const [expenses, setExpenses]     = useState<ExpenseRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [vehicles, setVehicles]     = useState<{ id: string; reg_no: string; name_model: string }[]>([]);

  // Forms
  const [showFuelForm,    setShowFuelForm]    = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [delFuel,         setDelFuel]         = useState<FuelLogRow | null>(null);
  const [delExpense,      setDelExpense]       = useState<ExpenseRow | null>(null);
  const [delLoading,      setDelLoading]       = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [f, e, v] = await Promise.all([
      getFuelLogs(supabase),
      getExpenses(supabase),
      supabase.from('vehicles').select('id, reg_no, name_model').order('reg_no'),
    ]);
    setFuelLogs(f.data);
    setExpenses(e.data);
    setVehicles((v.data as typeof vehicles) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Totals
  const totalFuel    = fuelLogs.reduce((s, f) => s + (f.cost ?? 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operational Costs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fuel logs and expense records</p>
        </div>
        <Button
          id={tab === 'fuel' ? 'add-fuel-btn' : 'add-expense-btn'}
          onClick={() => tab === 'fuel' ? setShowFuelForm(true) : setShowExpenseForm(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          {tab === 'fuel' ? 'Log Fuel' : 'Add Expense'}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border bg-blue-50 border-blue-100 p-4">
          <p className="text-2xl font-bold text-blue-700">₱{totalFuel.toLocaleString()}</p>
          <p className="text-xs font-medium text-blue-600/70 mt-0.5">Total Fuel Cost</p>
          <p className="text-xs text-blue-500 mt-1">{fuelLogs.length} log{fuelLogs.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-2xl border bg-amber-50 border-amber-100 p-4">
          <p className="text-2xl font-bold text-amber-700">₱{totalExpense.toLocaleString()}</p>
          <p className="text-xs font-medium text-amber-600/70 mt-0.5">Total Expenses</p>
          <p className="text-xs text-amber-500 mt-1">{expenses.length} record{expenses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-2xl border bg-emerald-50 border-emerald-100 p-4">
          <p className="text-2xl font-bold text-emerald-700">₱{(totalFuel + totalExpense).toLocaleString()}</p>
          <p className="text-xs font-medium text-emerald-600/70 mt-0.5">Total Operational Cost</p>
          <p className="text-xs text-emerald-500 mt-1">Fuel + Expenses combined</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex border-b border-gray-100">
          {([['fuel', 'Fuel Logs'], ['expenses', 'Expenses']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              id={`tab-${t}`}
              onClick={() => setTab(t)}
              className={cn(
                'px-6 py-4 text-sm font-semibold border-b-2 transition-colors',
                tab === t
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {tab === 'fuel' ? (
            <FuelTable logs={fuelLogs} loading={loading} onDelete={setDelFuel} />
          ) : (
            <ExpenseTable expenses={expenses} loading={loading} onDelete={setDelExpense} />
          )}
        </div>
      </div>

      {/* Fuel form */}
      <FuelForm
        open={showFuelForm}
        vehicles={vehicles}
        onClose={() => setShowFuelForm(false)}
        onSubmit={async (data) => {
          const { error } = await createFuelLog(supabase, data);
          if (error) return error;
          fetchAll();
          return null;
        }}
      />

      {/* Expense form */}
      <ExpenseForm
        open={showExpenseForm}
        vehicles={vehicles}
        onClose={() => setShowExpenseForm(false)}
        onSubmit={async (data) => {
          const { error } = await createExpense(supabase, data);
          if (error) return error;
          fetchAll();
          return null;
        }}
      />

      {/* Delete confirms */}
      <ConfirmDialog
        open={!!delFuel}
        title="Delete Fuel Log"
        message={`Delete this fuel log (${delFuel?.liters}L · ₱${delFuel?.cost?.toLocaleString()})? This cannot be undone.`}
        confirmLabel="Delete"
        loading={delLoading}
        onConfirm={async () => {
          if (!delFuel) return;
          setDelLoading(true);
          await deleteFuelLog(supabase, delFuel.id);
          setDelFuel(null);
          setDelLoading(false);
          fetchAll();
        }}
        onCancel={() => setDelFuel(null)}
      />
      <ConfirmDialog
        open={!!delExpense}
        title="Delete Expense"
        message={`Delete this ₱${delExpense?.amount?.toLocaleString()} ${delExpense?.category} expense? This cannot be undone.`}
        confirmLabel="Delete"
        loading={delLoading}
        onConfirm={async () => {
          if (!delExpense) return;
          setDelLoading(true);
          await deleteExpense(supabase, delExpense.id);
          setDelExpense(null);
          setDelLoading(false);
          fetchAll();
        }}
        onCancel={() => setDelExpense(null)}
      />
    </div>
  );
}

// ─── Fuel Table ───────────────────────────────────────────────
function FuelTable({ logs, loading, onDelete }: { logs: FuelLogRow[]; loading: boolean; onDelete: (l: FuelLogRow) => void }) {
  if (loading) return <LoadingSkeleton cols={7} />;
  if (logs.length === 0) return <EmptyState label="No fuel logs yet" />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-t border-gray-100">
          {['Vehicle', 'Trip', 'Liters', 'Cost', 'Cost/L', 'Date', ''].map(h => (
            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider first:pl-5 last:pr-5">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {logs.map(l => (
          <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors group">
            <td className="px-4 py-3.5 pl-5">
              <p className="font-mono text-xs font-bold text-brand-700">{l.vehicle?.reg_no ?? '—'}</p>
              <p className="text-xs text-gray-400">{l.vehicle?.name_model}</p>
            </td>
            <td className="px-4 py-3.5 text-gray-500 text-xs">
              {l.trip ? `${l.trip.source} → ${l.trip.destination}` : '—'}
            </td>
            <td className="px-4 py-3.5 font-semibold text-gray-800 tabular-nums">{l.liters}L</td>
            <td className="px-4 py-3.5 text-gray-700 tabular-nums">₱{l.cost?.toLocaleString()}</td>
            <td className="px-4 py-3.5 text-gray-400 tabular-nums text-xs">
              {l.liters > 0 && l.cost ? `₱${(l.cost / l.liters).toFixed(2)}/L` : '—'}
            </td>
            <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">
              {new Date(l.logged_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
            </td>
            <td className="px-4 py-3.5 pr-5">
              <Button
                id={`del-fuel-${l.id}`} variant="ghost" size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50"
                onClick={() => onDelete(l)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Expense Table ────────────────────────────────────────────
function ExpenseTable({ expenses, loading, onDelete }: { expenses: ExpenseRow[]; loading: boolean; onDelete: (e: ExpenseRow) => void }) {
  if (loading) return <LoadingSkeleton cols={6} />;
  if (expenses.length === 0) return <EmptyState label="No expenses recorded" />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-t border-gray-100">
          {['Category', 'Vehicle', 'Trip', 'Amount', 'Date', ''].map(h => (
            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider first:pl-5 last:pr-5">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {expenses.map(e => (
          <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors group">
            <td className="px-4 py-3.5 pl-5">
              <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize', CAT_COLORS[e.category] ?? 'bg-gray-100 text-gray-600')}>
                {e.category}
              </span>
            </td>
            <td className="px-4 py-3.5 font-mono text-xs font-bold text-brand-700">{e.vehicle?.reg_no ?? '—'}</td>
            <td className="px-4 py-3.5 text-gray-500 text-xs">
              {e.trip ? `${e.trip.source} → ${e.trip.destination}` : '—'}
            </td>
            <td className="px-4 py-3.5 font-semibold text-gray-800 tabular-nums">₱{e.amount?.toLocaleString()}</td>
            <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">
              {new Date(e.logged_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
            </td>
            <td className="px-4 py-3.5 pr-5">
              <Button
                id={`del-expense-${e.id}`} variant="ghost" size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50"
                onClick={() => onDelete(e)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Fuel Form ────────────────────────────────────────────────
interface FormProps<T> {
  open: boolean;
  vehicles: { id: string; reg_no: string; name_model: string }[];
  onClose: () => void;
  onSubmit: (data: T) => Promise<string | null>;
}

function FuelForm({ open, vehicles, onClose, onSubmit }: FormProps<CreateFuelLogInput>) {
  const [vehicleId, setVehicleId] = useState('');
  const [liters, setLiters]       = useState('');
  const [cost, setCost]           = useState('');
  const [err, setErr]             = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => { if (open) { setVehicleId(''); setLiters(''); setCost(''); setErr(null); } }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!vehicleId || !liters || !cost) { setErr('All fields are required'); return; }
    setLoading(true);
    setErr(null);
    const error = await onSubmit({ vehicle_id: vehicleId, liters: parseFloat(liters), cost: parseFloat(cost) });
    if (error) { setErr(error); } else { onClose(); }
    setLoading(false);
  }

  const vehicleOpts = vehicles.map(v => ({ value: v.id, label: `${v.reg_no} — ${v.name_model}` }));

  return (
    <SlideOver open={open} onClose={onClose} title="Log Fuel"
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button form="fuel-form" type="submit" loading={loading}>Log Fuel</Button></>}>
      <form id="fuel-form" onSubmit={handleSubmit} className="space-y-5">
        {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{err}</p>}
        <Select id="fl-vehicle" label="Vehicle" required value={vehicleId} onChange={e => setVehicleId(e.target.value)} options={vehicleOpts} placeholder="— Select vehicle —" />
        <div className="grid grid-cols-2 gap-4">
          <Input id="fl-liters" label="Liters" required type="number" min={0.1} step={0.1} value={liters} onChange={e => setLiters(e.target.value)} placeholder="45.5" />
          <Input id="fl-cost" label="Total Cost (₱)" required type="number" min={0} value={cost} onChange={e => setCost(e.target.value)} placeholder="3200" />
        </div>
        {liters && cost && parseFloat(liters) > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
            Cost per liter: <strong>₱{(parseFloat(cost) / parseFloat(liters)).toFixed(2)}</strong>
          </div>
        )}
      </form>
    </SlideOver>
  );
}

// ─── Expense Form ─────────────────────────────────────────────
function ExpenseForm({ open, vehicles, onClose, onSubmit }: FormProps<CreateExpenseInput>) {
  const [category,  setCategory]  = useState<'toll' | 'maintenance' | 'other'>('toll');
  const [amount,    setAmount]    = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [err, setErr]             = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => { if (open) { setCategory('toll'); setAmount(''); setVehicleId(''); setErr(null); } }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!amount) { setErr('Amount is required'); return; }
    setLoading(true);
    setErr(null);
    const error = await onSubmit({ category, amount: parseFloat(amount), vehicle_id: vehicleId || null });
    if (error) { setErr(error); } else { onClose(); }
    setLoading(false);
  }

  const vehicleOpts = vehicles.map(v => ({ value: v.id, label: `${v.reg_no} — ${v.name_model}` }));

  return (
    <SlideOver open={open} onClose={onClose} title="Add Expense"
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button form="expense-form" type="submit" loading={loading}>Add Expense</Button></>}>
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-5">
        {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{err}</p>}
        <Select id="exp-cat" label="Category" required value={category} onChange={e => setCategory(e.target.value as typeof category)} options={EXPENSE_CATEGORIES} />
        <Input id="exp-amount" label="Amount (₱)" required type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} placeholder="500" />
        <Select id="exp-vehicle" label="Vehicle (optional)" value={vehicleId} onChange={e => setVehicleId(e.target.value)} options={vehicleOpts} placeholder="— Not vehicle-specific —" />
      </form>
    </SlideOver>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function LoadingSkeleton({ cols }: { cols: number }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {Array.from({ length: 3 }).map((_, i) => (
          <tr key={i} className="border-t border-gray-50">
            {Array.from({ length: cols }).map((_, j) => (
              <td key={j} className="px-4 py-3.5 first:pl-5">
                <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: '80%' }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-16 text-center text-gray-400">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"/>
      </svg>
      <p className="font-medium text-sm">{label}</p>
    </div>
  );
}
