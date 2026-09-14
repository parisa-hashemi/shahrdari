import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AnalyticalResult, ModuleId } from '@/types/domain';
import { runsApi } from '@/api/runs';
import { scenariosApi } from '@/api/scenarios';
import { COMPARABLE_METRICS } from '@/mocks/engine';

/** Latest usable run for a scenario plus its results, keyed by metric code. */
export function useScenarioResults(scenarioId?: string) {
  const runQuery = useQuery({
    queryKey: ['run', 'latest', scenarioId],
    queryFn: () => runsApi.latestForScenario(scenarioId!),
    enabled: Boolean(scenarioId),
    // keep polling while the run is still moving, so results appear as soon as
    // the backend finishes without the user reloading anything
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === 'queued' || state === 'running' || state === 'cancelling' ? 1200 : false;
    },
  });

  const run = runQuery.data;
  const runActive = run?.state === 'queued' || run?.state === 'running' || run?.state === 'cancelling';
  const runId = run?.id;
  const resultsQuery = useQuery({
    queryKey: ['results', runId],
    queryFn: () => runsApi.results(runId!),
    enabled: Boolean(runId),
    refetchInterval: runActive ? 1200 : false,
  });

  const byMetric = useMemo(() => {
    const map = new Map<string, AnalyticalResult>();
    (resultsQuery.data ?? []).forEach((result) => map.set(result.metricCode, result));
    return map;
  }, [resultsQuery.data]);

  const byModule = useMemo(() => {
    const map = new Map<ModuleId, AnalyticalResult[]>();
    (resultsQuery.data ?? []).forEach((result) => {
      const list = map.get(result.moduleId) ?? [];
      list.push(result);
      map.set(result.moduleId, list);
    });
    return map;
  }, [resultsQuery.data]);

  return {
    run,
    results: resultsQuery.data ?? [],
    byMetric,
    byModule,
    isLoading: runQuery.isLoading || resultsQuery.isLoading,
    isError: runQuery.isError || resultsQuery.isError,
    refetch: () => {
      runQuery.refetch();
      resultsQuery.refetch();
    },
  };
}

export interface ComparisonRow {
  code: string;
  title: string;
  unit: string;
  precision: number;
  direction: 'increase' | 'decrease' | 'neutral';
  baseline: AnalyticalResult | undefined;
  scenario: AnalyticalResult | undefined;
  /** null when either side is missing — never treated as zero */
  delta: number | null;
  deltaPercent: number | null;
  comparable: boolean;
}

/** M11 alignment: only metrics that exist and are comparable on both sides. */
export function buildComparison(
  baseline: Map<string, AnalyticalResult>,
  scenario: Map<string, AnalyticalResult>,
): ComparisonRow[] {
  return COMPARABLE_METRICS.map((metric) => {
    const b = baseline.get(metric.code);
    const s = scenario.get(metric.code);
    const comparable = Boolean(b && s && b.value !== null && s.value !== null && b.unitCode === s.unitCode);
    const delta = comparable ? (s!.value as number) - (b!.value as number) : null;
    const deltaPercent =
      comparable && (b!.value as number) !== 0 ? (delta! / (b!.value as number)) * 100 : null;
    return {
      ...metric,
      baseline: b,
      scenario: s,
      delta,
      deltaPercent,
      comparable,
    };
  });
}

export function useScenarioList(studyId?: string) {
  return useQuery({
    queryKey: ['scenarios', studyId ?? 'all'],
    queryFn: () => scenariosApi.list(studyId),
  });
}
