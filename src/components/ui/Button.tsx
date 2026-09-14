import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Tooltip } from './overlays';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white border border-primary-600 hover:bg-primary-700 hover:border-primary-700',
  secondary:
    'bg-surface text-text border border-border-strong hover:bg-surface-2',
  ghost: 'bg-transparent text-text border border-transparent hover:bg-surface-3',
  danger: 'bg-danger text-white border border-danger hover:opacity-90',
  subtle: 'bg-surface-3 text-text border border-transparent hover:bg-border',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-md',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconEnd?: ReactNode;
  loading?: boolean;
  /**
   * When set, the button is disabled and the reason is shown on hover/focus.
   * Unauthorized actions stay visible with an explanation instead of vanishing.
   */
  disabledReason?: string | null;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    iconEnd,
    loading = false,
    disabledReason,
    block,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading || Boolean(disabledReason);
  const button = (
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors select-none',
        'disabled:opacity-55 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        icon
      )}
      {children}
      {iconEnd}
    </button>
  );

  if (disabledReason) {
    return (
      <Tooltip content={disabledReason}>
        <span className="inline-flex">{button}</span>
      </Tooltip>
    );
  }
  return button;
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  variant?: Variant;
  size?: 'sm' | 'md';
  active?: boolean;
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  active,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        className={cn(
          'inline-flex items-center justify-center rounded-md transition-colors',
          size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
          VARIANTS[variant],
          active && 'bg-primary-50 border-primary-200 text-primary-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...rest}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
