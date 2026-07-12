import { useState, useEffect, type FormEvent } from 'react';
import type { Driver } from '@transitops/shared';
import { SlideOver } from '@/components/ui/SlideOver';
import { Input, Select } from '@/components/ui/FormFields';
import { Button } from '@/components/ui/Button';

const DRIVER_STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'on_trip',   label: 'On Trip'   },
  { value: 'off_duty',  label: 'Off Duty'  },
  { value: 'suspended', label: 'Suspended' },
];

export interface DriverFormData {
  profile_id: string | null;
  name: string;
  license_no: string;
  license_category: string;
  license_expiry: string;
  contact: string;
  safety_score: number;
  status: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: Driver | null;
  onSubmit: (data: DriverFormData) => Promise<string | null>;
}

const EMPTY: DriverFormData = {
  profile_id: null,
  name: '', license_no: '', license_category: 'B',
  license_expiry: '', contact: '', safety_score: 100, status: 'available',
};

export function DriverForm({ open, onClose, initial, onSubmit }: Props) {
  const [form, setForm] = useState<DriverFormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof DriverFormData, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        profile_id: initial.profile_id ?? null,
        name: initial.name,
        license_no: initial.license_no,
        license_category: initial.license_category,
        license_expiry: initial.license_expiry,
        contact: initial.contact,
        safety_score: initial.safety_score ?? 100,
        status: initial.status,
      } : EMPTY);
      setErrors({});
      setServerError(null);
    }
  }, [open, initial]);

  function set<K extends keyof DriverFormData>(key: K, value: DriverFormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof DriverFormData, string>> = {};
    if (!form.name.trim())             e.name             = 'Full name is required';
    if (!form.license_no.trim())       e.license_no       = 'License number is required';
    if (!form.license_category.trim()) e.license_category = 'License category is required';
    if (!form.license_expiry)          e.license_expiry   = 'License expiry date is required';
    if (!form.contact.trim())          e.contact          = 'Contact is required';
    if (form.safety_score < 0 || form.safety_score > 100)
      e.safety_score = 'Safety score must be 0–100';
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

  const isEdit = !!initial;
  const isExpired = form.license_expiry && form.license_expiry < new Date().toISOString().split('T')[0];

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Driver' : 'Add Driver'}
      subtitle={isEdit ? `Editing ${initial?.name}` : 'Register a new driver'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button form="driver-form" type="submit" loading={loading}>
            {isEdit ? 'Save Changes' : 'Add Driver'}
          </Button>
        </>
      }
    >
      <form id="driver-form" onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-sm text-red-600">{serverError}</p>
          </div>
        )}

        <Input
          id="driver-name" label="Full Name" required
          value={form.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
          placeholder="Alex Santos"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="license-no" label="License Number" required
            value={form.license_no}
            onChange={e => set('license_no', e.target.value.toUpperCase())}
            error={errors.license_no}
            placeholder="N01-23-456789"
          />
          <Input
            id="license-category" label="License Category" required
            value={form.license_category}
            onChange={e => set('license_category', e.target.value.toUpperCase())}
            error={errors.license_category}
            placeholder="B, C, D…"
            hint="B=light, C=heavy, D=bus"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              id="license-expiry" label="License Expiry" required
              type="date"
              value={form.license_expiry}
              onChange={e => set('license_expiry', e.target.value)}
              error={errors.license_expiry}
            />
            {isExpired && !errors.license_expiry && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                License expired — driver blocked from dispatch (Rule §3)
              </p>
            )}
          </div>
          <Input
            id="contact" label="Contact" required
            value={form.contact}
            onChange={e => set('contact', e.target.value)}
            error={errors.contact}
            placeholder="+63 917 123 4567"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="safety-score" label="Safety Score (0–100)" required
            type="number" min={0} max={100}
            value={form.safety_score}
            onChange={e => set('safety_score', parseInt(e.target.value) || 0)}
            error={errors.safety_score}
          />
          <Select
            id="driver-status" label="Status" required
            value={form.status}
            onChange={e => set('status', e.target.value)}
            options={DRIVER_STATUSES}
            error={errors.status}
          />
        </div>
      </form>
    </SlideOver>
  );
}
