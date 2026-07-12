import { useState, useEffect, type FormEvent } from 'react';
import type { Vehicle } from '@transitops/shared';
import { SlideOver } from '@/components/ui/SlideOver';
import { Input, Select } from '@/components/ui/FormFields';
import { Button } from '@/components/ui/Button';

const VEHICLE_TYPES = [
  { value: 'van',        label: 'Van'        },
  { value: 'truck',      label: 'Truck'      },
  { value: 'pickup',     label: 'Pickup'     },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'other',      label: 'Other'      },
];

const VEHICLE_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'on_trip',   label: 'On Trip'   },
  { value: 'in_shop',   label: 'In Shop'   },
  { value: 'retired',   label: 'Retired'   },
];

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: Vehicle | null;
  onSubmit: (data: VehicleFormData) => Promise<string | null>; // returns error or null
}

export interface VehicleFormData {
  reg_no: string;
  name_model: string;
  type: string;
  max_load_kg: number;
  odometer: number;
  acquisition_cost: number;
  status: string;
  region: string;
}

const EMPTY: VehicleFormData = {
  reg_no: '', name_model: '', type: 'van',
  max_load_kg: 0, odometer: 0, acquisition_cost: 0,
  status: 'available', region: '',
};

export function VehicleForm({ open, onClose, initial, onSubmit }: Props) {
  const [form, setForm] = useState<VehicleFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormData, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        reg_no: initial.reg_no,
        name_model: initial.name_model,
        type: initial.type,
        max_load_kg: initial.max_load_kg,
        odometer: initial.odometer,
        acquisition_cost: initial.acquisition_cost,
        status: initial.status,
        region: initial.region ?? '',
      } : EMPTY);
      setErrors({});
      setServerError(null);
    }
  }, [open, initial]);

  function set<K extends keyof VehicleFormData>(key: K, value: VehicleFormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof VehicleFormData, string>> = {};
    if (!form.reg_no.trim())    e.reg_no     = 'Registration number is required';
    if (!form.name_model.trim()) e.name_model = 'Model name is required';
    if (!form.type)              e.type       = 'Vehicle type is required';
    if (form.max_load_kg <= 0)   e.max_load_kg = 'Max load must be greater than 0';
    if (form.odometer < 0)       e.odometer   = 'Odometer cannot be negative';
    if (form.acquisition_cost < 0) e.acquisition_cost = 'Cost cannot be negative';
    if (!form.region.trim())     e.region     = 'Region is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    const err = await onSubmit(form);
    if (err) {
      setServerError(err);
    } else {
      onClose();
    }
    setLoading(false);
  }

  const isEdit = !!initial;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Vehicle' : 'Add Vehicle'}
      subtitle={isEdit ? `Editing ${initial?.reg_no}` : 'Register a new vehicle in the fleet'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button form="vehicle-form" type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Add Vehicle'}
          </Button>
        </>
      }
    >
      <form id="vehicle-form" onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-sm text-red-600">{serverError}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="reg_no" label="Registration Number" required
            value={form.reg_no}
            onChange={e => set('reg_no', e.target.value.toUpperCase())}
            error={errors.reg_no}
            placeholder="VAN-05"
            hint="Must be unique across the fleet"
          />
          <Select
            id="type" label="Vehicle Type" required
            value={form.type}
            onChange={e => set('type', e.target.value)}
            options={VEHICLE_TYPES}
            error={errors.type}
          />
        </div>

        <Input
          id="name_model" label="Model / Name" required
          value={form.name_model}
          onChange={e => set('name_model', e.target.value)}
          error={errors.name_model}
          placeholder="Toyota HiAce"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="max_load_kg" label="Max Load (kg)" required type="number" min={1}
            value={form.max_load_kg || ''}
            onChange={e => set('max_load_kg', parseFloat(e.target.value) || 0)}
            error={errors.max_load_kg}
            placeholder="500"
          />
          <Input
            id="odometer" label="Odometer (km)" required type="number" min={0}
            value={form.odometer || ''}
            onChange={e => set('odometer', parseFloat(e.target.value) || 0)}
            error={errors.odometer}
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="acquisition_cost" label="Acquisition Cost (₱)" required type="number" min={0}
            value={form.acquisition_cost || ''}
            onChange={e => set('acquisition_cost', parseFloat(e.target.value) || 0)}
            error={errors.acquisition_cost}
            placeholder="850000"
          />
          <Select
            id="status" label="Status" required
            value={form.status}
            onChange={e => set('status', e.target.value)}
            options={VEHICLE_STATUSES}
            error={errors.status}
          />
        </div>

        <Input
          id="region" label="Region" required
          value={form.region}
          onChange={e => set('region', e.target.value)}
          error={errors.region}
          placeholder="Metro Manila"
        />
      </form>
    </SlideOver>
  );
}
