import { BrowserRouter, Routes, Route } from 'react-router-dom';

/**
 * Phase 0 — App shell.
 * Routes will be populated in subsequent phases.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Phase0Shell />} />
      </Routes>
    </BrowserRouter>
  );
}

function Phase0Shell() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center">
      <div className="text-center text-white space-y-6 px-6">
        {/* Logo / Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="28" width="32" height="12" rx="3" fill="white" fillOpacity="0.9"/>
              <rect x="8" y="20" width="20" height="10" rx="2" fill="white" fillOpacity="0.7"/>
              <circle cx="12" cy="40" r="4" fill="white"/>
              <circle cx="28" cy="40" r="4" fill="white"/>
              <path d="M36 20 L44 20 L44 36 L36 36" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <circle cx="40" cy="40" r="4" fill="white" fillOpacity="0.7"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight">TransitOps</h1>
          <p className="text-brand-200 text-lg mt-1">Smart Transport Operations Platform</p>
        </div>

        {/* Phase badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          Phase 0 — Scaffold Complete ✓
        </div>

        {/* Status checks */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-left max-w-sm mx-auto space-y-3">
          <StatusRow label="Monorepo (pnpm)" done />
          <StatusRow label="packages/shared types" done />
          <StatusRow label="Supabase client factory" done />
          <StatusRow label="SQL migrations + seed" done />
          <StatusRow label="Admin app (Vite + React)" done />
          <StatusRow label="Driver app (Expo)" done />
          <StatusRow label="Auth + RBAC" pending />
        </div>

        <p className="text-brand-300 text-sm">
          Phase 1: Auth → coming next
        </p>
      </div>
    </div>
  );
}

function StatusRow({ label, done, pending }: { label: string; done?: boolean; pending?: boolean }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
        done ? 'bg-green-500' : 'bg-white/20'
      }`}>
        {done && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        {pending && <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>}
      </span>
      <span className={done ? 'text-white' : 'text-brand-300'}>{label}</span>
    </div>
  );
}

export default App;
