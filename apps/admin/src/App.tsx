import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';

// Phase placeholders — replaced per phase
const Placeholder = ({ name }: { name: string }) => (
  <div className="p-8">
    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
      <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">{name}</h2>
      <p className="text-gray-400 text-sm">Coming in the next phase</p>
    </div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected — all admin roles */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Fleet Manager + Safety Officer */}
              <Route
                element={<ProtectedRoute allowedRoles={['fleet_manager', 'safety_officer']} />}
              >
                <Route path="/drivers" element={<Placeholder name="Driver Management" />} />
                <Route path="/maintenance" element={<Placeholder name="Maintenance Logs" />} />
              </Route>

              {/* Fleet Manager only */}
              <Route element={<ProtectedRoute allowedRoles={['fleet_manager']} />}>
                <Route path="/vehicles" element={<Placeholder name="Vehicle Registry" />} />
                <Route path="/contracts" element={<Placeholder name="Contracts" />} />
              </Route>

              {/* Fleet Manager + Financial Analyst */}
              <Route
                element={<ProtectedRoute allowedRoles={['fleet_manager', 'financial_analyst']} />}
              >
                <Route path="/fuel-expenses" element={<Placeholder name="Fuel & Expenses" />} />
                <Route path="/reports" element={<Placeholder name="Reports & Analytics" />} />
              </Route>

              {/* All roles can view trips */}
              <Route path="/trips" element={<Placeholder name="Trip Management" />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
