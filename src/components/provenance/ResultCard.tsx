import { Info } from 'lucide-react';
import type { AnalyticalResult } from '@/types/domain';
import { Badge, Ltr } from '@/components/ui/display';
import { AvailabilityBadge, MethodBadge } from './AvailabilityBadge';
import { formatNumber } from '@/utils/format';
import { missingReasonLabels, uncertaintyLabels } from '@/utils/dictionary';
import { cn } from '@/utils/cn';

/**
 * A single analytical result.
 *
 * Design rule (brief §16 / FSD-B01.2): a missing result never renders as zero,
 * and an estimate is never presented with the authority of a definite
 * calculation. Value, unit, scope, period, method, coverage and provenance are
 * always visible together.
 */
export function ResultCard({
  result,
  onInspect,
  compact,
}: {
  result: AnalyticalResult;
  onInspect?: (result: AnalyticalResult) => void;
  compact?: boolean;
}) {
  const missing = result.value === null;
  const isEstimate = result.availability === 'proxy';

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-xl border bg-surface p-3.5 shadow-card',
        missing ? 'border-dashed border-border-strong bg-surface-2' : 'border-border',
      )}
    >
      <header className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-[13px] font-medium leading-6">
          {isEstimate && !missing ? `${result.metricTitle} (برآوردی)` : result.metricTitle}
        </h4>
        <Ltr className="text-2xs text-faint">{result.metricCode}</Ltr>
      </header>

      <div className="flex items-baseline gap-1.5">
        {missing ? (
          <span className="text-[15px] font-medium text-muted">مقدار موجود نیست</span>
        ) : (
          <>
            <span className="num text-2xl font-semibold leading-8">
              {formatNumber(result.value, { precision: result.precision })}
            </span>
            <span className="text-xs text-muted">{result.unitCode}</span>
          </>
        )}
      </div>

      {missing && result.missingReason && (
        <p className="mt-1 text-xs leading-6 text-muted">{missingReasonLabels[result.missingReason]}</p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <AvailabilityBadge availability={result.availability} missingReason={result.missingReason} />
        {!compact && <MethodBadge subtype={result.provenance.methodSubtype} />}
      </div>

      {!compact && (
        <dl className="mt-3 space-y-1 text-2xs leading-5 text-muted">
          <div className="flex justify-between gap-2">
            <dt>محدوده</dt>
            <dd className="truncate">{result.geographicScope}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>دوره</dt>
            <dd>{result.temporalScope}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>پوشش</dt>
            <dd className="num">{formatNumber(result.coverage?.describedPct ?? 0)}٪</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>عدم قطعیت</dt>
            <dd>{uncertaintyLabels[result.uncertainty.status]}</dd>
          </div>
        </dl>
      )}

      {onInspect && (
        <button
          type="button"
          onClick={() => onInspect(result)}
          className="mt-3 inline-flex items-center gap-1.5 self-start rounded-md border border-border-strong px-2.5 py-1 text-2xs text-muted hover:bg-surface-2 hover:text-text"
        >
          <Info size={12} />
          منشأ و پشتوانه نتیجه
        </button>
      )}
    </article>
  );
}

/** Inline result value, for tables and dense comparison views. */
export function ResultValue({ result }: { result?: AnalyticalResult }) {
  if (!result) {
    return <span className="text-xs text-muted">—</span>;
  }
  if (result.value === null) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-xs text-muted">موجود نیست</span>
        <Badge tone="muted">
          {result.missingReason ? missingReasonLabels[result.missingReason] : 'بدون نتیجه'}
        </Badge>
      </span>
    );
  }
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="num font-medium">{formatNumber(result.value, { precision: result.precision })}</span>
      <span className="text-2xs text-muted">{result.unitCode}</span>
    </span>
  );
}
