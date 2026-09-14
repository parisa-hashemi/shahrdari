import type { AnalyticalModule, ModuleId } from '@/types/domain';
import { call } from './client';

/** The twelve baseline modules — PD-07 / FSD-B03..B14. Exactly twelve. */
export const MODULES: AnalyticalModule[] = [
  {
    id: 'M01',
    title: 'مقایسه قوانین و وضعیت',
    purpose: 'تعیین کنترل‌های قابل اعمال، مغایرت‌های مشاهده‌شده و تخلفات سناریو',
    dependsOn: [],
    requiresModel: false,
    availableInDemo: true,
  },
  {
    id: 'M02',
    title: 'ظرفیت ساخت',
    purpose: 'کمی‌سازی سطح اشغال، طبقات، زیربنا و ظرفیت توسعه',
    dependsOn: ['M01'],
    requiresModel: false,
    availableInDemo: true,
  },
  {
    id: 'M03',
    title: 'ظرفیت جمعیت',
    purpose: 'برآورد ظرفیت واحد، خانوار و جمعیت با فرض‌های صریح',
    dependsOn: ['M02'],
    requiresModel: false,
    availableInDemo: true,
  },
  {
    id: 'M04',
    title: 'تولید سفر',
    purpose: 'برآورد سرانجام سفر و اتصال به ارزیابی تخصصی حمل‌ونقل در صورت وجود',
    dependsOn: ['M02', 'M03'],
    requiresModel: true,
    availableInDemo: true,
  },
  {
    id: 'M05',
    title: 'تقاضای پارکینگ',
    purpose: 'مقایسه الزام تعریف‌شده با عرضه مستند یا پیشنهادی',
    dependsOn: ['M02', 'M03'],
    requiresModel: false,
    availableInDemo: true,
  },
  {
    id: 'M06',
    title: 'تقاضای خدمات',
    purpose: 'محاسبه نیاز خدمات آموزشی، درمانی و فضای سبز بر مبنای جمعیت',
    dependsOn: ['M03'],
    requiresModel: false,
    availableInDemo: true,
  },
  {
    id: 'M07',
    title: 'دسترسی و پوشش',
    purpose: 'ارزیابی حوزه دسترسی شبکه‌محور، دسترس‌پذیری و پهنه‌های کم‌برخوردار',
    dependsOn: ['M06'],
    requiresModel: true,
    availableInDemo: false,
    unavailableReason: 'MISSING_REQUIRED_INPUT',
  },
  {
    id: 'M08',
    title: 'تقاضای زیرساخت',
    purpose: 'برآورد تقاضای آب، فاضلاب، برق و گاز با روش‌های تأییدشده',
    dependsOn: ['M02', 'M03'],
    requiresModel: false,
    availableInDemo: true,
  },
  {
    id: 'M09',
    title: 'سایه و تابش',
    purpose: 'ارزیابی اثرهای سه‌بعدی سایه و تابش در محدوده اعتبار مدل',
    dependsOn: ['M02'],
    requiresModel: true,
    availableInDemo: false,
    unavailableReason: 'MISSING_REQUIRED_INPUT',
  },
  {
    id: 'M10',
    title: 'انرژی و محیط‌زیست',
    purpose: 'ارائه برآوردهای محیطی با مرز حسابرسی صریح',
    dependsOn: ['M02', 'M08'],
    requiresModel: true,
    availableInDemo: true,
  },
  {
    id: 'M11',
    title: 'مقایسه شاخص‌ها',
    purpose: 'هم‌تراز کردن شاخص‌های قابل مقایسه و نمایش تغییرها و بده‌بستان‌ها',
    dependsOn: ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M08', 'M10'],
    requiresModel: false,
    availableInDemo: true,
  },
  {
    id: 'M12',
    title: 'اثر یکپارچه و گزارش',
    purpose: 'گردآوری خروجی‌ها، شواهد، خلأها و بسته تصمیم',
    dependsOn: ['M11'],
    requiresModel: false,
    availableInDemo: true,
  },
];

export const modulesApi = {
  list: () => call<AnalyticalModule[]>('/modules', () => MODULES),
  get: (id: ModuleId) =>
    call<AnalyticalModule | undefined>(`/modules/${id}`, () => MODULES.find((m) => m.id === id)),
};
