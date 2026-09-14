import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Route,
  ClipboardCheck,
  Database,
  FileBarChart,
  FolderKanban,
  Gauge,
  Layers,
  Map,
  Scale,
  Settings,
  Shapes,
  SplitSquareHorizontal,
} from 'lucide-react';
import type { PermissionKey } from '@/utils/permissions';

export interface NavChild {
  label: string;
  to: string;
  /** hidden entirely when the role cannot even see the area */
  requires?: PermissionKey;
}

export type NavSection = 'workspace' | 'data' | 'analysis' | 'governance' | 'system';

export const navSectionLabels: Record<NavSection, string> = {
  workspace: 'فضای کاری',
  data: 'داده و مکان',
  analysis: 'تحلیل',
  governance: 'حاکمیت و خروجی',
  system: 'سامانه',
};

export interface NavGroup {
  key: string;
  section: NavSection;
  label: string;
  description?: string;
  icon: LucideIcon;
  to?: string;
  children?: NavChild[];
  requires?: PermissionKey;
}

export const navigation: NavGroup[] = [
  {
    key: 'home',
    section: 'workspace',
    label: 'خانه',
    description: 'داشبورد اصلی و وضعیت فعالیت‌ها',
    icon: Gauge,
    to: '/dashboard',
  },
  {
    key: 'journey',
    section: 'workspace',
    label: 'مسیر پیشنهادی',
    description: 'مسیر گام‌به‌گام از پرسش تا تصمیم',
    icon: Route,
    to: '/journey',
  },
  {
    key: 'studies',
    section: 'workspace',
    label: 'مطالعات',
    icon: FolderKanban,
    to: '/studies',
    children: [
      { label: 'همه مطالعات', to: '/studies' },
      { label: 'مطالعات جامع', to: '/studies?type=comprehensive' },
      { label: 'مطالعات تفصیلی', to: '/studies?type=detailed' },
      { label: 'مطالعات موضعی', to: '/studies?type=local_area' },
      { label: 'مطالعات موضوعی', to: '/studies?type=thematic' },
      { label: 'ایجاد مطالعه جدید', to: '/studies/new', requires: 'study.create' },
    ],
  },
  {
    key: 'regions',
    section: 'workspace',
    label: 'مناطق',
    icon: Shapes,
    to: '/regions',
    children: [
      { label: 'مناطق شهری', to: '/regions' },
      { label: 'پکیج منطقه', to: '/regions?view=pack' },
      { label: 'وضعیت آمادگی منطقه', to: '/regions?view=readiness' },
    ],
  },
  {
    key: 'data',
    section: 'data',
    label: 'داده‌ها',
    icon: Database,
    to: '/datasets',
    children: [
      { label: 'کاتالوگ داده', to: '/datasets' },
      { label: 'ورود داده', to: '/datasets/ingest', requires: 'dataset.upload' },
      { label: 'اتصال‌دهنده‌ها', to: '/datasets/connectors' },
      { label: 'کنترل کیفیت', to: '/datasets/quality' },
      { label: 'قرنطینه داده', to: '/datasets/quarantine', requires: 'dataset.quarantine.view' },
      { label: 'مقایسه نسخه‌ها', to: '/datasets/compare' },
    ],
  },
  {
    key: 'gis',
    section: 'data',
    label: 'GIS و نقشه',
    icon: Map,
    to: '/gis',
    children: [
      { label: 'نقشه شهری', to: '/gis' },
      { label: 'مقایسه وضع موجود و پیشنهادی', to: '/gis/compare' },
    ],
  },
  {
    key: 'rules',
    section: 'data',
    label: 'قوانین',
    icon: Scale,
    to: '/rules',
    children: [
      { label: 'مخزن قوانین', to: '/rules' },
      { label: 'قوانین در انتظار بررسی', to: '/rules?status=in_review' },
      { label: 'تعارض قوانین', to: '/rules?status=conflicted' },
    ],
  },
  {
    key: 'scenarios',
    section: 'analysis',
    label: 'سناریوها',
    icon: SplitSquareHorizontal,
    to: '/scenarios',
    children: [
      { label: 'همه سناریوها', to: '/scenarios' },
      { label: 'ایجاد سناریو', to: '/scenarios/new', requires: 'scenario.create' },
      { label: 'مقایسه سناریوها', to: '/scenarios/compare' },
    ],
  },
  {
    key: 'analysis',
    section: 'analysis',
    label: 'تحلیل‌ها',
    icon: Layers,
    to: '/analysis',
    children: [{ label: 'مرکز تحلیل (۱۲ ماژول)', to: '/analysis' }],
  },
  {
    key: 'models',
    section: 'analysis',
    label: 'مدل‌های تخصصی',
    icon: Bot,
    to: '/models',
  },
  {
    key: 'evidence',
    section: 'governance',
    label: 'شواهد و مستندات',
    icon: FileBarChart,
    to: '/evidence',
    children: [
      { label: 'شواهد', to: '/evidence' },
      { label: 'گزارش‌ها', to: '/reports' },
      { label: 'بسته‌های تصمیم', to: '/decision-packages' },
    ],
  },
  {
    key: 'reviews',
    section: 'governance',
    label: 'بررسی و تأیید',
    icon: ClipboardCheck,
    to: '/reviews',
    children: [
      { label: 'موارد در انتظار بررسی', to: '/reviews' },
      { label: 'موارد در انتظار تأیید', to: '/approvals' },
      { label: 'تصمیم‌های منتشرشده', to: '/decision-packages?state=published' },
    ],
  },
  {
    key: 'copilot',
    section: 'system',
    label: 'دستیار هوشمند',
    icon: Bot,
    to: '/copilot',
  },
  {
    key: 'settings',
    section: 'system',
    label: 'مدیریت سامانه',
    icon: Settings,
    to: '/settings',
    requires: 'admin.access',
  },
];
