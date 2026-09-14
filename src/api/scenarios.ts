import type { ModuleId, Run, RuleCheck, Scenario } from '@/types/domain';
import { db } from '@/mocks/db';
import { call } from './client';

export const scenariosApi = {
  /** GET /scenarios */
  list: (studyId?: string) =>
    call<Scenario[]>('/scenarios', () =>
      studyId ? db.scenarios().filter((s) => s.studyId === studyId) : db.scenarios(),
    ),

  /** GET /scenarios/{id} */
  get: (id: string) => call<Scenario | undefined>(`/scenarios/${id}`, () => db.scenario(id)),

  /** POST /scenarios */
  create: (input: Parameters<typeof db.createScenario>[0]) =>
    call<Scenario>('/scenarios', () => db.createScenario(input), { method: 'POST', body: input }),

  /** POST /scenario-versions/{id}/commands/freeze */
  freeze: (scenarioId: string, actor: string) =>
    call<Scenario>(`/scenarios/${scenarioId}/commands/freeze`, () =>
      db.freezeScenarioVersion(scenarioId, actor),
    ),

  /** GET /scenario-versions/{id}/rule-checks */
  ruleChecks: (scenarioId: string) =>
    call<RuleCheck[]>(`/scenarios/${scenarioId}/rule-checks`, () => db.ruleChecks(scenarioId)),

  /** POST /scenario-versions/{id}/runs */
  execute: (scenarioId: string, modules: ModuleId[], actor: string) =>
    call<Run>(`/scenario-versions/${scenarioId}/runs`, () =>
      db.createRun({ scenarioId, modules, actor }),
      { method: 'POST', body: { module_ids: modules } },
    ),
};
