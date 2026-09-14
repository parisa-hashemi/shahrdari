import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, Route, X } from 'lucide-react';
import { journey, stepForPath } from '@/app/journey';
import { useJourneyStore } from '@/stores/journeyStore';
import { formatNumber } from '@/utils/format';
import { cn } from '@/utils/cn';

/**
 * Wayfinding, not decoration.
 *
 * The bar answers three questions on every screen: where am I on the path,
 * what am I meant to do here, and what is the next screen. It uses the accent
 * token, which is reserved for wayfinding so it can never be mistaken for a
 * status colour.
 */
export function JourneyBar() {
  const location = useLocation();
  const active = useJourneyStore((s) => s.active);
  const setActive = useJourneyStore((s) => s.setActive);
  const markVisited = useJourneyStore((s) => s.markVisited);
  const visited = useJourneyStore((s) => s.visited);

  const step = stepForPath(location.pathname);

  useEffect(() => {
    if (active && step) markVisited(step.key);
  }, [active, step, markVisited]);

  if (!active || !step) return null;

  const next = journey.find((s) => s.index === step.index + 1);
  const pct = Math.round((visited.length / journey.length) * 100);

  return (
    <div className="sticky top-[var(--topbar-h)] z-20 border-b border-accent-border bg-accent-bg">
      <div className="flex h-[var(--journeybar-h)] items-center gap-3 px-4 lg:px-6">
        <Link
          to="/journey"
          className="flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-2xs font-medium text-accent hover:bg-white/50"
        >
          <Route size={14} />
          <span className="num">
            قدم {formatNumber(step.index)} از {formatNumber(journey.length)}
          </span>
        </Link>

        <span className="hidden h-4 w-px bg-accent-border sm:block" aria-hidden />

        <p className="min-w-0 flex-1 truncate text-[13px]">
          <span className="font-semibold">{step.title}</span>
          <span className="mx-2 text-accent-border" aria-hidden>
            ·
          </span>
          <span className="text-muted">{step.task}</span>
        </p>

        <div
          className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/70 xl:block"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="پیشرفت مسیر راهنما"
        >
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>

        <Link
          to={next ? next.to : '/journey'}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 text-2xs font-medium text-white hover:opacity-90"
        >
          {next ? step.cta : 'پایان مسیر — دیدن جمع‌بندی'}
          <ArrowLeft size={13} />
        </Link>

        <button
          type="button"
          onClick={() => setActive(false)}
          aria-label="بستن مسیر راهنما"
          className="shrink-0 rounded p-1 text-accent hover:bg-white/60"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/**
 * End-of-page card: the same wayfinding, repeated where the user finishes
 * reading. Pages opt in by rendering it.
 */
export function NextStepCard({ className }: { className?: string }) {
  const location = useLocation();
  const active = useJourneyStore((s) => s.active);
  const step = stepForPath(location.pathname);
  if (!active || !step) return null;
  const next = journey.find((s) => s.index === step.index + 1);
  if (!next) return null;

  return (
    <aside
      className={cn(
        'mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-border bg-accent-bg px-4 py-3.5',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-2xs text-accent">
          قدم بعدی — {formatNumber(next.index)} از {formatNumber(journey.length)}
        </p>
        <p className="mt-0.5 text-[13px] font-semibold">{next.title}</p>
        <p className="mt-0.5 text-xs leading-6 text-muted">{next.task}</p>
      </div>
      <Link
        to={next.to}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-accent px-4 text-sm text-white hover:opacity-90"
      >
        {step.cta}
        <ArrowLeft size={15} />
      </Link>
    </aside>
  );
}
