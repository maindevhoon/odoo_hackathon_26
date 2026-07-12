import { useState, useEffect, type FormEvent } from 'react';
import { SlideOver } from '@/components/ui/SlideOver';
import { Input, Select } from '@/components/ui/FormFields';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

const MAINTENANCE_TYPES = [
  { value: 'oil_change',    label: 'Oil Change'       },
  { value: 'tire',          label: 'Tire Service'      },
  { value: 'brake',         label: 'Brake Service'     },
  { value: 'engine',        label: 'Engine Repair'     },
  { value: 'electrical',    label: 'Electrical'        },
  { value: 'body',          label: 'Body / Panel'      },
  { value: 'transmission',  label: 'Transmission'      },
  { value: 'inspection',    label: 'Periodic Inspection'},
  { value: 'other',         label: 'Other'             },
];

export interface MaintenanceFormData {
  vehicle_id: string;
  type: string;
  description: string;
  cost: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: MaintenanceFormData) => Promise<string | null>;
}

const EMPTY: MaintenanceFormData = { vehicle_id: '', type: 'oil_change', description: '', cost: 0 };

export function MaintenanceForm({ open, onClose, onSubmit }: Props) {
  const [form, setForm]               = useState<MaintenanceFormData>(EMPTY);
  const [errors, setErrors]           = useState<Partial<Record<keyof MaintenanceFormData, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [vehicles, setVehicles]       = useState<{ id: string; reg_no: string; name_model: string; status: string }[]>([]);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setErrors({});
      setServerError(null);
      // Load all non-retired vehicles
      supabase
        .from('vehicles')
        .select('id, reg_no, name_model, status')
        .neq('status', 'retired')
        .order('reg_no')
        .then(({ data }) => setVehicles((data as typeof vehicles) ?? []));
    }
  }, [open]);

  function set<K extends keyof MaintenanceFormData>(key: K, val: MaintenanceFormData[K]) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const e: Partial<Record<keyof MaintenanceFormData, string>> = {};
    if (!form.vehicle_id)          e.vehicle_id  = 'Select a vehicle';
    if (!form.type)                e.type        = 'Select a type';
    if (!form.description.trim())  e.description = 'Description is required';
    if (form.cost < 0)             e.cost        = 'Cost cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    const err = await onSubmit(form);
    if (err) { setServerError(err); } else { onClose(); }
    setLoading(false);
  }

  const vehicleOpts = vehicles.map(v => ({
    value: v.id,
    label: `${v.reg_no} — ${v.name_model} (${v.status})`,
  }));

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Open Maintenance"
      subtitle="Vehicle status will become In Shop (Rule §9)"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button form="maintenance-form" type="submit" loading={loading} className="bg-amber-600 hover:bg-amber-700">
            Open Maintenance
          </Button>
        </>
      }
    >
      <form id="maintenance-form" onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-sm text-red-600">{serverError}</p>
          </div>
        )}

        <Select
          id="maint-vehicle" label="Vehicle" required
          value={form.vehicle_id}
          onChange={e => set('vehicle_id', e.target.value)}
          options={vehicleOpts}
          placeholder="— Select vehicle —"
          error={errors.vehicle_id}
        />

        <Select
          id="maint-type" label="Maintenance Type" required
          value={form.type}
          onChange={e => set('type', e.target.value)}
          options={MAINTENANCE_TYPES}
          error={errors.type}
        />

        <Input
          id="maint-desc" label="Description" required
          value={form.description}
          onChange={e => set('description', e.target.value)}
          error={errors.description}
          placeholder="e.g. Routine oil change + filter replacement"
        />

        <Input
          id="maint-cost" label="Estimated Cost (₹)" type="number" min={0}
          value={form.cost || ''}
          onChange={e => set('cost', parseFloat(e.target.value) || 0)}
          error={errors.cost}
          placeholder="0"
          hint="Can be updated after closing"
        />

        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-amber-700 mb-1">Rule §9</p>
          <p className="text-xs text-amber-600">
            Opening maintenance immediately sets the vehicle to <strong>In Shop</strong> and
            removes it from the dispatch pool until the maintenance is closed.
          </p>
        </div>
      </form>
    </SlideOver>
  );
}
