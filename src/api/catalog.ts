import type { Dataset, Evidence, Region, SpecialistModel, UrbanRule } from '@/types/domain';
import { db } from '@/mocks/db';
import { call } from './client';

export const regionsApi = {
  /** GET /regions */
  list: () => call<Region[]>('/regions', () => db.regions()),
  get: (id: string) => call<Region | undefined>(`/regions/${id}`, () => db.regions().find((r) => r.id === id)),
};

export const datasetsApi = {
  /** GET /datasets */
  list: () => call<Dataset[]>('/datasets', () => db.datasets()),
  get: (id: string) => call<Dataset | undefined>(`/datasets/${id}`, () => db.dataset(id)),
  /** POST /dataset-versions/{id}/commands/publish */
  publish: (datasetId: string, versionId: string, actor: string) =>
    call<Dataset>(`/dataset-versions/${versionId}/commands/publish`, () =>
      db.publishDatasetVersion(datasetId, versionId, actor),
      { method: 'POST' },
    ),
};

export const rulesApi = {
  /** GET /rules */
  list: () => call<UrbanRule[]>('/rules', () => db.rules()),
  get: (id: string) => call<UrbanRule | undefined>(`/rules/${id}`, () => db.rule(id)),
};

export const modelsApi = {
  /** GET /models */
  list: () => call<SpecialistModel[]>('/models', () => db.models()),
  get: (id: string) => call<SpecialistModel | undefined>(`/models/${id}`, () => db.model(id)),
};

export const evidenceApi = {
  /** GET /evidence */
  list: () => call<Evidence[]>('/evidence', () => db.evidence()),
};
