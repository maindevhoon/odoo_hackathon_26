import { useAuth } from '@/contexts/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  fleet_manager: 'Fleet Manager',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
  driver: 'Driver',
};

const ROLE_COLORS: Record<string, string> = {
  fleet_manager: 'bg-brand-100 text-brand-700',
  safety_officer: 'bg-yellow-100 text-yellow-700',
  financial_analyst: 'bg-green-100 text-green-700',
};

export default function DashboardPage() {
  const { profile, role } = useAuth();

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[role ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
            {ROLE_LABELS[role ?? ''] ?? role}
          </span>
        </div>
        <p className="text-gray-500 text-sm">
          Welcome back, <span className="font-medium text-gray-700">{profile?.full_name}</span>
        </p>
      </div>

      {/* Phase 1 auth success banner */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl p-6 text-white mb-8 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span className="font-semibold">Phase 1 Complete — Auth + RBAC ✓</span>
        </div>
        <p className="text-brand-100 text-sm">
          You're authenticated as <strong>{ROLE_LABELS[role ?? ''] ?? role}</strong> with role-gated access.
          The sidebar shows only the sections your role can access.
        </p>
      </div>

      {/* Phase progress */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Build Progress</h2>
        <div className="space-y-3">
          {[
            { phase: 'Phase 0', label: 'Scaffold + Supabase', done: true },
            { phase: 'Phase 1', label: 'Auth + RBAC', done: true },
            { phase: 'Phase 2', label: 'Vehicle & Driver CRUD', done: false },
            { phase: 'Phase 3', label: 'Trip Management + Business Rules', done: false },
            { phase: 'Phase 4', label: 'Maintenance + Fuel/Expense', done: false },
            { phase: 'Phase 5', label: 'Dashboard + Reports', done: false },
            { phase: 'Phase 6', label: 'Contracts + Tiers + Leaderboard', done: false },
            { phase: 'Phase 7', label: 'Offline + Polish', done: false },
          ].map(({ phase, label, done }) => (
            <div key={phase} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500' : 'bg-gray-100'}`}>
                {done ? (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                )}
              </div>
              <span className={`text-sm font-medium ${done ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                <span className="text-gray-400 font-normal">{phase} · </span>{label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
