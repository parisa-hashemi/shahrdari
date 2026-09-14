import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlert, FlaskConical, Loader2, Lock } from 'lucide-react';
import type { Run, RunState } from '@/types/domain';
import { Badge, StatusBadge, type Tone } from '@/components/ui/display';
import { Progress, Callout } from '@/components/ui/feedback';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { denialReason, type PermissionKey } from '@/utils/permissions';
import {
  missingReasonLabels,
  moduleTitles,
  runStageLabels,
  runStateLabels,
} from '@/utils/dictionary';
import { formatJalaliDate, formatNumber } from '@/utils/format';
import { config } from '@/services/config';
import { cn } from '@/utils/cn';

/* ---------------------------------------------------------- run status --- */

const RUN_TONE: Record<RunState, { tone: Tone; kind: 'ok' | 'warn' | 'error' | 'pending' | 'blocked' }> = {
  queued: { tone: 'muted', kind: 'pending' },
  running: { tone: 'info', kind: 'pending' },
  cancelling: { tone: 'warning', kind: 'pending' },
  succeeded: { tone: 'success', kind: 'ok' },
  partial: { tone: 'warning', kind: 'warn' },
  failed: { tone: 'danger', kind: 'error' },
  cancelled: { tone: 'muted', kind: 'blocked' },
  timed_out: { tone: 'danger', kind: 'error' },
};

export function RunStateBadge({ state }: { state: RunState }) {
  const style = RUN_TONE[state];
  return <StatusBadge label={runStateLabels[state]} tone={style.tone} kind={style.kind} />;
}

const STAGES: { key: string; label: string }[] = [
  { key: 'queued', label: runStageLabels.queued },
  { key: 'preparing', label: runStageLabels.preparing },
  { key: 'executing', label: runStageLabels.executing },
  { key: 'validating', label: runStageLabels.validating },
  { key: 'completed', label: runStageLabels.completed },
];

export function RunMonitor({
  run,
  onCancel,
  onRetry,
  compact,
}: {
  run: Run;
  onCancel?: () => void;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const active = run.state === 'queued' || run.state === 'running' || run.state === 'cancelling';
  const stageIndex = STAGES.findIndex((s) => s.key === run.stage);
  const blocked = run.nodes.filter((n) => n.state === 'blocked' || n.state === 'failed');

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            {active && <Loader2 size={15} className="animate-spin text-primary-600" aria-hidden />}
            <h3 className="text-[14px] font-semibold">وضعیت اجرای تحلیل</h3>
            <RunStateBadge state={run.state} />
          </div>
          <p className="mt-1 text-xs text-muted">
            شناسه اجرا: <span className="ltr-token">{run.code}</span>
            <span className="mx-2">·</span>
            آغاز: {formatJalaliDate(run.startedAt, true)}
            {run.finishedAt && (
              <>
                <span className="mx-2">·</span>
                پایان: {formatJalaliDate(run.finishedAt, true)}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {active && onCancel && (
            <Button size="sm" variant="secondary" onClick={onCancel}>
              لغو اجرا
            </Button>
          )}
          {(run.state === 'failed' || run.state === 'timed_out' || run.state === 'cancelled') && onRetry && (
            <Button size="sm" variant="primary" onClick={onRetry}>
              اجرای جدید
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3.5">
        <ol className="mb-3 flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs">
          {STAGES.map((stage, index) => (
            <li key={stage.key} className="flex items-center gap-1">
              <span
                className={cn(
                  'rounded-md px-2 py-0.5',
                  index < stageIndex && 'bg-success-bg text-success',
                  index === stageIndex && 'bg-primary-50 font-medium text-primary-700',
                  index > stageIndex && 'text-faint',
                )}
              >
                {stage.label}
              </span>
              {index < STAGES.length - 1 && <span className="text-faint">‹</span>}
            </li>
          ))}
        </ol>
        <Progress
          value={run.progressPct}
          tone={run.state === 'failed' ? 'danger' : run.state === 'partial' ? 'warning' : 'primary'}
          label={active ? 'پیشرفت اجرا — می‌توانید صفحه را ترک کنید؛ اجرا در پس‌زمینه ادامه دارد.' : 'پیشرفت اجرا'}
        />
      </div>

      {run.state === 'failed' && (
        <Callout tone="danger" title="اجرا ناموفق بود" className="mt-3.5">
          <p>علت: {run.failureReason}</p>
          {run.suggestedAction && <p className="mt-1">اقدام پیشنهادی: {run.suggestedAction}</p>}
        </Callout>
      )}

      {run.state === 'partial' && (
        <Callout tone="warning" title="تکمیل جزئی" className="mt-3.5">
          بخشی از خروجی‌های درخواست‌شده تولید نشده است. نتایج تولیدشده معتبرند، اما بسته تحلیلی کامل نیست و
          موارد اجرانشده در ادامه فهرست شده‌اند.
        </Callout>
      )}

      {!compact && blocked.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {blocked.map((node) => (
            <li key={node.moduleId} className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="muted">{node.moduleId}</Badge>
              <span className="font-medium">{moduleTitles[node.moduleId]}</span>
              <span className="text-muted">
                {node.message ?? (node.reason ? missingReasonLabels[node.reason] : 'اجرا نشد')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!compact && (
        <p className="mt-3 text-2xs leading-6 text-muted">
          تعداد ماژول درخواست‌شده: <span className="num">{formatNumber(run.requestedModules.length)}</span>
          <span className="mx-2">·</span>
          اثر انگشت ورودی‌ها: <span className="ltr-token">{run.inputManifestHash}</span>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------- permission gate --- */

/**
 * Shows the action but explains why it cannot be used, instead of hiding every
 * unauthorized capability (brief §28). Security is enforced by the backend.
 */
export function PermissionGate({
  permission,
  children,
  fallback,
}: {
  permission: PermissionKey;
  children: (allowed: boolean, reason: string | null) => ReactNode;
  fallback?: ReactNode;
}) {
  const roles = useAuthStore((s) => s.user.roles);
  const reason = denialReason(roles, permission);
  if (reason && fallback) return <>{fallback}</>;
  return <>{children(!reason, reason)}</>;
}

export function usePermission(permission: PermissionKey) {
  const roles = useAuthStore((s) => s.user.roles);
  const reason = denialReason(roles, permission);
  return { allowed: !reason, reason };
}

export function ReadOnlyBanner({ text }: { text: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-[13px] text-muted">
      <Lock size={15} aria-hidden />
      {text}
    </div>
  );
}

/* ------------------------------------------------------------ demo badge --- */

export function DemoBadge({ className }: { className?: string }) {
  if (!config.demoMode) return null;
  return (
    <Badge tone="warning" icon={<FlaskConical size={11} />} className={className}>
      داده نمایشی
    </Badge>
  );
}

export function ApprovalScopeNotice() {
  return (
    <Callout tone="neutral" icon={<CircleAlert size={15} />}>
      تأیید در این سامانه یک رویداد گردش‌کار سازمانی است. این تأیید به‌معنای اعتبار قانونی، صدور پروانه یا
      گواهی علمی نیست.{' '}
      <Link to="/reviews" className="text-primary-700 underline">
        مشاهده فرایند بررسی و تأیید
      </Link>
    </Callout>
  );
}
