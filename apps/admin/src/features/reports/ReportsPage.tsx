import { useState, useEffect } from 'react';
import {
  getVehicleReport, getTripsOverTime,
  vehicleReportToCSV, downloadCSV,
  type VehicleReportRow,
} from '@transitops/shared';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, Legend,
} from 'recharts';

const TYPE_LABELS: Record<string, string> = {
  van: 'Van', truck: 'Truck', pickup: 'Pickup', motorcycle: 'Moto', other: 'Other',
};

export default function ReportsPage() {
  const [rows,        setRows]        = useState<VehicleReportRow[]>([]);
  const [tripHistory, setTripHistory] = useState<{ date: string; completed: number; revenue: number }[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [exporting,   setExporting]   = useState(false);
  const [sortBy,      setSortBy]      = useState<'roi' | 'revenue' | 'opCost' | 'efficiency'>('revenue');

  useEffect(() => {
    Promise.all([
      getVehicleReport(supabase),
      getTripsOverTime(supabase, 30),
    ]).then(([r, t]) => {
      setRows(r.data);
      setTripHistory(t.data);
      setLoading(false);
    });
  }, []);

  function handleExport() {
    setExporting(true);
    const csv = vehicleReportToCSV(sorted);
    downloadCSV(csv, `transitops-vehicle-report-${new Date().toISOString().split('T')[0]}.csv`);
    setExporting(false);
  }

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === 'roi')        return b.roi - a.roi;
    if (sortBy === 'revenue')    return b.totalRevenue - a.totalRevenue;
    if (sortBy === 'opCost')     return b.operationalCost - a.operationalCost;
    if (sortBy === 'efficiency') return (b.fuelEfficiency ?? 0) - (a.fuelEfficiency ?? 0);
    return 0;
  });

  // Chart data
  const efficiencyData = rows
    .filter(r => r.fuelEfficiency !== null)
    .map(r => ({ name: r.reg_no, kmL: parseFloat((r.fuelEfficiency ?? 0).toFixed(2)), fill: '#3b82f6' }));

  const roiData = rows.map(r => ({
    name: r.reg_no,
    roi: parseFloat(r.roi.toFixed(2)),
    fill: r.roi >= 0 ? '#10b981' : '#ef4444',
  }));

  return (
    <div className="p-6 min-h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vehicle ROI, fuel efficiency, operational costs</p>
        </div>
        <Button id="export-csv-btn" variant="secondary" loading={exporting} onClick={handleExport}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Export CSV
        </Button>
      </div>

      {/* ── Charts row ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">
        {/* Fuel Efficiency */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-bold text-gray-700 mb-4">Fuel Efficiency by Vehicle (km/L)</p>
          {loading || efficiencyData.length === 0 ? (
            <EmptyChart label="Complete trips to see fuel efficiency" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={efficiencyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v} km/L`, 'Efficiency']} />
                <Bar dataKey="kmL" radius={[6, 6, 0, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ROI Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-bold text-gray-700 mb-4">Vehicle ROI (%)</p>
          {loading || roiData.length === 0 ? (
            <EmptyChart label="No vehicles yet" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={roiData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'ROI']} />
                <Bar dataKey="roi" radius={[6, 6, 0, 0]}>
                  {roiData.map((entry, index) => (
                    <rect key={index} fill={entry.roi >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Trips over time */}
      {tripHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-sm font-bold text-gray-700 mb-4">Completed Trips & Revenue (Last 30 Days)</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={tripHistory} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#colorRevenue)" name="Revenue (₹)" />
              <Area type="monotone" dataKey="completed" stroke="#3b82f6" fill="none" name="Trips" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Vehicle ROI table ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <p className="font-bold text-gray-800">Per-Vehicle Report</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sort by:</span>
            {([
              ['revenue',    'Revenue'   ],
              ['roi',        'ROI'       ],
              ['opCost',     'Op. Cost'  ],
              ['efficiency', 'Fuel Eff.' ],
            ] as [typeof sortBy, string][]).map(([key, label]) => (
              <button
                key={key}
                id={`sort-${key}`}
                onClick={() => setSortBy(key)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg border transition',
                  sortBy === key
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                {['Vehicle', 'Type', 'Trips', 'Revenue', 'Fuel Cost', 'Maint. Cost', 'Op. Cost', 'ROI', 'Fuel Eff.'].map(h => (
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
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5 first:pl-5">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: '75%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-gray-400 text-sm">
                    No vehicles in fleet yet
                  </td>
                </tr>
              ) : (
                sorted.map(r => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 pl-5">
                      <p className="font-mono text-xs font-bold text-brand-700">{r.reg_no}</p>
                      <p className="text-xs text-gray-400">{r.name_model}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">{TYPE_LABELS[r.type] ?? r.type}</td>
                    <td className="px-4 py-3.5 text-gray-700 tabular-nums">{r.completedTrips}</td>
                    <td className="px-4 py-3.5 font-semibold text-emerald-700 tabular-nums">
                      ₹{r.totalRevenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-blue-600 tabular-nums">₹{r.totalFuelCost.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-amber-600 tabular-nums">₹{r.totalMaintenanceCost.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-red-600 tabular-nums font-semibold">₹{r.operationalCost.toLocaleString()}</td>
                    {/* ROI badge */}
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold',
                        r.roi >= 10  ? 'bg-emerald-50 text-emerald-700' :
                        r.roi >= 0   ? 'bg-blue-50 text-blue-700' :
                        'bg-red-50 text-red-700'
                      )}>
                        {r.roi >= 0 ? '+' : ''}{r.roi.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 pr-5 text-gray-500 tabular-nums">
                      {r.fuelEfficiency !== null ? `${r.fuelEfficiency.toFixed(2)} km/L` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-48 flex items-center justify-center text-gray-300">
      <p className="text-sm">{label}</p>
    </div>
  );
}
