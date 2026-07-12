import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const VARIANTS = {
  primary:   'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white',
  secondary: 'bg-[#f4f4f4] hover:bg-[#e9e9e9] active:bg-[#dedede] text-[#393C41]',
  danger:    'bg-[#393C41] hover:bg-[#171A20] active:bg-black text-white',
  ghost:     'hover:bg-[#f4f4f4] active:bg-[#eeeeee] text-[#5C5E62]',
};
const SIZES = {
  sm: 'min-h-8 px-3 py-1.5 text-xs gap-1.5',
  md: 'min-h-10 px-4 py-2 text-sm gap-2',
  lg: 'min-h-10 px-5 py-2.5 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded font-medium transition-colors duration-[330ms] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
