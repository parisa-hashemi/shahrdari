import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CloudUpload, FileSpreadsheet } from 'lucide-react';
import {
  Badge,
  Card,
  CardHeader,
  DefinitionList,
  Ltr,
  PageHeader,
  Stepper,
  StatusBadge,
} from '@/components/ui/display';
import { Button } from '@/components/ui/Button';
import { Field, Select, TextInput } from '@/components/ui/inputs';
import { Callout, Progress } from '@/components/ui/feedback';
import { PermissionDeniedState } from '@/components/ui/feedback';
import { usePermission, DemoBadge } from '@/components/workflow';
import { useUiStore } from '@/stores/uiStore';
import { formatNumber } from '@/utils/format';

const STEPS = [
  { key: 'source', label: 'انتخاب منبع' },
  { key: 'describe', label: 'شناسنامه' },
  { key: 'map', label: 'نگاشت فیلدها' },
  { key: 'validate', label: 'اعتبارسنجی' },
  { key: 'result', label: 'نتیجه' },
];

/** Deterministic mock validation, so the demo always tells the same story. */
const MOCK_FINDINGS = [
  {
    code: 'QC-GEO-002',
    title: 'هندسه نامعتبر در ۱۲ رکورد',
    severity: 'blocking' as const,
    detail: 'چندضلعی‌های خودتقاطع شناسایی شد. این رکوردها تا اصلاح، در تحلیل مکانی استفاده نمی‌شوند.',
    rows: 12,
  },
  {
    code: 'QC-REQ-004',
    title: 'فیلد الزامی «کد کاربری» خالی است',
    severity: 'warning' as const,
    detail: 'در ۴۸ رکورد مقدار خالی است. این رکوردها در تحلیل با وضعیت «تولید نشده» علامت می‌خورند.',
    rows: 48,
  },
  {
    code: 'QC-COV-001',
    title: 'پوشش مکانی کمتر از محدوده اعلام‌شده',
    severity: 'info' as const,
    detail: 'حدود ۹۴٪ از محدوده مطالعه پوشش داده شده است. پوشش در نتایج گزارش می‌شود.',
    rows: 0,
  },
];

export default function IngestPage() {
  const permission = usePermission('dataset.upload');
  const pushToast = useUiStore((s) => s.pushToast);
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('spatial');
  const [progress, setProgress] = useState(0);

  if (!permission.allowed) {
    return (
      <div>
        <PageHeader title="ورود داده" breadcrumb={[{ label: 'داده‌ها', to: '/datasets' }, { label: 'ورود داده' }]} />
        <PermissionDeniedState description={permission.reason ?? undefined} />
      </div>
    );
  }

  const runValidation = () => {
    setStep(3);
    setProgress(0);
    let value = 0;
    const timer = setInterval(() => {
      value += 20;
      setProgress(Math.min(100, value));
      if (value >= 100) {
        clearInterval(timer);
        setStep(4);
        pushToast({
          title: 'اعتبارسنجی پایان یافت',
          description: 'یک یافته مسدودکننده شناسایی شد؛ نسخه قرنطینه می‌شود.',
          variant: 'warning',
        });
      }
    }, 450);
  };

  return (
    <div>
      <PageHeader
        title="ورود داده جدید"
        description="داده واردشده ابتدا اعتبارسنجی می‌شود. تا پیش از انتشار توسط دبیرخانه، نسخه جدید در تحلیل قابل انتخاب نیست."
        breadcrumb={[
          { label: 'خانه', to: '/dashboard' },
          { label: 'داده‌ها', to: '/datasets' },
          { label: 'ورود داده' },
        ]}
        meta={<DemoBadge />}
      />

      <Card className="mb-4">
        <Stepper steps={STEPS} current={step} onSelect={(index) => index < step && setStep(index)} />
      </Card>

      {step === 0 && (
        <Card>
          <CardHeader title="منبع داده" subtitle="بارگذاری فایل یا انتخاب اتصال‌دهنده موجود" />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-2 px-4 py-8 text-center hover:border-primary-300">
              <CloudUpload size={22} className="text-muted" />
              <span className="text-[13px] font-medium">انتخاب فایل برای بارگذاری</span>
              <span className="text-xs text-muted">
                قالب‌های پذیرفته‌شده: GeoPackage، Shapefile فشرده، CSV و XLSX
              </span>
              <input
                type="file"
                className="sr-only"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')}
              />
              {fileName && (
                <Badge tone="primary" icon={<FileSpreadsheet size={11} />}>
                  <Ltr>{fileName}</Ltr>
                </Badge>
              )}
            </label>
            <div className="rounded-xl border border-border p-4">
              <p className="text-[13px] font-medium">اتصال‌دهنده سامانه‌ای</p>
              <p className="mt-1 text-xs leading-6 text-muted">
                در محیط نمایشی، همگام‌سازی زنده انجام نمی‌شود. وضعیت اتصال‌دهنده‌ها را می‌توانید در صفحه
                مربوط ببینید.
              </p>
              <Link
                to="/datasets/connectors"
                className="mt-3 inline-block text-xs text-primary-700 hover:underline"
              >
                مشاهده اتصال‌دهنده‌ها
              </Link>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="primary"
              disabledReason={fileName ? null : 'ابتدا فایلی را انتخاب کنید.'}
              onClick={() => setStep(1)}
            >
              ادامه
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader title="شناسنامه قلم داده" subtitle="بدون متولی و دامنه پوشش، داده قابل انتشار نیست" />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="عنوان قلم داده" required>
              {({ id }) => (
                <TextInput
                  id={id}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="مثلاً: قطعات ثبتی منطقه ۶"
                />
              )}
            </Field>
            <Field label="نوع داده" required>
              {({ id }) => (
                <Select
                  id={id}
                  value={kind}
                  onChange={(event) => setKind(event.target.value)}
                  options={[
                    { value: 'spatial', label: 'مکانی' },
                    { value: 'tabular', label: 'جدولی' },
                    { value: 'document', label: 'سند' },
                  ]}
                />
              )}
            </Field>
            <Field label="سازمان متولی" required>
              {({ id }) => <TextInput id={id} defaultValue="معاونت شهرسازی و معماری" />}
            </Field>
            <Field label="پوشش زمانی" hint="دوره‌ای که داده به آن دلالت دارد">
              {({ id }) => <TextInput id={id} defaultValue="۱۴۰۴" />}
            </Field>
          </div>
          <div className="mt-4 flex justify-between">
            <Button onClick={() => setStep(0)}>بازگشت</Button>
            <Button
              variant="primary"
              disabledReason={title.trim() ? null : 'عنوان قلم داده الزامی است.'}
              onClick={() => setStep(2)}
            >
              ادامه
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader title="نگاشت فیلدها" subtitle="فیلدهای فایل به فیلدهای استاندارد سامانه متصل می‌شوند" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead className="bg-surface-2 text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 text-start">فیلد فایل</th>
                  <th className="px-3 py-2 text-start">فیلد استاندارد</th>
                  <th className="px-3 py-2 text-start">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['PARCEL_ID', 'شناسه قطعه', 'ok'],
                  ['ZONE', 'کد پهنه', 'ok'],
                  ['USE_TYPE', 'کد کاربری', 'warn'],
                  ['AREA_M2', 'مساحت قطعه (متر مربع)', 'ok'],
                  ['FLOORS', 'تعداد طبقات', 'ok'],
                  ['HEIGHT', 'ارتفاع (متر)', 'missing'],
                ].map(([source, target, state]) => (
                  <tr key={source} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <Ltr>{source}</Ltr>
                    </td>
                    <td className="px-3 py-2">{target}</td>
                    <td className="px-3 py-2">
                      {state === 'ok' && <StatusBadge label="نگاشت شد" tone="success" kind="ok" />}
                      {state === 'warn' && <StatusBadge label="مقادیر خالی دارد" tone="warning" kind="warn" />}
                      {state === 'missing' && (
                        <StatusBadge label="فیلد متناظر یافت نشد" tone="muted" kind="unknown" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-between">
            <Button onClick={() => setStep(1)}>بازگشت</Button>
            <Button variant="primary" onClick={runValidation}>
              شروع اعتبارسنجی
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader title="در حال اعتبارسنجی" subtitle="می‌توانید این صفحه را ترک کنید؛ پردازش ادامه می‌یابد" />
          <Progress value={progress} label="بررسی ساختار، هندسه، یکتایی و پوشش" />
        </Card>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <Callout tone="warning" title="نسخه قرنطینه شد">
            یک یافته مسدودکننده شناسایی شد. نسخه بارگذاری‌شده در وضعیت «قرنطینه» ثبت شد و تا اصلاح، در
            تحلیل قابل انتخاب نیست. این وضعیت با «خطای سامانه» تفاوت دارد.
          </Callout>
          <Card>
            <CardHeader title="خلاصه اعتبارسنجی" />
            <DefinitionList
              columns={3}
              items={[
                { label: 'رکوردهای خوانده‌شده', value: <span className="num">{formatNumber(4820)}</span> },
                { label: 'رکوردهای معتبر', value: <span className="num">{formatNumber(4760)}</span> },
                { label: 'یافته مسدودکننده', value: <span className="num">{formatNumber(1)}</span> },
              ]}
            />
            <ul className="mt-4 space-y-2">
              {MOCK_FINDINGS.map((finding) => (
                <li key={finding.code} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-medium">{finding.title}</p>
                    <Badge
                      tone={
                        finding.severity === 'blocking'
                          ? 'danger'
                          : finding.severity === 'warning'
                            ? 'warning'
                            : 'muted'
                      }
                    >
                      {finding.severity === 'blocking'
                        ? 'مسدودکننده'
                        : finding.severity === 'warning'
                          ? 'هشدار'
                          : 'اطلاعی'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-6 text-muted">{finding.detail}</p>
                  <p className="mt-1 text-2xs text-faint">
                    کد یافته: <Ltr>{finding.code}</Ltr>
                    {finding.rows > 0 && (
                      <>
                        <span className="mx-2">·</span>
                        رکوردهای متأثر: <span className="num">{formatNumber(finding.rows)}</span>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Link
                to="/datasets/quarantine"
                className="inline-flex h-9 items-center rounded-md border border-border-strong px-3.5 text-sm hover:bg-surface-2"
              >
                مشاهده صف قرنطینه
              </Link>
              <Button variant="primary" onClick={() => setStep(0)}>
                ورود داده دیگر
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
