import { cn } from '@/lib/utils';
import type { VehicleStatus, DriverStatus, TripStatus } from '@transitops/shared';

type Status = VehicleStatus | DriverStatus | TripStatus;

const CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  // vehicle
  available:  { label: 'Available',  dot: 'bg-brand-500', bg: 'bg-[#f4f4f4]', text: 'text-[#393C41]' },
  on_trip:    { label: 'On Trip',    dot: 'bg-brand-500', bg: 'bg-[#f4f4f4]', text: 'text-[#393C41]' },
  in_shop:    { label: 'In Shop',    dot: 'bg-[#8E8E8E]', bg: 'bg-[#f4f4f4]', text: 'text-[#393C41]' },
  retired:    { label: 'Retired',    dot: 'bg-[#8E8E8E]', bg: 'bg-[#f4f4f4]', text: 'text-[#393C41]' },
  // driver
  off_duty:   { label: 'Off Duty',   dot: 'bg-[#8E8E8E]', bg: 'bg-[#f4f4f4]', text: 'text-[#393C41]' },
  suspended:  { label: 'Suspended',  dot: 'bg-red-500',    bg: 'bg-red-50',    text: 'text-red-700' },
  // trip
  draft:      { label: 'Draft',      dot: 'bg-[#8E8E8E]', bg: 'bg-[#f4f4f4]', text: 'text-[#393C41]' },
  dispatched: { label: 'Dispatched', dot: 'bg-brand-500', bg: 'bg-[#f4f4f4]', text: 'text-[#393C41]' },
  completed:  { label: 'Completed',  dot: 'bg-brand-500', bg: 'bg-[#f4f4f4]', text: 'text-[#393C41]' },
  cancelled:  { label: 'Cancelled',  dot: 'bg-red-400',     bg: 'bg-red-50',     text: 'text-red-600'     },
};

interface Props { status: Status; className?: string }

export function StatusBadge({ status, className }: Props) {
  const cfg = CONFIG[status] ?? { label: status, dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.bg, cfg.text, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

interface GenericBadgeProps {
  label: string;
  variant?: 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  className?: string;
}

const VARIANTS = {
  default: 'bg-gray-100 text-gray-600',
  blue:    'bg-blue-50 text-blue-700',
  green:   'bg-emerald-50 text-emerald-700',
  yellow:  'bg-amber-50 text-amber-700',
  red:     'bg-red-50 text-red-700',
  purple:  'bg-purple-50 text-purple-700',
};

export function Badge({ label, variant = 'default', className }: GenericBadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold', VARIANTS[variant], className)}>
      {label}
    </span>
  );
}
