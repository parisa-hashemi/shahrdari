import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Database,
  Info,
  Lock,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUiStore } from '@/stores/uiStore';
import { formatNumber } from '@/utils/format';

/* -------------------------------------------------------------- Skeleton --- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} aria-hidden />;
}

export function LoadingState({
  rows = 4,
  label = 'در حال بارگذاری…',
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-surface p-4">
          <Skeleton className="mb-3 h-4 w-1/3" />
          <Skeleton className="mb-2 h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-live="polite" className="overflow-hidden rounded-xl border border-border bg-surface">
      <span className="sr-only">در حال بارگذاری جدول…</span>
      <div className="border-b border-border bg-surface-2 px-4 py-2.5">
        <Skeleton className="h-3.5 w-40" />
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-4 border-b border-border px-4 py-3 last:border-0" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className="h-3.5" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- Messages --- */

interface StateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

function StateShell({
  icon,
  tone,
  title,
  description,
  action,
  className,
}: StateProps & { icon: ReactNode; tone: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-6 py-10 text-center',
        className,
      )}
    >
      <span className={cn('mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full', tone)}>
        {icon}
      </span>
      <h3 className="text-[14px] font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-[13px] leading-7 text-muted">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <StateShell {...props} icon={<Database size={18} />} tone="bg-surface-3 text-muted" />;
}

export function ErrorState({
  title = 'اجرای درخواست با مشکل مواجه شد.',
  description = 'علت احتمالی: در دسترس نبودن یکی از سرویس‌های موردنیاز. اقدام پیشنهادی: چند لحظه بعد دوباره تلاش کنید.',
  onRetry,
  ...rest
}: Partial<StateProps> & { onRetry?: () => void }) {
  return (
    <StateShell
      icon={<XCircle size={18} />}
      tone="bg-danger-bg text-danger"
      title={title}
      description={description}
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong px-4 text-sm hover:bg-surface-2"
          >
            <RefreshCw size={14} />
            تلاش دوباره
          </button>
        ) : undefined
      }
      {...rest}
    />
  );
}

export function PermissionDeniedState({
  description = 'شما مجوز مشاهده این بخش را ندارید. در صورت نیاز، درخواست دسترسی را از دبیرخانه پیگیری کنید.',
}: {
  description?: string;
}) {
  return (
    <StateShell
      icon={<Lock size={18} />}
      tone="bg-warning-bg text-warning"
      title="دسترسی محدود است"
      description={description}
    />
  );
}

export function UnavailableState({
  title = 'این قابلیت در حال حاضر در دسترس نیست',
  description,
}: Partial<StateProps>) {
  return (
    <StateShell
      icon={<CircleSlash size={18} />}
      tone="bg-neutralx-bg text-muted"
      title={title}
      description={
        description ??
        'در دسترس نبودن با «اجرای ناموفق» تفاوت دارد؛ هیچ اجرایی انجام نشده و هیچ مقداری تولید نشده است.'
      }
    />
  );
}

/* --------------------------------------------------------------- Callout --- */

export function Callout({
  tone = 'info',
  title,
  children,
  icon,
  className,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success' | 'neutral';
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'bg-info-bg border-[color:var(--c-info)]/25 text-[color:var(--c-info)]',
    warning: 'bg-warning-bg border-[color:var(--c-warning)]/25 text-[color:var(--c-warning)]',
    danger: 'bg-danger-bg border-[color:var(--c-danger)]/25 text-[color:var(--c-danger)]',
    success: 'bg-success-bg border-[color:var(--c-success)]/25 text-[color:var(--c-success)]',
    neutral: 'bg-surface-2 border-border text-muted',
  };
  const icons = {
    info: <Info size={15} />,
    warning: <AlertTriangle size={15} />,
    danger: <XCircle size={15} />,
    success: <CheckCircle2 size={15} />,
    neutral: <Info size={15} />,
  };
  return (
    <div className={cn('rounded-lg border px-3.5 py-3', tones[tone], className)} role="note">
      <div className="flex gap-2.5">
        <span className="mt-0.5 shrink-0">{icon ?? icons[tone]}</span>
        <div className="min-w-0 text-[13px] leading-7 text-text">
          {title && <p className="font-semibold">{title}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Progress --- */

export function Progress({
  value,
  label,
  tone = 'primary',
  showValue = true,
}: {
  value: number;
  label?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
}) {
  const colors = {
    primary: 'bg-primary-500',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  };
  return (
    <div>
      {(label || showValue) && (
        <div className="mb-1 flex items-baseline justify-between text-xs text-muted">
          <span>{label}</span>
          {showValue && <span className="num">{formatNumber(value)}٪</span>}
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors[tone])}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Toaster --- */

export function Toaster() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  const tones = {
    success: 'border-s-[3px] border-s-[color:var(--c-success)]',
    error: 'border-s-[3px] border-s-[color:var(--c-danger)]',
    warning: 'border-s-[3px] border-s-[color:var(--c-warning)]',
    info: 'border-s-[3px] border-s-[color:var(--c-info)]',
  };
  const icons = {
    success: <CheckCircle2 size={16} className="text-success" />,
    error: <XCircle size={16} className="text-danger" />,
    warning: <AlertTriangle size={16} className="text-warning" />,
    info: <Info size={16} className="text-info" />,
  };

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 start-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-2.5 rounded-lg bg-surface p-3 shadow-overlay animate-riseIn',
            tones[toast.variant],
          )}
        >
          <span className="mt-0.5">{icons[toast.variant]}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium leading-6">{toast.title}</p>
            {toast.description && (
              <p className="mt-0.5 text-xs leading-6 text-muted">{toast.description}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="بستن اعلان"
            onClick={() => dismiss(toast.id)}
            className="rounded p-0.5 text-faint hover:text-text"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
