import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronLeft,
  CircleDashed,
  CircleHelp,
  Info,
  Lock,
  Minus,
  XCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/format';

/* ------------------------------------------------------------ LTR token --- */

/** Renders technical Latin content (IDs, hashes, versions, CRS) safely in RTL. */
export function Ltr({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('ltr-token', className)}>{children}</span>;
}

/* ----------------------------------------------------------------- Card --- */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-surface shadow-card',
        padded && 'p-4',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {icon && <span className="mt-0.5 text-muted">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold leading-6">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-6 text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- Badge --- */

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'muted';

const TONES: Record<Tone, string> = {
  neutral: 'bg-neutralx-bg text-[color:var(--c-neutral)] border-transparent',
  success: 'bg-success-bg text-success border-transparent',
  warning: 'bg-warning-bg text-warning border-transparent',
  danger: 'bg-danger-bg text-danger border-transparent',
  info: 'bg-info-bg text-info border-transparent',
  primary: 'bg-primary-50 text-primary-700 border-primary-100',
  muted: 'bg-surface-3 text-muted border-transparent',
};

export function Badge({
  children,
  tone = 'neutral',
  icon,
  className,
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-2xs font-medium leading-5',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Status badge: never relies on colour alone — always icon + text. */
export function StatusBadge({
  label,
  tone = 'neutral',
  kind = 'dot',
  className,
}: {
  label: string;
  tone?: Tone;
  kind?: 'dot' | 'ok' | 'warn' | 'error' | 'blocked' | 'pending' | 'unknown' | 'locked' | 'info';
  className?: string;
}) {
  const icons: Record<string, ReactNode> = {
    dot: <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden />,
    ok: <Check size={12} aria-hidden />,
    warn: <AlertTriangle size={12} aria-hidden />,
    error: <XCircle size={12} aria-hidden />,
    blocked: <Ban size={12} aria-hidden />,
    pending: <CircleDashed size={12} aria-hidden />,
    unknown: <CircleHelp size={12} aria-hidden />,
    locked: <Lock size={12} aria-hidden />,
    info: <Info size={12} aria-hidden />,
  };
  return (
    <Badge tone={tone} icon={icons[kind]} className={className}>
      {label}
    </Badge>
  );
}

/* -------------------------------------------------------------- StatCard --- */

export function StatCard({
  label,
  value,
  unit,
  hint,
  tone = 'neutral',
  icon,
  to,
  footer,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  to?: string;
  footer?: ReactNode;
}) {
  const body = (
    <div className="flex h-full flex-col justify-between gap-2 rounded-xl border border-border bg-surface p-3.5 shadow-card transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] leading-6 text-muted">{label}</span>
        {icon && <span className={cn('rounded-md p-1', TONES[tone])}>{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="num text-2xl font-semibold leading-8">{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
      {hint && <p className="text-xs leading-6 text-muted">{hint}</p>}
      {footer}
    </div>
  );
  return to ? (
    <Link to={to} className="block h-full focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}

/* ------------------------------------------------------------------ Tabs --- */

export interface TabItem {
  key: string;
  label: string;
  badge?: ReactNode;
  disabled?: boolean;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn('flex gap-1 overflow-x-auto border-b border-border', className)}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.key)}
            className={cn(
              'relative -mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[13px] font-medium transition-colors',
              active
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-muted hover:text-text',
              item.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {item.label}
            {item.badge != null && (
              <span className="num ms-1.5 rounded bg-surface-3 px-1.5 py-0.5 text-2xs text-muted">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------ Breadcrumb --- */

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="مسیر صفحه" className="flex flex-wrap items-center gap-1 text-xs text-muted">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 && <ChevronLeft size={13} aria-hidden className="text-faint" />}
          {item.to ? (
            <Link to={item.to} className="hover:text-primary-700 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-text">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/* --------------------------------------------------------------- Stepper --- */

export function Stepper({
  steps,
  current,
  onSelect,
}: {
  steps: { key: string; label: string }[];
  current: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.key} className="flex items-center gap-1">
            <button
              type="button"
              disabled={!onSelect || index > current}
              onClick={() => onSelect?.(index)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                active && 'bg-primary-50 font-semibold text-primary-700',
                done && 'text-success hover:bg-surface-2',
                !active && !done && 'text-muted',
                index > current && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'num inline-flex h-5 w-5 items-center justify-center rounded-full border text-2xs',
                  active && 'border-primary-600 bg-primary-600 text-white',
                  done && 'border-success bg-success text-white',
                  !active && !done && 'border-border-strong',
                )}
                aria-hidden
              >
                {done ? <Check size={11} /> : formatNumber(index + 1)}
              </span>
              {step.label}
            </button>
            {index < steps.length - 1 && <ChevronLeft size={13} className="text-faint" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------- Timeline --- */

export function Timeline({
  items,
}: {
  items: {
    id: string;
    title: ReactNode;
    meta?: ReactNode;
    body?: ReactNode;
    tone?: Tone;
  }[];
}) {
  return (
    <ol className="relative space-y-4 ps-4">
      <span className="absolute inset-y-1 start-[5px] w-px bg-border" aria-hidden />
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            className={cn(
              'absolute -start-4 top-1.5 inline-block h-2.5 w-2.5 rounded-full ring-4 ring-surface',
              item.tone === 'success' && 'bg-success',
              item.tone === 'warning' && 'bg-warning',
              item.tone === 'danger' && 'bg-danger',
              item.tone === 'info' && 'bg-info',
              (!item.tone || item.tone === 'neutral' || item.tone === 'muted') && 'bg-border-strong',
              item.tone === 'primary' && 'bg-primary-500',
            )}
            aria-hidden
          />
          <div className="text-[13px] font-medium leading-6">{item.title}</div>
          {item.meta && <div className="text-xs text-muted">{item.meta}</div>}
          {item.body && <div className="mt-1 text-[13px] leading-7 text-muted">{item.body}</div>}
        </li>
      ))}
    </ol>
  );
}

/* --------------------------------------------------------- Definition list --- */

export function DefinitionList({
  items,
  columns = 2,
}: {
  items: { label: string; value: ReactNode }[];
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-2.5',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className="mt-0.5 text-[13px] leading-6">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------ Page header --- */

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  meta,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: { label: string; to?: string }[];
  meta?: ReactNode;
  /** small label above the title, e.g. the area this screen belongs to */
  eyebrow?: ReactNode;
}) {
  return (
    <header className="mb-5 border-b border-border pb-4">
      {breadcrumb && <Breadcrumb items={breadcrumb} />}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{eyebrow}</p>
          )}
          <h1 className="text-[22px] font-semibold leading-9">{title}</h1>
          {description && <p className="mt-1.5 max-w-3xl text-[13px] leading-7 text-muted">{description}</p>}
          {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------- Delta pill --- */

export function DeltaPill({
  delta,
  percent,
  direction = 'neutral',
  precision = 0,
}: {
  delta: number | null;
  percent?: number | null;
  direction?: 'increase' | 'decrease' | 'neutral';
  precision?: number;
}) {
  if (delta === null) {
    return (
      <Badge tone="muted" icon={<Minus size={11} />}>
        قابل مقایسه نیست
      </Badge>
    );
  }
  const improving =
    direction === 'neutral'
      ? null
      : (direction === 'increase' && delta > 0) || (direction === 'decrease' && delta < 0);
  const tone: Tone = delta === 0 ? 'muted' : improving === null ? 'info' : improving ? 'success' : 'warning';
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return (
    <Badge tone={tone}>
      <span className="num">
        {sign}
        {formatNumber(Math.abs(delta), { precision })}
        {percent != null && Number.isFinite(percent) ? ` (${sign}${formatNumber(Math.abs(percent), { precision: 1 })}٪)` : ''}
      </span>
    </Badge>
  );
}
