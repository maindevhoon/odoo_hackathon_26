// ─── Role ────────────────────────────────────────────────────────────────────
export type Role = 'fleet_manager' | 'safety_officer' | 'financial_analyst' | 'driver';

// ─── Vehicle ──────────────────────────────────────────────────────────────────
export type VehicleStatus = 'available' | 'on_trip' | 'in_shop' | 'retired';
export type VehicleType = 'van' | 'truck' | 'pickup' | 'motorcycle' | 'other';

export interface Vehicle {
  id: string;
  reg_no: string;           // UNIQUE
  name_model: string;
  type: VehicleType;
  max_load_kg: number;
  odometer: number;
  acquisition_cost: number;
  status: VehicleStatus;
  region: string;
  owner_driver_id?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Driver ───────────────────────────────────────────────────────────────────
export type DriverStatus = 'available' | 'on_trip' | 'off_duty' | 'suspended';

export interface Driver {
  id: string;
  profile_id: string | null;
  name: string;
  license_no: string;
  license_category: string;
  license_expiry: string;   // date only (YYYY-MM-DD)
  contact: string;
  safety_score: number;     // 0-100
  status: DriverStatus;
  work_mode?: 'driver_only' | 'owner_driver';
  created_at: string;
  updated_at: string;
}

// ─── Trip ─────────────────────────────────────────────────────────────────────
export type TripStatus = 'draft' | 'dispatched' | 'completed' | 'cancelled';

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicle_id: string;
  driver_id: string;
  cargo_weight_kg: number;
  planned_distance: number;
  final_odometer: number | null;
  fuel_consumed: number | null;
  revenue: number;
  status: TripStatus;
  contract_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Maintenance ──────────────────────────────────────────────────────────────
export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  type: string;
  description: string;
  cost: number;
  opened_at: string;
  closed_at: string | null;
  is_active: boolean;
  created_at: string;
}

// ─── Fuel Log ─────────────────────────────────────────────────────────────────
export interface FuelLog {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  liters: number;
  cost: number;
  logged_at: string;
}

// ─── Expense ──────────────────────────────────────────────────────────────────
export type ExpenseCategory = 'toll' | 'maintenance' | 'other';

export interface Expense {
  id: string;
  vehicle_id: string | null;
  trip_id: string | null;
  category: ExpenseCategory;
  amount: number;
  logged_at: string;
}

// ─── Contract (Differentiator) ────────────────────────────────────────────────
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type ContractStatus = 'open' | 'assigned' | 'active' | 'completed' | 'cancelled' | 'breached';

export interface Contract {
  id: string;
  company_id: string;
  title: string;
  vehicle_class: string;
  cargo_type: string;
  region: string;
  min_tier: Tier;
  pay: number;
  start_date: string;
  end_date: string;
  driver_id: string | null;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
}

// ─── Driver Progress (Differentiator) ────────────────────────────────────────
export interface DriverProgress {
  driver_id: string;
  xp: number;
  tier: Tier;
  contracts_completed: number;
  contracts_breached: number;
  updated_at: string;
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  region: string | null;
}

// ─── Trusted work marketplace ───────────────────────────────────────────────
export type OrganizationTier = 'tier_1' | 'tier_2' | 'tier_3';
export type OrganizationVerificationStatus = 'pending' | 'verified' | 'suspended';
export type QualificationStatus = 'pending' | 'verified' | 'expired' | 'revoked';
export type WorkerReportStatus = 'submitted' | 'under_review' | 'upheld' | 'dismissed' | 'appealed';

export interface Organization {
  id: string;
  name: string;
  tier: OrganizationTier;
  verification_status: OrganizationVerificationStatus;
  region: string;
  industry: string;
  created_at: string;
  updated_at: string;
}

export interface WorkerQualification {
  id: string;
  driver_id: string;
  category: 'local_delivery' | 'light_cargo' | 'high_value_goods' | 'refrigerated_cargo' | 'long_haul' | 'truck_logistics';
  status: QualificationStatus;
  issuer: string;
  issued_at: string | null;
  expires_at: string | null;
  evidence_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkerReport {
  id: string;
  driver_id: string;
  reporter_organization_id: string;
  category: 'safety' | 'conduct' | 'cargo_handling' | 'attendance' | 'other';
  description: string;
  evidence_url: string | null;
  reporter_tier_snapshot: OrganizationTier;
  status: WorkerReportStatus;
  resolution_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Tier Thresholds ──────────────────────────────────────────────────────────
export const TIER_THRESHOLDS: Record<Tier, number> = {
  bronze: 0,
  silver: 500,
  gold: 1500,
  platinum: 3500,
};

export function xpToTier(xp: number): Tier {
  if (xp >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (xp >= TIER_THRESHOLDS.gold) return 'gold';
  if (xp >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export const TIER_ORDER: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];

export function tierGte(a: Tier, b: Tier): boolean {
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b);
}
