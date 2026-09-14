import type { AnalyticalResult, Run } from '@/types/domain';
import { db } from '@/mocks/db';
import { call } from './client';

export const runsApi = {
  /** GET /runs */
  list: () => call<Run[]>('/runs', () => db.runs()),

  /** GET /runs/{id} */
  get: (id: string) => call<Run | undefined>(`/runs/${id}`, () => db.run(id)),

  forScenario: (scenarioId: string) =>
    call<Run[]>(`/runs?scenario_id=${scenarioId}`, () => db.runsForScenario(scenarioId)),

  latestForScenario: (scenarioId: string) =>
    call<Run | undefined>(`/runs?scenario_id=${scenarioId}&limit=1`, () =>
      db.latestRunForScenario(scenarioId),
    ),

  /** POST /runs/{id}/commands/cancel */
  cancel: (id: string) =>
    call<Run>(`/runs/${id}/commands/cancel`, () => db.cancelRun(id), { method: 'POST' }),

  /** GET /runs/{id}/results */
  results: (runId: string) =>
    call<AnalyticalResult[]>(`/runs/${runId}/results`, () => db.results(runId)),
};
