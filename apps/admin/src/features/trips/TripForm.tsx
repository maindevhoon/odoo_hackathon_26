import { useState, useEffect, type FormEvent } from 'react';
import { SlideOver } from '@/components/ui/SlideOver';
import { Input, Select } from '@/components/ui/FormFields';
import { Button } from '@/components/ui/Button';
import { getDispatchableVehicles, getDispatchableDrivers } from '@transitops/shared';
import type { Vehicle, Driver } from '@transitops/shared';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export interface TripFormData {
  source: string;
  destination: string;
  vehicle_id: string;
  driver_id: string;
  cargo_weight_kg: number;
  planned_distance: number;
  revenue: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TripFormData) => Promise<string | null>;
}

const EMPTY: TripFormData = {
  source: '', destination: '', vehicle_id: '', driver_id: '',
  cargo_weight_kg: 0, planned_distance: 0, revenue: 0,
};

export function TripForm({ open, onClose, onSubmit }: Props) {
  const [form, setForm]         = useState<TripFormData>(EMPTY);
  const [errors, setErrors]     = useState<Partial<Record<keyof TripFormData, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers]   = useState<Driver[]>([]);
  const [loadingPickers, setLoadingPickers] = useState(false);

  // Selected vehicle for real-time load validation
  const selectedVehicle = vehicles.find(v => v.id === form.vehicle_id);
  const overweight = selectedVehicle && form.cargo_weight_kg > selectedVehicle.max_load_kg;
  const loadPct = selectedVehicle && form.cargo_weight_kg > 0
    ? Math.min((form.cargo_weight_kg / selectedVehicle.max_load_kg) * 100, 100)
    : 0;

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setErrors({});
      setServerError(null);
      setLoadingPickers(true);
      Promise.all([
        getDispatchableVehicles(supabase),
        getDispatchableDrivers(supabase),
      ]).then(([v, d]) => {
        setVehicles(v.data);
        setDrivers(d.data);
        setLoadingPickers(false);
      });
    }
  }, [open]);

  function set<K extends keyof TripFormData>(key: K, value: TripFormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof TripFormData, string>> = {};
    if (!form.source.trim())      e.source          = 'Origin is required';
    if (!form.destination.trim()) e.destination     = 'Destination is required';
    if (!form.vehicle_id)         e.vehicle_id      = 'Select a vehicle';
    if (!form.driver_id)          e.driver_id       = 'Select a driver';
    if (form.cargo_weight_kg <= 0) e.cargo_weight_kg = 'Cargo weight must be > 0';
    if (overweight)               e.cargo_weight_kg = `Exceeds vehicle max load of ${selectedVehicle?.max_load_kg} kg (Rule §5)`;
    if (form.planned_distance < 0) e.planned_distance = 'Distance cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    const err = await onSubmit(form);
    if (err) { setServerError(err); } else { onClose(); }
    setLoading(false);
  }

  const vehicleOpts = vehicles.map(v => ({
    value: v.id,
    label: `${v.reg_no} — ${v.name_model} (max ${v.max_load_kg} kg)`,
  }));
  const driverOpts = drivers.map(d => ({
    value: d.id,
    label: `${d.name}`,
  }));

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Create Trip"
      subtitle="New trip starts as Draft — dispatch when ready"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button form="trip-form" type="submit" loading={loading}>Create Trip</Button>
        </>
      }
    >
      <form id="trip-form" onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-sm text-red-600">{serverError}</p>
          </div>
        )}

        {/* Route */}
        <div className="grid grid-cols-2 gap-4">
          <Input id="source" label="Origin" required
            value={form.source} onChange={e => set('source', e.target.value)}
            error={errors.source} placeholder="Mumbai" />
          <Input id="destination" label="Destination" required
            value={form.destination} onChange={e => set('destination', e.target.value)}
            error={errors.destination} placeholder="Pune" />
        </div>

        {/* Vehicle picker */}
        {loadingPickers ? (
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <Select
            id="vehicle_id" label="Vehicle" required
            value={form.vehicle_id}
            onChange={e => { set('vehicle_id', e.target.value); set('cargo_weight_kg', 0); }}
            options={vehicleOpts}
            placeholder="— Select available vehicle —"
            error={errors.vehicle_id}
          />
        )}

        {/* Driver picker */}
        {loadingPickers ? (
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <Select
            id="driver_id" label="Driver" required
            value={form.driver_id}
            onChange={e => set('driver_id', e.target.value)}
            options={driverOpts}
            placeholder="— Select available driver —"
            error={errors.driver_id}
          />
        )}

        {/* Cargo weight with live load meter */}
        <div>
          <Input
            id="cargo_weight_kg" label="Cargo Weight (kg)" required type="number" min={0.1} step={0.1}
            value={form.cargo_weight_kg || ''}
            onChange={e => set('cargo_weight_kg', parseFloat(e.target.value) || 0)}
            error={errors.cargo_weight_kg}
            placeholder="450"
            hint={selectedVehicle ? `Vehicle max load: ${selectedVehicle.max_load_kg} kg` : undefined}
          />
          {/* Load capacity bar */}
          {selectedVehicle && form.cargo_weight_kg > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className={cn('font-medium', overweight ? 'text-red-600' : 'text-gray-500')}>
                  {form.cargo_weight_kg} / {selectedVehicle.max_load_kg} kg
                </span>
                <span className={cn('font-semibold', overweight ? 'text-red-600' : loadPct > 85 ? 'text-amber-600' : 'text-emerald-600')}>
                  {Math.round(loadPct)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-300', overweight ? 'bg-red-500' : loadPct > 85 ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ width: `${Math.min(loadPct, 100)}%` }}
                />
              </div>
              {overweight && (
                <p className="text-xs text-red-600 mt-1 font-medium">⚠ Overweight — Rule §5 will block dispatch</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input id="planned_distance" label="Planned Distance (km)" type="number" min={0}
            value={form.planned_distance || ''}
            onChange={e => set('planned_distance', parseFloat(e.target.value) || 0)}
            error={errors.planned_distance} placeholder="0" />
          <Input id="revenue" label="Revenue (₹)" type="number" min={0}
            value={form.revenue || ''}
            onChange={e => set('revenue', parseFloat(e.target.value) || 0)}
            placeholder="0" />
        </div>

        {/* Rules reminder */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-brand-700 mb-2">Business Rules Applied</p>
          <ul className="space-y-1 text-xs text-brand-600">
            <li>§2 — Retired / In-Shop vehicles excluded from vehicle picker</li>
            <li>§3 — Suspended / expired-license drivers excluded from driver picker</li>
            <li>§4 — Drivers + vehicles already On Trip excluded</li>
            <li>§5 — Cargo weight validated against vehicle max load</li>
            <li>§6 — Dispatch sets both vehicle + driver to On Trip (transactional)</li>
          </ul>
        </div>
      </form>
    </SlideOver>
  );
}
