import type {
  AppNotification,
  AuditEntry,
  DecisionPackage,
  ReportVersion,
  ReviewBundle,
} from '@/types/domain';
import { db } from '@/mocks/db';
import { call } from './client';

export const reviewsApi = {
  /** GET /reviews */
  list: () => call<ReviewBundle[]>('/reviews', () => db.reviews()),
  get: (id: string) => call<ReviewBundle | undefined>(`/reviews/${id}`, () => db.review(id)),
  /** POST /reviews/{id}/commands/decide */
  decide: (id: string, decision: 'approve' | 'reject' | 'request_changes', reason: string, actor: string) =>
    call<ReviewBundle>(`/reviews/${id}/commands/decide`, () => db.decideReview(id, decision, reason, actor), {
      method: 'POST',
      body: { decision, reason },
    }),
  comment: (id: string, text: string, anchor: string, author: string) =>
    call<ReviewBundle>(`/reviews/${id}/comments`, () => db.addReviewComment(id, text, anchor, author), {
      method: 'POST',
      body: { text, anchor },
    }),
};

export const reportsApi = {
  /** GET /reports */
  list: () => call<ReportVersion[]>('/reports', () => db.reports()),
  get: (id: string) => call<ReportVersion | undefined>(`/reports/${id}`, () => db.report(id)),
  create: (input: Parameters<typeof db.createReport>[0]) =>
    call<ReportVersion>('/reports', () => db.createReport(input), { method: 'POST', body: input }),
};

export const decisionsApi = {
  /** GET /decision-packages */
  list: () => call<DecisionPackage[]>('/decision-packages', () => db.decisions()),
  get: (id: string) => call<DecisionPackage | undefined>(`/decision-packages/${id}`, () => db.decision(id)),
  create: (input: Parameters<typeof db.createDecisionPackage>[0]) =>
    call<DecisionPackage>('/decision-packages', () => db.createDecisionPackage(input), {
      method: 'POST',
      body: input,
    }),
  submit: (id: string, actor: string) =>
    call<DecisionPackage>(`/decision-packages/${id}/commands/submit`, () =>
      db.submitDecisionPackage(id, actor),
      { method: 'POST' },
    ),
};

export const notificationsApi = {
  list: () => call<AppNotification[]>('/notifications', () => db.notifications()),
  markRead: (id: string) =>
    call<AppNotification[]>(`/notifications/${id}/commands/read`, () => db.markNotificationRead(id), {
      method: 'POST',
    }),
  markAllRead: () =>
    call<AppNotification[]>('/notifications/commands/read-all', () => db.markAllNotificationsRead(), {
      method: 'POST',
    }),
};

export const auditApi = {
  list: () => call<AuditEntry[]>('/audit-entries', () => db.audit()),
};
