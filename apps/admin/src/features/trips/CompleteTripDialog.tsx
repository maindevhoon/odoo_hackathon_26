import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormFields';
import type { TripRow } from '@transitops/shared';

interface Props {
  open: boolean;
  trip: TripRow | null;
  onConfirm: (finalOdometer: number, fuelConsumed: number) => Promise<string | null>;
  onCancel: () => void;
}

export function CompleteTripDialog({ open, trip, onConfirm, onCancel }: Props) {
  const [odometer, setOdometer]       = useState('');
  const [fuel, setFuel]               = useState('');
  const [errors, setErrors]           = useState<{ odometer?: string; fuel?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  function validate() {
    const e: { odometer?: string; fuel?: string } = {};
    const odo = parseFloat(odometer);
    const f   = parseFloat(fuel);
    if (!odometer || isNaN(odo) || odo < 0) e.odometer = 'Enter final odometer reading (km)';
    if (!fuel     || isNaN(f)   || f <= 0)  e.fuel     = 'Enter fuel consumed (liters, > 0)';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    const err = await onConfirm(parseFloat(odometer), parseFloat(fuel));
    if (err) { setServerError(err); setLoading(false); }
  }

  if (!open || !trip) return null;

  // Fuel efficiency preview
  const fuelVal = parseFloat(fuel);
  const dist = trip.planned_distance ?? 0;
  const efficiency = dist > 0 && fuelVal > 0 ? (dist / fuelVal).toFixed(2) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Complete Trip</h3>
            <p className="text-sm text-gray-500">
              {trip.source} → {trip.destination} · {trip.vehicle?.reg_no}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {serverError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className="text-sm text-red-600">{serverError}</p>
            </div>
          )}

          <Input
            id="final-odometer" label="Final Odometer Reading (km)" required
            type="number" min={0} step={0.1}
            value={odometer}
            onChange={e => { setOdometer(e.target.value); setErrors(er => ({ ...er, odometer: undefined })); }}
            error={errors.odometer}
            placeholder="e.g. 42580"
          />

          <Input
            id="fuel-consumed" label="Fuel Consumed (liters)" required
            type="number" min={0.1} step={0.1}
            value={fuel}
            onChange={e => { setFuel(e.target.value); setErrors(er => ({ ...er, fuel: undefined })); }}
            error={errors.fuel}
            placeholder="e.g. 38.5"
          />

          {/* Efficiency preview */}
          {efficiency && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              <p className="text-sm text-blue-700">
                Fuel efficiency: <span className="font-bold">{efficiency} km/L</span>
                {dist > 0 && <span className="text-blue-500"> · {dist} km planned</span>}
              </p>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
            <p>✓ Trip status → <strong>Completed</strong></p>
            <p>✓ Vehicle <strong>{trip.vehicle?.reg_no}</strong> → Available</p>
            <p>✓ Driver <strong>{trip.driver?.name}</strong> → Available</p>
            <p>✓ Fuel log auto-created (Rule §7)</p>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" type="button" onClick={onCancel} disabled={loading}>Cancel</Button>
            <Button type="submit" loading={loading} className="bg-emerald-600 hover:bg-emerald-700">
              Complete Trip
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
