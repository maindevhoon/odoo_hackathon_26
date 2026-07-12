import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';
import VehiclesPage from '@/features/vehicles/VehiclesPage';
import DriversPage from '@/features/drivers/DriversPage';
import TripsPage from '@/features/trips/TripsPage';
import MaintenancePage from '@/features/maintenance/MaintenancePage';
import CostsPage from '@/features/costs/CostsPage';
import ReportsPage from '@/features/reports/ReportsPage';
import ContractsPage from '@/features/contracts/ContractsPage';
import LeaderboardPage from '@/features/leaderboard/LeaderboardPage';



export default function App() {
  return (
    <div className="tesla-system">
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
                <Route path="/drivers" element={<DriversPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
              </Route>

              {/* Fleet Manager only */}
              <Route element={<ProtectedRoute allowedRoles={['fleet_manager']} />}>
                <Route path="/vehicles" element={<VehiclesPage />} />
                <Route path="/contracts" element={<ContractsPage />} />
              </Route>

              {/* Fleet Manager + Financial Analyst */}
              <Route
                element={<ProtectedRoute allowedRoles={['fleet_manager', 'financial_analyst']} />}
              >
                <Route path="/fuel-expenses" element={<CostsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
              </Route>

              {/* All roles can view trips + leaderboard */}
              <Route path="/trips" element={<TripsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
