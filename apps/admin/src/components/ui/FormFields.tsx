import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const messageId = id ? `${id}-message` : undefined;
    return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded border border-[#d0d1d2] bg-white px-3.5 py-2.5 text-sm text-[#171A20] placeholder-[#8e8e8e]',
          'hover:border-[#8e8e8e] focus:border-brand-500 transition-colors duration-[330ms]',
          error && 'border-red-500',
          className
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={messageId}
        {...props}
      />
      {error && <p id={messageId} role="alert" className="text-xs font-medium text-red-600">{error}</p>}
      {!error && hint && <p id={messageId} className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
  }
);
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const messageId = id ? `${id}-message` : undefined;
    return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded border border-[#d0d1d2] bg-white px-3.5 py-2.5 text-sm text-[#171A20]',
          'hover:border-[#8e8e8e] focus:border-brand-500 transition-colors duration-[330ms]',
          error && 'border-red-500',
          className
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={messageId}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p id={messageId} role="alert" className="text-xs font-medium text-red-600">{error}</p>}
      {!error && hint && <p id={messageId} className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
  }
);
Select.displayName = 'Select';
