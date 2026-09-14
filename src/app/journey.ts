import type { PermissionKey } from '@/utils/permissions';

/**
 * The guided path ("مسیر پیشنهادی").
 *
 * One ordered walk through the product that shows how a question becomes a
 * defensible decision. Every screen in the app knows where it sits on this
 * path, so a first-time user is never left wondering what comes next.
 */
export interface JourneyStep {
  key: string;
  /** 1-based number shown to the user */
  index: number;
  title: string;
  /** what the user does here, in one sentence */
  task: string;
  /** why this step exists — the product argument */
  why: string;
  to: string;
  /** routes that count as "being on" this step */
  matches: string[];
  /** what to click to move on */
  cta: string;
  requires?: PermissionKey;
  /** the persona that makes this step make sense */
  personaHint: string;
}

export const journey: JourneyStep[] = [
  {
    key: 'dashboard',
    index: 1,
    title: 'شروع از کارهای من',
    task: 'وضعیت مطالعات، موارد در انتظار بررسی و خلأهای مسدودکننده را ببینید.',
    why: 'کار از یک صف روشن شروع می‌شود، نه از یک منوی خالی.',
    to: '/dashboard',
    matches: ['/dashboard'],
    cta: 'رفتن به مطالعه فعال',
    personaHint: 'کارشناس شهرداری',
  },
  {
    key: 'study',
    index: 2,
    title: 'ورود به مطالعه',
    task: 'کارگاه مطالعه «طرح تفصیلی محور شمالی — منطقه ۶» را باز کنید و فصل ۰ را ببینید.',
    why: 'هر تحلیل در بستر یک مطالعه با دامنه، قالب و مرز مشخص انجام می‌شود.',
    to: '/studies/std-1001',
    matches: ['/studies'],
    cta: 'بررسی داده‌های پشتیبان',
    personaHint: 'کارشناس شهرداری',
  },
  {
    key: 'data',
    index: 3,
    title: 'بررسی آمادگی داده',
    task: 'کاتالوگ داده را ببینید؛ نسخه قرنطینه‌شده و نسخه منتشرنشده را پیدا کنید.',
    why: 'پیش از هر عدد، باید بدانید کدام داده مجاز به ورود به محاسبه است.',
    to: '/datasets',
    matches: ['/datasets'],
    cta: 'دیدن محدوده روی نقشه',
    personaHint: 'دبیرخانه یا کارشناس',
  },
  {
    key: 'gis',
    index: 4,
    title: 'انتخاب محدوده روی نقشه',
    task: 'قطعه P-1042 را انتخاب کنید و ویژگی‌ها، منبع و نسخه داده آن را ببینید.',
    why: 'محدوده مطالعه باید مکان‌دار باشد و هر ویژگی، منبع و کیفیت خودش را حمل کند.',
    to: '/gis',
    matches: ['/gis'],
    cta: 'بررسی قوانین حاکم',
    personaHint: 'کارشناس شهرداری',
  },
  {
    key: 'rules',
    index: 5,
    title: 'مرور قوانین حاکم',
    task: 'مخزن قوانین را ببینید و دو قانون دارای تعارض حل‌نشده را باز کنید.',
    why: 'وقتی دو قانون در تعارض‌اند، سامانه یکی را انتخاب نمی‌کند؛ نتیجه «نامشخص» می‌شود.',
    to: '/rules',
    matches: ['/rules'],
    cta: 'ساخت سناریو',
    personaHint: 'کارشناس شهرداری',
  },
  {
    key: 'scenario',
    index: 6,
    title: 'ساخت سناریو و اجرای تحلیل',
    task: 'ویزارد شش‌مرحله‌ای را کامل کنید و در پایان تحلیل را اجرا کنید.',
    why: 'سناریو یک فرض نسخه‌دار است؛ با اجرا، داده و قوانین تثبیت می‌شوند تا نتیجه بازتولیدپذیر بماند.',
    to: '/scenarios/new',
    matches: ['/scenarios/new'],
    cta: 'دیدن نتایج اجرا',
    requires: 'scenario.create',
    personaHint: 'کارشناس شهرداری',
  },
  {
    key: 'results',
    index: 7,
    title: 'خواندن نتایج و منشأ آن‌ها',
    task: 'نتایج را ببینید، روی «منشأ و پشتوانه نتیجه» بزنید و زنجیره تولید عدد را دنبال کنید.',
    why: 'عددی که منشأش قابل ردیابی نباشد، در تصمیم شهری قابل دفاع نیست.',
    to: '/scenarios/scn-s1',
    matches: ['/scenarios/scn-'],
    cta: 'مقایسه با وضع موجود',
    personaHint: 'کارشناس شهرداری',
  },
  {
    key: 'compare',
    index: 8,
    title: 'مقایسه با وضع موجود',
    task: 'سناریو را با مبنا مقایسه کنید و ببینید کدام شاخص‌ها اصلاً قابل مقایسه نیستند.',
    why: 'مقایسه فقط روی شاخص‌های هم‌واحد و موجود در هر دو سو معنا دارد؛ جای خالی صفر نیست.',
    to: '/scenarios/compare',
    matches: ['/scenarios/compare'],
    cta: 'ساخت بسته تصمیم',
    personaHint: 'کارشناس شهرداری',
  },
  {
    key: 'decision',
    index: 9,
    title: 'ساخت بسته تصمیم',
    task: 'بسته تصمیم را باز کنید: تغییرهای کلیدی، محدودیت‌ها و تحلیل‌های تولیدنشده.',
    why: 'تصمیم‌گیر باید هم‌زمان بداند چه می‌داند و چه نمی‌داند.',
    to: '/decision-packages',
    matches: ['/decision-packages', '/reports'],
    cta: 'ارسال برای بررسی',
    personaHint: 'کارشناس شهرداری',
  },
  {
    key: 'review',
    index: 10,
    title: 'بررسی فنی',
    task: 'نقش را به «بازبین» تغییر دهید، بسته را باز کنید و تصمیم را با دلیل ثبت کنید.',
    why: 'بسته بررسی تغییرناپذیر است؛ آنچه بازبین دید، بعداً بازنویسی نمی‌شود.',
    to: '/reviews',
    matches: ['/reviews'],
    cta: 'رفتن به تأیید نهایی',
    personaHint: 'بازبین',
  },
  {
    key: 'approval',
    index: 11,
    title: 'تأیید نهایی',
    task: 'نقش را به «مرجع تأیید» تغییر دهید و دامنه تأیید را ببینید.',
    why: 'تأیید در سامانه رویداد گردش‌کار است، نه اعتبار قانونی. این تمایز صریح اعلام می‌شود.',
    to: '/approvals',
    matches: ['/approvals'],
    cta: 'پایان مسیر',
    personaHint: 'مرجع تأیید',
  },
];

export function stepForPath(pathname: string): JourneyStep | undefined {
  // longest match wins, so /scenarios/compare beats /scenarios/
  return [...journey]
    .sort((a, b) => Math.max(...b.matches.map((m) => m.length)) - Math.max(...a.matches.map((m) => m.length)))
    .find((step) => step.matches.some((match) => pathname.startsWith(match)));
}
