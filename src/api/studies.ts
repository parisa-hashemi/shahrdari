import type { Study } from '@/types/domain';
import { db } from '@/mocks/db';
import { call } from './client';

export interface StudyFilters {
  search?: string;
  status?: Study['status'] | 'all';
  studyType?: Study['studyType'] | 'all';
  regionId?: string | 'all';
}

function applyFilters(list: Study[], filters: StudyFilters): Study[] {
  return list.filter((s) => {
    if (filters.search) {
      const q = filters.search.trim();
      if (q && !`${s.title} ${s.code} ${s.ownerName}`.includes(q)) return false;
    }
    if (filters.status && filters.status !== 'all' && s.status !== filters.status) return false;
    if (filters.studyType && filters.studyType !== 'all' && s.studyType !== filters.studyType) return false;
    if (filters.regionId && filters.regionId !== 'all' && s.regionId !== filters.regionId) return false;
    return true;
  });
}

export const studiesApi = {
  /** GET /studies */
  list: (filters: StudyFilters = {}) =>
    call<Study[]>('/studies', () => applyFilters(db.studies(), filters)),

  /** GET /studies/{id} */
  get: (id: string) =>
    call<Study | undefined>(`/studies/${id}`, () => db.study(id)),

  /** POST /studies */
  create: (input: Parameters<typeof db.createStudy>[0]) =>
    call<Study>('/studies', () => db.createStudy(input), { method: 'POST', body: input }),

  /** POST /studies/{id}/commands/{verb} */
  transition: (id: string, to: Study['status'], actor: string, reason?: string) =>
    call<Study>(`/studies/${id}/commands/transition`, () => db.transitionStudy(id, to, actor, reason), {
      method: 'POST',
      body: { to, reason },
    }),
};
