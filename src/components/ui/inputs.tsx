import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatNumber, parseLocalizedNumber, toPersianDigits } from '@/utils/format';

const CONTROL =
  'w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-text placeholder:text-faint ' +
  'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100 disabled:bg-surface-3 disabled:text-muted';

export interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: ReactNode | ((props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode);
}

export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-text">
        {label}
        {required && (
          <span className="ms-1 text-danger" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only">(الزامی)</span>}
      </label>
      {typeof children === 'function'
        ? children({ id, describedBy, invalid: Boolean(error) })
        : children}
      {hint && !error && (
        <p id={hintId} className="text-xs leading-6 text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs leading-6 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  ltr?: boolean;
}

export function TextInput({ invalid, ltr, className, ...rest }: TextInputProps) {
  return (
    <input
      className={cn(CONTROL, 'h-9', invalid && 'border-danger focus:ring-danger/20', ltr && 'text-left font-mono', className)}
      dir={ltr ? 'ltr' : undefined}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export function TextArea({
  invalid,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(CONTROL, 'py-2 leading-7', invalid && 'border-danger', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string; disabled?: boolean }[];
  invalid?: boolean;
}

export function Select({ options, invalid, className, ...rest }: SelectProps) {
  return (
    <select
      className={cn(CONTROL, 'h-9 bg-surface pe-8', invalid && 'border-danger', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'جست‌وجو…',
  label = 'جست‌وجو',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search
        size={15}
        className="pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-faint start-2.5"
        aria-hidden
      />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(CONTROL, 'h-9 ps-8')}
      />
    </div>
  );
}

/**
 * Numeric input that accepts Persian or Latin digits, displays Persian digits
 * and always submits a canonical Number (FSD-A14.01).
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  id,
  describedBy,
  invalid,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-stretch gap-2">
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        inputMode="decimal"
        disabled={disabled}
        value={toPersianDigits(String(value))}
        onChange={(event) => {
          const parsed = parseLocalizedNumber(event.target.value);
          if (!Number.isNaN(parsed)) onChange(parsed);
          if (event.target.value.trim() === '') onChange(0);
        }}
        className={cn(CONTROL, 'h-9 num', invalid && 'border-danger')}
      />
      {unit && (
        <span className="inline-flex shrink-0 items-center rounded-md bg-surface-3 px-2.5 text-xs text-muted">
          {unit}
        </span>
      )}
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          aria-label="افزایش"
          disabled={disabled}
          onClick={() => onChange(Math.min(max ?? Infinity, value + step))}
          className="h-[18px] w-7 rounded-t-md border border-border-strong text-[10px] leading-none hover:bg-surface-2 disabled:opacity-50"
        >
          ▲
        </button>
        <button
          type="button"
          aria-label="کاهش"
          disabled={disabled}
          onClick={() => onChange(Math.max(min ?? -Infinity, value - step))}
          className="h-[18px] w-7 rounded-b-md border border-t-0 border-border-strong text-[10px] leading-none hover:bg-surface-2 disabled:opacity-50"
        >
          ▼
        </button>
      </div>
    </div>
  );
}

export function RangeSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit,
  precision = 0,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
  precision?: number;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-medium">
          {label}
        </label>
        <span className="num text-[13px] font-semibold text-primary-700">
          {formatNumber(value, { precision })} {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[color:var(--c-primary-600)]"
      />
      <div className="mt-1 flex justify-between text-2xs text-faint num">
        <span>{formatNumber(min, { precision })}</span>
        <span>{formatNumber(max, { precision })}</span>
      </div>
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-border-strong accent-[color:var(--c-primary-600)] disabled:opacity-50"
      />
      <label htmlFor={id} className={cn('text-[13px] leading-6', disabled && 'text-muted')}>
        {label}
        {description && <span className="block text-xs text-muted">{description}</span>}
      </label>
    </div>
  );
}
