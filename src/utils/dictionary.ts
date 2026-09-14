/**
 * Single source of Persian user-facing labels.
 * Internal identifiers stay English (FSD/PRD), the UI never shows them raw.
 * A future English locale plugs in here without touching components.
 */
import type {
  Availability,
  ApprovalState,
  ChapterStatus,
  Classification,
  DatasetVersionStatus,
  EvidenceType,
  MethodClass,
  MethodSubtype,
  MissingReason,
  ModelStatus,
  ModuleId,
  NotificationKind,
  ReportState,
  RoleCode,
  RuleOutcome,
  RuleStatus,
  RunStage,
  RunState,
  ScenarioVersionState,
  InterpretationLabel,
  StudyStatus,
  StudyType,
  UncertaintyStatus,
} from '@/types/domain';

export const roleLabels: Record<RoleCode, string> = {
  SYSTEM_ADMIN: 'مدیر سامانه',
  SECRETARIAT: 'دبیرخانه',
  MUNICIPAL_EXPERT: 'کارشناس شهرداری',
  REGIONAL_USER: 'کاربر منطقه‌ای',
  CONSULTANT: 'مشاور',
  MODEL_SPECIALIST: 'متخصص مدل',
  REVIEWER: 'بازبین',
  APPROVING_AUTHORITY: 'مرجع تأیید',
  AUDITOR: 'حسابرس',
  EXECUTIVE_OBSERVER: 'ناظر مدیریتی',
};

export const roleScopeNotes: Record<RoleCode, string> = {
  SYSTEM_ADMIN: 'مدیریت حساب‌ها و تنظیمات سامانه؛ مدیریت سامانه به‌خودی‌خود اختیار تأیید علمی ایجاد نمی‌کند.',
  SECRETARIAT: 'راهبری کاتالوگ، قالب‌ها و هماهنگی انتشار؛ جایگزینی خاموش نسخه‌های تأییدشده مجاز نیست.',
  MUNICIPAL_EXPERT: 'تحلیل و معنابخشی داده در دامنه جغرافیایی تعیین‌شده؛ اختیار تأیید جداگانه تفویض می‌شود.',
  REGIONAL_USER: 'راهبری داده و مطالعات منطقه‌ای در محدوده تخصیص‌یافته.',
  CONSULTANT: 'دسترسی مبتنی بر تخصیص و دارای انقضا؛ فضای کاری سایر مشاوران در دسترس نیست.',
  MODEL_SPECIALIST: 'قرارداد مدل، شواهد کالیبراسیون و مستندات روش؛ تأیید علمی نیازمند انتصاب جداگانه است.',
  REVIEWER: 'بررسی موارد ارجاع‌شده و ثبت نظر؛ ویرایش نسخه ارسال‌شده امکان‌پذیر نیست.',
  APPROVING_AUTHORITY: 'تأیید یا رد در دامنه سازمانی تفویض‌شده؛ تفکیک نویسنده و تأییدکننده اعمال می‌شود.',
  AUDITOR: 'دسترسی فقط‌خواندنی به سوابق حسابرسی و منشأ.',
  EXECUTIVE_OBSERVER: 'مشاهده خلاصه‌ها، مقایسه‌ها و گزارش‌های تأییدشده؛ بدون ویرایش سناریو یا قانون.',
};

export const studyTypeLabels: Record<StudyType, string> = {
  comprehensive: 'مطالعه جامع',
  detailed: 'مطالعه تفصیلی',
  local_area: 'مطالعه موضعی',
  thematic: 'مطالعه موضوعی',
};

export const studyStatusLabels: Record<StudyStatus, string> = {
  draft: 'پیش‌نویس',
  active: 'فعال',
  in_review: 'در حال بررسی',
  changes_requested: 'نیازمند اصلاح',
  approved: 'تأیید شده',
  archived: 'بایگانی‌شده',
};

export const chapterStatusLabels: Record<ChapterStatus, string> = {
  complete: 'تکمیل شده',
  incomplete: 'ناقص',
  needs_data: 'نیازمند داده',
  needs_review: 'نیازمند بررسی',
  approved: 'تأیید شده',
  external_supplied: 'ارائه‌شده توسط منبع خارجی',
  not_started: 'آغاز نشده',
};

export const datasetStatusLabels: Record<DatasetVersionStatus, string> = {
  draft: 'پیش‌نویس',
  validating: 'در حال اعتبارسنجی',
  quarantined: 'قرنطینه‌شده',
  ready: 'آماده (ورود موفق)',
  published: 'منتشرشده (قابل انتخاب برای تحلیل)',
  superseded: 'جایگزین‌شده',
  withdrawn: 'ابطال‌شده',
};

export const datasetStatusShort: Record<DatasetVersionStatus, string> = {
  draft: 'پیش‌نویس',
  validating: 'اعتبارسنجی',
  quarantined: 'قرنطینه',
  ready: 'آماده',
  published: 'منتشرشده',
  superseded: 'جایگزین‌شده',
  withdrawn: 'ابطال‌شده',
};

export const ruleStatusLabels: Record<RuleStatus, string> = {
  draft: 'پیش‌نویس',
  in_review: 'در حال بررسی',
  approved: 'تأیید شده',
  published: 'منتشر شده',
  retired: 'منسوخ',
  conflicted: 'دارای تعارض',
};

export const ruleOutcomeLabels: Record<RuleOutcome, string> = {
  pass: 'منطبق',
  fail: 'مغایر',
  unknown: 'نامشخص',
  not_applicable: 'مصداق ندارد',
};

export const runStateLabels: Record<RunState, string> = {
  queued: 'در صف',
  running: 'در حال اجرا',
  cancelling: 'در حال لغو',
  succeeded: 'تکمیل شد',
  partial: 'تکمیل جزئی',
  failed: 'اجرا ناموفق بود',
  cancelled: 'لغو شد',
  timed_out: 'مهلت اجرا به پایان رسید',
};

export const runStageLabels: Record<RunStage, string> = {
  queued: 'در صف',
  preparing: 'در حال آماده‌سازی',
  executing: 'در حال اجرا',
  validating: 'در حال اعتبارسنجی',
  completed: 'تکمیل شد',
};

export const availabilityLabels: Record<Availability, string> = {
  computed: 'محاسبه قطعی',
  proxy: 'برآورد جانشین (Proxy)',
  not_available: 'نتیجه در دسترس نیست',
  not_applicable: 'مصداق ندارد',
  suppressed: 'به دلیل محدودیت دسترسی نمایش داده نمی‌شود',
};

export const methodClassLabels: Record<MethodClass, string> = {
  deterministic: 'محاسبه قطعی',
  model_based: 'مبتنی بر مدل',
  expert_judgment: 'قضاوت کارشناسی',
};

export const methodSubtypeLabels: Record<MethodSubtype, string> = {
  deterministic_calculation: 'محاسبه حسابی/هندسی تعریف‌شده',
  rule_evaluation: 'ارزیابی قانون',
  statistical_estimate: 'برآورد آماری',
  specialist_model: 'خروجی مدل تخصصی',
  proxy_estimate: 'برآورد جانشین',
  expert_judgment: 'قضاوت کارشناسی',
  external_supplied: 'ارائه‌شده توسط منبع خارجی',
};

export const missingReasonLabels: Record<MissingReason, string> = {
  MISSING_REQUIRED_INPUT: 'داده ورودی ضروری در دسترس نیست',
  OUTSIDE_MODEL_DOMAIN: 'خارج از دامنه اعتبار مدل',
  RULE_CONFLICT: 'تعارض قوانین حل‌نشده',
  UNAPPROVED_METHOD: 'روش تأییدنشده',
  DEPENDENCY_FAILED: 'وابستگی موردنیاز اجرا نشد',
  NOT_SUPPORTED: 'در این نسخه پشتیبانی نمی‌شود',
  MODEL_UNAVAILABLE: 'مدل تخصصی در دسترس نیست',
  ACCESS_RESTRICTED: 'دسترسی شما به این نتیجه محدود شده است',
};

export const uncertaintyLabels: Record<UncertaintyStatus, string> = {
  quantified: 'عدم قطعیت کمی‌شده',
  qualitative: 'عدم قطعیت کیفی',
  not_quantified: 'عدم قطعیت کمی‌نشده',
};

export const modelStatusLabels: Record<ModelStatus, string> = {
  available: 'در دسترس',
  running: 'در حال اجرا',
  unvalidated: 'تأیید نشده',
  expired: 'منقضی',
  unavailable: 'در دسترس نیست',
  error: 'خطا',
};

export const scenarioStateLabels: Record<ScenarioVersionState, string> = {
  draft: 'پیش‌نویس',
  validated: 'اعتبارسنجی‌شده',
  frozen: 'قفل‌شده',
  superseded: 'جایگزین‌شده',
};

export const interpretationLabels: Record<InterpretationLabel, string> = {
  observed_existing: 'وضع موجود مشاهده‌شده',
  proposed_unverified: 'پیشنهادی — بررسی‌نشده',
  proposed_compliant: 'پیشنهادی — منطبق',
  hypothetical_override: 'فرضی با نادیده‌گرفتن محدودیت',
};

export const approvalStateLabels: Record<ApprovalState, string> = {
  pending: 'در انتظار تصمیم',
  approved: 'تأیید شده',
  rejected: 'رد شده',
  changes_requested: 'درخواست اصلاح',
  withdrawn: 'بازپس‌گرفته شده',
};

export const reportStateLabels: Record<ReportState, string> = {
  draft: 'پیش‌نویس',
  generating: 'در حال تولید',
  ready_for_review: 'آماده بررسی',
  approved: 'تأیید شده',
  published: 'منتشر شده',
  retired: 'منسوخ',
};

export const evidenceTypeLabels: Record<EvidenceType, string> = {
  document: 'سند',
  dataset_version: 'نسخه داده',
  rule_version: 'نسخه قانون',
  model_report: 'گزارش مدل',
  map_artifact: 'خروجی نقشه',
  external_study: 'مطالعه خارجی',
  expert_note: 'یادداشت کارشناسی',
};

export const classificationLabels: Record<Classification, string> = {
  unrestricted_internal: 'داخلی بدون محدودیت',
  restricted_municipal: 'محدود — شهرداری',
  confidential: 'محرمانه',
  highly_restricted: 'به‌شدت محدود',
};

export const notificationLabels: Record<NotificationKind, string> = {
  run_completed: 'تحلیل تکمیل شد',
  data_needs_review: 'داده نیازمند بررسی است',
  data_quarantined: 'داده قرنطینه شد',
  scenario_ready: 'سناریو آماده است',
  report_ready: 'گزارش آماده است',
  changes_requested: 'درخواست اصلاح دریافت شد',
  approval_pending: 'موردی برای تأیید وجود دارد',
  model_unavailable: 'مدل در دسترس نیست',
  grant_expiring: 'دسترسی شما در حال انقضا است',
};

export const moduleTitles: Record<ModuleId, string> = {
  M01: 'مقایسه قوانین و وضعیت',
  M02: 'ظرفیت ساخت',
  M03: 'ظرفیت جمعیت',
  M04: 'تولید سفر',
  M05: 'تقاضای پارکینگ',
  M06: 'تقاضای خدمات',
  M07: 'دسترسی و پوشش',
  M08: 'تقاضای زیرساخت',
  M09: 'سایه و تابش',
  M10: 'انرژی و محیط‌زیست',
  M11: 'مقایسه شاخص‌ها',
  M12: 'اثر یکپارچه و گزارش',
};

export const reviewDimensionLabels: Record<string, string> = {
  arithmetic_data_quality: 'صحت حسابی و کیفیت داده',
  scientific_fitness: 'تناسب علمی روش',
  rule_interpretation: 'تفسیر قوانین',
  decision_endorsement: 'تأیید تصمیم سازمانی',
};

export const qualityLabels: Record<string, string> = {
  high: 'کیفیت مناسب',
  medium: 'کیفیت متوسط',
  low: 'کیفیت پایین',
  unknown: 'کیفیت ارزیابی‌نشده',
};

export const findingCategoryLabels: Record<string, string> = {
  missing_fields: 'فیلدهای خالی',
  invalid_geometry: 'هندسه نامعتبر',
  duplicates: 'رکوردهای تکراری',
  referential_integrity: 'یکپارچگی ارجاعی',
  out_of_range: 'مقادیر خارج از بازه',
  coverage: 'نقص پوشش',
  semantic: 'ابهام معنایی',
};
