/**
 * Frontend permission model.
 *
 * IMPORTANT: this only shapes the UI. Real authorization is enforced by the
 * backend (PRD E01 / FSD C07). Nothing here may be treated as a security
 * control. Where an action is not permitted the UI shows it disabled with an
 * explanation rather than silently hiding every capability.
 */
import type { RoleCode } from '@/types/domain';

export type PermissionKey =
  | 'study.create'
  | 'study.edit'
  | 'study.submit'
  | 'study.archive'
  | 'scenario.create'
  | 'scenario.edit'
  | 'scenario.freeze'
  | 'run.execute'
  | 'run.cancel'
  | 'dataset.upload'
  | 'dataset.publish'
  | 'dataset.quarantine.view'
  | 'rule.author'
  | 'rule.publish'
  | 'model.register'
  | 'model.validate'
  | 'evidence.link'
  | 'report.draft'
  | 'report.export'
  | 'review.comment'
  | 'review.decide'
  | 'approval.decide'
  | 'decision.publish'
  | 'admin.access'
  | 'audit.view'
  | 'copilot.use';

const MATRIX: Record<PermissionKey, RoleCode[]> = {
  'study.create': ['SECRETARIAT', 'MUNICIPAL_EXPERT'],
  'study.edit': ['SECRETARIAT', 'MUNICIPAL_EXPERT', 'REGIONAL_USER', 'CONSULTANT'],
  'study.submit': ['MUNICIPAL_EXPERT', 'REGIONAL_USER', 'SECRETARIAT'],
  'study.archive': ['SECRETARIAT', 'MUNICIPAL_EXPERT'],
  'scenario.create': ['MUNICIPAL_EXPERT', 'REGIONAL_USER', 'CONSULTANT'],
  'scenario.edit': ['MUNICIPAL_EXPERT', 'REGIONAL_USER', 'CONSULTANT'],
  'scenario.freeze': ['MUNICIPAL_EXPERT', 'REGIONAL_USER'],
  'run.execute': ['MUNICIPAL_EXPERT', 'REGIONAL_USER', 'CONSULTANT', 'MODEL_SPECIALIST'],
  'run.cancel': ['MUNICIPAL_EXPERT', 'REGIONAL_USER', 'MODEL_SPECIALIST', 'SYSTEM_ADMIN'],
  'dataset.upload': ['REGIONAL_USER', 'MUNICIPAL_EXPERT', 'SECRETARIAT'],
  'dataset.publish': ['SECRETARIAT'],
  'dataset.quarantine.view': ['SECRETARIAT', 'MUNICIPAL_EXPERT', 'REGIONAL_USER'],
  'rule.author': ['SECRETARIAT', 'MUNICIPAL_EXPERT'],
  'rule.publish': ['SECRETARIAT', 'APPROVING_AUTHORITY'],
  'model.register': ['MODEL_SPECIALIST', 'SYSTEM_ADMIN'],
  'model.validate': ['MODEL_SPECIALIST'],
  'evidence.link': ['MUNICIPAL_EXPERT', 'REGIONAL_USER', 'CONSULTANT', 'SECRETARIAT'],
  'report.draft': ['MUNICIPAL_EXPERT', 'REGIONAL_USER', 'CONSULTANT'],
  'report.export': ['MUNICIPAL_EXPERT', 'SECRETARIAT', 'APPROVING_AUTHORITY', 'EXECUTIVE_OBSERVER'],
  'review.comment': ['REVIEWER', 'APPROVING_AUTHORITY', 'MUNICIPAL_EXPERT'],
  'review.decide': ['REVIEWER'],
  'approval.decide': ['APPROVING_AUTHORITY'],
  'decision.publish': ['APPROVING_AUTHORITY', 'SECRETARIAT'],
  'admin.access': ['SYSTEM_ADMIN', 'SECRETARIAT'],
  'audit.view': ['AUDITOR', 'SYSTEM_ADMIN', 'SECRETARIAT'],
  'copilot.use': [
    'SYSTEM_ADMIN', 'SECRETARIAT', 'MUNICIPAL_EXPERT', 'REGIONAL_USER',
    'CONSULTANT', 'MODEL_SPECIALIST', 'REVIEWER', 'APPROVING_AUTHORITY',
    'EXECUTIVE_OBSERVER',
  ],
};

/** Role-specific explanation shown next to a disabled control. */
const DENIAL_NOTES: Partial<Record<PermissionKey, string>> = {
  'review.decide': 'تصمیم بررسی تنها توسط بازبین منتصب ثبت می‌شود.',
  'approval.decide': 'تأیید نهایی تنها در اختیار مرجع تأیید تعیین‌شده است.',
  'dataset.publish': 'انتشار داده برای انتخاب در تحلیل، اختیار دبیرخانه است.',
  'rule.publish': 'انتشار قانون نیازمند تأیید مرجع مربوط است.',
  'run.execute': 'اجرای تحلیل نیازمند دسترسی کارشناسی در این مطالعه است.',
  'scenario.edit': 'ویرایش سناریو در نقش فعلی مجاز نیست.',
  'study.create': 'ایجاد مطالعه نیازمند مجوز دبیرخانه یا کارشناس شهرداری است.',
  'admin.access': 'بخش مدیریت سامانه تنها برای مدیران مجاز در دسترس است.',
};

export const DEFAULT_DENIAL = 'شما مجوز انجام این عملیات را ندارید.';

export function hasPermission(roles: RoleCode[], key: PermissionKey): boolean {
  const allowed = MATRIX[key] ?? [];
  return roles.some((r) => allowed.includes(r));
}

export function denialReason(roles: RoleCode[], key: PermissionKey): string | null {
  if (hasPermission(roles, key)) return null;
  if (roles.includes('AUDITOR')) {
    return 'دسترسی حسابرس فقط‌خواندنی است و امکان تغییر وجود ندارد.';
  }
  if (roles.includes('EXECUTIVE_OBSERVER')) {
    return 'ناظر مدیریتی تنها به خروجی‌های تأییدشده دسترسی مشاهده دارد.';
  }
  return DENIAL_NOTES[key] ?? DEFAULT_DENIAL;
}

/** Separation of duties: an author cannot approve their own submission. */
export function violatesSeparationOfDuties(
  actorName: string,
  submittedBy: string,
): boolean {
  return actorName.trim() === submittedBy.trim();
}
